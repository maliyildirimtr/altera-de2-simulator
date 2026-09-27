// ============================================================
// compiler.worker.ts — Icarus Verilog Wasm Execution Environment
//
// F2.2: requestId eklendi — Persistent Worker Pool desteği.
// F2.5: VCD parse işlemi worker içinde yapılır; UI thread'e
//       ham VCD string yerine ParsedSimulationData gönderilir.
// ============================================================

import type {
  CompilerInput, CompilerOutput,
  ParsedSimulationData,
} from './compiler.worker.types';

import { parseRawVCD } from '../services/vcdParser';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') + '/';

function resolvePublicUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith(BASE_URL)) return path;
  const clean = path.replace(/^\/+/, '');
  return BASE_URL + clean;
}

// ── Fetch yardımcıları ────────────────────────────────────────
// Vite dev sunucusu var olmayan URL'ler için 200 + HTML döner.
// Content-Type kontrolüyle gerçek dosyaları ayırt ediyoruz.
async function fetchText(url: string): Promise<string | null> {
  const target = resolvePublicUrl(url);
  try {
    const res = await fetch(target);
    if (!res.ok) return null;
    if ((res.headers.get('content-type') ?? '').includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── Emscripten modülü yükleyici ───────────────────────────────
//
// jsPublicPath  : Worker'dan erişilebilen mutlak yol  ('/ivlpp.js')
// wasmPublicDir : .wasm dosyalarının bulunduğu dizin   ('/')
// options       : print / printErr gibi Emscripten seçenekleri
//
// locateFile callback'i sayesinde Emscripten, wasm dosyasını
// `new URL('xxx.wasm', import.meta.url)` yerine bizim belirttiğimiz
// URL'den alır → Blob bağlamında URL hatası oluşmaz.
const factoryCache: Record<string, (opts?: object) => Promise<unknown>> = {};

async function loadEmscriptenModule(
  jsPublicPath: string,
  _wasmPublicDir: string,
  options: Record<string, unknown> = {}
): Promise<{
  FS: {
    writeFile(path: string, data: string | Uint8Array): void;
    readFile(path: string, opts: { encoding: string }): string;
  };
  callMain(args: string[]): void;
}> {
  const resolvedJsPath = resolvePublicUrl(jsPublicPath);
  let factory = factoryCache[resolvedJsPath];

  if (!factory) {
    // 1. Emscripten JS glue dosyasını text olarak indir (patch YAPMA)
    const jsText = await fetchText(resolvedJsPath);
    if (!jsText) throw new Error(`FILE_NOT_FOUND: ${resolvedJsPath}`);

    // 2. Blob URL → dynamic import (Rollup statik analizi atlatılır)
    const blob    = new Blob([jsText], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      const mod = await import(/* @vite-ignore */ blobUrl) as {
        default?: (opts?: object) => Promise<unknown>;
      };

      factory = mod.default as (opts?: object) => Promise<unknown>;
      if (typeof factory !== 'function') {
        throw new Error(`${resolvedJsPath} is not a valid Emscripten module (no default export)`);
      }
      
      factoryCache[resolvedJsPath] = factory;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  const instance = await factory({
    noInitialRun: true,
    locateFile: (path: string) => resolvePublicUrl(path),
    ...options,
  });

  return instance as any;
}

// ── ivl konfigürasyonu ────────────────────────────────────────
const ivlConf = (g: string) => `basedir:/
module:system.vpi
generation:${g}
generation:no-specify
out:/out.vvp
iwidth:32
widthcap:65536
functor:cprop
functor:nodangle
flag:DLL=vvp.tgt
`;

// ── Ana Worker Mesaj Döngüsü ──────────────────────────────────
self.onmessage = async (event: MessageEvent<CompilerInput>) => {
  const { files, requestId } = event.data;
  const logs: string[] = [];

  try {
    logs.push('[WORKER] Starting the compile environment...');
    logs.push(`[WORKER] Received ${files.length} file(s): ${files.map(f => f.name).join(', ')}`);

    // ── 1. Wasm çekirdek JS dosyalarını doğrula ───────────────
    logs.push('[WORKER] Checking WebAssembly engines (ivlpp, ivl, vvp)...');

    const requiredJs   = ['/ivlpp.js', '/ivl.js', '/vvp.js'];
    const requiredWasm = ['/ivlpp.wasm', '/ivl.wasm', '/vvp.wasm'];
    const allRequired  = [...requiredJs, ...requiredWasm];

    const checks = await Promise.all(allRequired.map(f => fetchText(f)));
    const missing = allRequired.filter((_, i) => checks[i] === null);

    if (missing.length > 0) {
      logs.push(`[ERROR] Missing files: ${missing.join(', ')}`);
      logs.push('[ERROR] Verilog WebAssembly engine files not found.');
      logs.push('[ERROR] Add ivlpp.js/wasm, ivl.js/wasm and vvp.js/wasm to the public/ folder.');
      self.postMessage({ requestId, status: 'error', vcdOutput: '', logs } satisfies CompilerOutput);
      return;
    }
    logs.push('[WORKER] All WebAssembly engine files verified. ✓');

    // ── 2. Testbench Tespiti & Auto-Dump Injection ─────────────
    // ModelSim gibi: kullanıcı $dumpfile yazmasa da otomatik eklenir.
    // Testbench zaten $dumpfile içeriyorsa hiç dokunma.
    const hasDump = files.some(f => /\$dumpfile/i.test(f.content));

    /**
     * Güçlendirilmiş testbench tespiti — çok kriterli puanlama.
     * Kriterler öncelik sırasına göre ağırlıklı:
     *
     *  [10] UI'dan gelen aktif dosya (activeFile)
     *  [ 8] Port-less module tanımı  → module <name>;  veya  module <name>();
     *  [ 6] Simülasyon yapıcıları   → initial / always / $monitor / $stop / $finish / #delay
     *  [ 4] İsimlendirme pattern'i  → tb_ / _tb / test_ / _test / sim_ (dosya veya modül adı)
     *  [ 2] İlk dosya (son çare fallback)
     *
     * En yüksek puan alan dosya testbench kabul edilir.
     */
    function detectTestbench(
      candidates: typeof files,
      activeFile: string | undefined
    ): (typeof files)[0] {
      if (candidates.length === 1) return candidates[0];

      const scored = candidates.map(f => {
        let score = 0;
        const baseName = f.name.replace(/\.\w+$/, '').toLowerCase();
        const content  = f.content;

        // Puan 1 — UI'dan gelen aktif dosya
        if (activeFile && f.name === activeFile) score += 10;

        // Puan 2 — Port-less modül: `module <name>;` veya `module <name>()`
        // Gerçek tasarım modülleri port listesi içerir.
        const moduleHeader = content.match(/\bmodule\s+(\w+)\s*(\(([^)]*)\))?\s*;/);
        if (moduleHeader) {
          const portList = (moduleHeader[3] ?? '').trim();
          // Boş port listesi ya da saf parametre bloğu → testbench işareti
          if (portList === '' || /^\s*$/.test(portList)) score += 8;
        }

        // Puan 3 — Simülasyon yapıcıları
        const simConstructs = [
          /\binitial\b/,
          /\$stop\b/,
          /\$finish\b/,
          /\$monitor\b/,
          /\$display\b/,
          /#\d+/,          // timing delay (#10)
        ];
        const matchCount = simConstructs.filter(re => re.test(content)).length;
        score += Math.min(matchCount, 3) * 2; // max 6 puan

        // Puan 4 — İsimlendirme pattern'i (dosya adı veya içindeki modül adı)
        const namingRe = /^(tb_|test_|sim_)|(_tb|_test|_sim)$/i;
        if (namingRe.test(baseName)) score += 4;
        // Modül adını da tara
        const moduleName = content.match(/\bmodule\s+(\w+)/)?.[1]?.toLowerCase() ?? '';
        if (namingRe.test(moduleName)) score += 4;

        // Puan 5 — Fallback: listedeki ilk dosya
        if (candidates.indexOf(f) === 0) score += 2;

        return { file: f, score };
      });

      // En yüksek puanlıyı seç (beraberlikteki ilki al)
      scored.sort((a, b) => b.score - a.score);
      return scored[0].file;
    }

    const { activeFile } = event.data;
    const tbFile = detectTestbench(files, activeFile);
    logs.push(`[TB-DETECT] Testbench: "${tbFile.name}" (aktif: ${activeFile ?? 'belirtilmedi'})`);

    // ── Bulletproof Auto-Inject ──────────────────────────────
    // $dumpfile/dumpvars yoksa, SON endmodule'ün hemen ÖNCESİNE
    // argümansız $dumpvars(0) kullanarak blok enjekte ediyoruz.
    // SONRA hem workFiles hem de ivlpp FS'ini güncelliyoruz.
    const workFiles = files.map(f => {
      if (hasDump || f !== tbFile) return f;

      let content = f.content;

      // lastIndexOf ile EN SON endmodule'ü bul (güvenli)
      const lastEM = content.lastIndexOf('endmodule');
      if (lastEM === -1) {
        logs.push(`[AUTO-DUMP] WARNING: no endmodule in "${f.name}"; $dumpvars injection skipped.`);
        return f;
      }

      const before = content.slice(0, lastEM);
      const after  = content.slice(lastEM + 'endmodule'.length);
      content = before +
        '\n  // [AUTO-INJECT] VCD dump\n' +
        '  initial begin\n' +
        '    $dumpfile("dump.vcd");\n' +
        '    $dumpvars(0);\n' +
        '  end\n' +
        'endmodule' + after;

      logs.push(`[AUTO-DUMP] "${f.name}": injected $dumpvars(0) before the last endmodule.`);
      return { ...f, content };
    });

    logs.push('[ivlpp] Preprocessing...');
    const ppLines: string[] = [];
    const ppWarnLines: string[] = [];

    const ivlpp = await loadEmscriptenModule('/ivlpp.js', '/', {
      print:    (s: string) => ppLines.push(s),
      printErr: (s: string) => ppWarnLines.push(s),
    });

    // ── KRİTİK: Enjekte edilmiş dosyaları FS'e YAZ, sonra callMain ──
    const ppArgs: string[] = ['-L'];
    for (const file of workFiles) {
      const src = file.content.endsWith('\n') ? file.content : file.content + '\n';
      ivlpp.FS.writeFile('/' + file.name, src);
      ppArgs.push('/' + file.name);
      // Eğer inject yapıldıysa, FS'deki kopyayı da güncelle (double-write)
      if (!hasDump && file === workFiles.find(wf => wf.name === tbFile.name)) {
        logs.push(`[FS] Wrote "${file.name}" (${src.length} bytes). ✓`);
      }
    }
    ivlpp.callMain(ppArgs);

    if (ppWarnLines.length > 0) {
      logs.push('[ivlpp warning]\n' + ppWarnLines.join('\n'));
    }

    const preprocessed = ppLines.join('\n') + '\n';
    logs.push(`[ivlpp] Preprocessing done (${preprocessed.length} bytes). ✓`);

    // ── 3. ivl — Ana derleyici ────────────────────────────────
    logs.push('[ivl] Compiling...');
    const ivlErrors: string[] = [];

    const ivl = await loadEmscriptenModule('/ivl.js', '/', {
      print:    () => {},
      printErr: (s: string) => ivlErrors.push(s),
    });

    ivl.FS.writeFile('/ivl.conf', ivlConf('2012'));
    ivl.FS.writeFile('/src.v', preprocessed);
    ivl.callMain(['-C/ivl.conf', '--', '/src.v']);

    let vvpBytes: Uint8Array | null = null;
    try {
      // encoding belirtmezsen Emscripten doğrudan Uint8Array döner
      vvpBytes = ivl.FS.readFile('/out.vvp', { encoding: 'binary' }) as unknown as Uint8Array;
    } catch {
      /* out.vvp oluşmadı → derleme hatası */
    }

    // system.vpi / dynamic linking uyarıları gürültü — filtrele
    const realErrors = ivlErrors.filter(
      l => !/system\.vpi|dynamic linking not enabled/.test(l)
    );

    if (!vvpBytes) {
      logs.push('[ERROR] Compilation failed.');
      if (realErrors.length > 0) logs.push(realErrors.join('\n'));
      self.postMessage({ requestId, status: 'error', vcdOutput: '', logs } satisfies CompilerOutput);
      return;
    }

    if (realErrors.length > 0) logs.push('[ivl warning]\n' + realErrors.join('\n'));
    logs.push('[ivl] Compilation done; out.vvp produced. ✓');

    // ── 4. vvp — Simülatör ────────────────────────────────────
    logs.push('[vvp] Simulating...');
    const simConsole: string[] = [];

    const vvpMod = await loadEmscriptenModule('/vvp.js', '/', {
      print:    (s: string) => simConsole.push(s),
      printErr: (s: string) => simConsole.push(s),
    });


    // Uint8Array doğrudan Emscripten FS'e yaz
    vvpMod.FS.writeFile('/sim.vvp', vvpBytes!);

    vvpMod.callMain(['/sim.vvp']);

    if (simConsole.length > 0) {
      logs.push('[CONSOLE]\n' + simConsole.join('\n'));
    }
    logs.push('[vvp] Simulation done. ✓');

    // ── 5. VCD çıktısını oku ve F2.5: Worker içinde parse et ──
    let vcdContent = '';
    let simulationData: ParsedSimulationData | undefined;
    try {
      let vcdRaw: Uint8Array;
      try {
        vcdRaw = vvpMod.FS.readFile('/dump.vcd', { encoding: 'binary' }) as unknown as Uint8Array;
      } catch {
        try {
          vcdRaw = vvpMod.FS.readFile('/out.vcd', { encoding: 'binary' }) as unknown as Uint8Array;
        } catch {
          const fsFiles = (vvpMod.FS as any).readdir('/') as string[];
          const anyVcd = fsFiles.find((f: string) => f.endsWith('.vcd'));
          if (anyVcd) {
            vcdRaw = vvpMod.FS.readFile('/' + anyVcd, { encoding: 'binary' }) as unknown as Uint8Array;
          } else {
            throw new Error('No .vcd file found');
          }
        }
      }
      vcdContent   = new TextDecoder('utf-8').decode(vcdRaw);
      logs.push(`[VCD] Read ${vcdContent.length} bytes of VCD output. ✓`);

      // F2.5 — Parse işlemi UI thread yerine burada (Worker thread'de) yapılır.
      // Büyük VCD dosyalarında UI'ın donması önlenir.
      simulationData = parseRawVCD(vcdContent);
      simulationData.signals.forEach(s => {
        logs.push(`[VCD] Parsed: ${s.name} (${s.transitions.length} transitions)`);
      });
      logs.push(`[VCD] Parsed ${simulationData.signals.length} signals, maxTime=${simulationData.maxTime} ps. ✓`);
    } catch {
      logs.push('[WARNING] dump.vcd was not produced or could not be parsed.');
      logs.push('[WARNING] The testbench needs these lines:');
      logs.push('  initial begin');
      logs.push('    $dumpfile("dump.vcd");');
      logs.push('    $dumpvars(0, <testbench_module_name>);');
      logs.push('  end');
    }

    // The raw VCD text is returned too so the user can download it.
    self.postMessage({ requestId, status: 'ok', vcdOutput: vcdContent, simulationData, logs } satisfies CompilerOutput);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes('FILE_NOT_FOUND')) {
      logs.push('[ERROR] A WebAssembly engine file is missing or unreadable.');
      logs.push(msg);
    } else if (msg.includes('Unexpected token') || msg.includes('<')) {
      logs.push('[ERROR] A WebAssembly engine file returned invalid content.');
      logs.push('[ERROR] Is the server returning an HTML fallback? Check the public/ folder.');
    } else {
      for (const line of msg.split('\n').filter(Boolean)) {
        logs.push(line);
      }
    }

    self.postMessage({ requestId, status: 'error', vcdOutput: '', logs } satisfies CompilerOutput);
  }
};
