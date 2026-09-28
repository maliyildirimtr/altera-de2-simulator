import type { YosysWorkerRequest, YosysWorkerResponse } from '../workers/yosys.worker.types';

// @ts-ignore
import { yosys2digitaljs } from 'yosys2digitaljs/core';

export class HdlSynthesisError extends Error {
  public readonly isHdlError = true;
  public readonly stdout: string;
  public readonly stderr: string;

  constructor(message: string, stdout: string = '', stderr: string = '') {
    super(message);
    this.name = 'HdlSynthesisError';
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

export class InternalSchematicError extends Error {
  public readonly isInternalError = true;
  public readonly originalError?: any;
  public readonly stdout: string;
  public readonly stderr: string;

  constructor(message: string, originalError?: any, stdout: string = '', stderr: string = '') {
    super(message);
    this.name = 'InternalSchematicError';
    this.originalError = originalError;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

/** Progress of one synthesis run, reported to the UI. */
export interface SynthesisProgress {
  /** 0–100, never decreases within a run. */
  percent: number;
  /** Short human-readable stage label. */
  stage: string;
}

/**
 * Yield to the browser so a progress update can paint before the next
 * blocking step (Yosys itself runs synchronously on the main thread).
 */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Adapt a text sink to the byte-stream callback Yosys writes stdout/stderr to.
 * (The runtime ignores `print`/`printErr`; without this the logs stay empty.)
 */
function textStream(write: (text: string) => void): (bytes: Uint8Array | null) => void {
  const decoder = new TextDecoder();
  return (bytes) => {
    if (bytes === null) {
      const rest = decoder.decode();
      if (rest) write(rest);
      return;
    }
    write(decoder.decode(bytes, { stream: true }));
  };
}


interface YosysRun {
  outputJson: string | null;
  stdout: string;
  stderr: string;
}

class WorkerUnavailableError extends Error {}

let yosysWorker: Worker | null = null;
let yosysRequestId = 0;

/**
 * Runs Yosys in a dedicated worker so the page stays responsive. The worker
 * is kept alive between runs; Yosys' WebAssembly is loaded into it once.
 */
function runYosysInWorker(
  args: string[],
  files: Record<string, string>,
  onLoad: (done: number, total: number) => void,
  onSynthesizing: () => void,
): Promise<YosysRun> {
  if (typeof Worker === 'undefined') return Promise.reject(new WorkerUnavailableError());
  let worker: Worker;
  try {
    worker = yosysWorker ??= new Worker(new URL('../workers/yosys.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return Promise.reject(new WorkerUnavailableError());
  }
  const id = ++yosysRequestId;

  return new Promise<YosysRun>((resolve, reject) => {
    let started = false;
    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      worker.terminate();
      if (yosysWorker === worker) yosysWorker = null;
      // Failing before any reply means the worker itself could not start.
      if (!started) reject(new WorkerUnavailableError(event.message));
      else reject(new InternalSchematicError(event.message || 'Yosys worker crashed.'));
    };
    const onMessage = (event: MessageEvent<YosysWorkerResponse>) => {
      const msg = event.data;
      if (msg.id !== id) return;
      started = true;
      switch (msg.type) {
        case 'load-progress':
          onLoad(msg.done, msg.total);
          return;
        case 'synthesizing':
          onSynthesizing();
          return;
        case 'load-error':
          // Yosys could not be loaded inside the worker; try the main thread.
          cleanup();
          reject(new WorkerUnavailableError(msg.message));
          return;
        case 'error':
          cleanup();
          reject(new HdlSynthesisError(
            msg.stderr.trim() || msg.stdout.trim() || msg.message,
            msg.stdout,
            msg.stderr,
          ));
          return;
        case 'result':
          cleanup();
          resolve({ outputJson: msg.outputJson, stdout: msg.stdout, stderr: msg.stderr });
      }
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    const request: YosysWorkerRequest = { id, args, files };
    worker.postMessage(request);
  });
}

/** Fallback: the original main-thread path (blocks the page while it runs). */
async function runYosysOnMainThread(
  args: string[],
  files: Record<string, string>,
  onLoad: (done: number, total: number) => void,
  onSynthesizing: () => void,
): Promise<YosysRun> {
  const { runYosys } = await import('@yowasp/yosys');
  try {
    await runYosys(undefined, undefined, {
      fetchProgress: ({ totalLength, doneLength }) => onLoad(doneLength, totalLength),
    });
  } catch (loadErr: any) {
    throw new InternalSchematicError(loadErr?.message || 'Failed to load Yosys.', loadErr);
  }
  onSynthesizing();
  await nextPaint();
  let stdout = '';
  let stderr = '';
  try {
    const result = (await runYosys(args, files, {
      stdout: textStream((text) => { stdout += text; }),
      stderr: textStream((text) => { stderr += text; }),
    })) as Record<string, string | Uint8Array> | undefined;
    const raw = result?.['output.json'];
    const outputJson = raw === undefined ? null : typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    return { outputJson, stdout, stderr };
  } catch (yosysErr: any) {
    throw new HdlSynthesisError(stderr.trim() || stdout.trim() || yosysErr?.message || 'Yosys synthesis failed.', stdout, stderr);
  }
}

// Share of the bar used by the one-time Yosys download (~54 MB, cached afterwards).
const LOAD_END = 70;

export async function synthesizeVerilog(
  filesData: { name: string, content: string }[], 
  options: {
    optimize?: boolean,
    simplify?: boolean,
    onProgress?: (progress: SynthesisProgress) => void,
  } = { optimize: false, simplify: true }
): Promise<any> {
  let lastPercent = 0;
  const report = (percent: number, stage: string) => {
    lastPercent = Math.max(lastPercent, Math.min(100, Math.round(percent)));
    options.onProgress?.({ percent: lastPercent, stage });
  };

  if (!filesData || filesData.length === 0) {
    throw new HdlSynthesisError('No HDL files to synthesize.');
  }

  // Yosys sanal dosya sistemini (VFS) oluştur
  const files: Record<string, string> = {};
  
  // Yosys'in her bir dosyayı okuması için komut dizisi
  const readCommands: string[] = [];

  for (const file of filesData) {
    // Sadece geçerli Verilog/SystemVerilog dosyalarını dahil et (isteğe bağlı güvenlik önlemi)
    const fileName = (!file.name.endsWith('.v') && !file.name.endsWith('.sv')) ? file.name + '.sv' : file.name;
    
    files[fileName] = file.content;
    readCommands.push(`read_verilog -sv ${fileName}`);
  }

  // Komut dizisini başlat ve dosyaları oku
  const commands = [
    ...readCommands
  ];
  
  commands.push('hierarchy -auto-top -check');
  // proc komutu always bloklarını (process) sentezlenebilir MUX ve FF'lere çevirir, her zaman çalışmalıdır.
  commands.push('proc');

  if (options.optimize) {
    // VS Code DigitalJS eklentisindeki varsayılan optimizasyon (opt ve memory dönüşümleri)
    commands.push('opt');
    commands.push('memory -nomap');
    commands.push('wreduce -memx');
    commands.push('opt -full');
  } else {
    // Optimizasyon seçili değilse sadece basit temizlik yap
    commands.push('opt_clean');
  }

  commands.push('clean');
  commands.push('write_json output.json');

  const command = commands.join('; ');

  const args = ['-p', command];

  let stdoutLog = '';
  let stderrLog = '';

  report(1, 'Preparing');
  await nextPaint();

  const onLoad = (done: number, total: number) => {
    if (total > 0) report(1 + (LOAD_END - 1) * (done / total), 'Loading Yosys');
  };
  const onSynthesizing = () => report(LOAD_END + 5, 'Synthesizing');

  let run: YosysRun;
  try {
    run = await runYosysInWorker(args, files, onLoad, onSynthesizing);
  } catch (workerErr) {
    if (!(workerErr instanceof WorkerUnavailableError)) throw workerErr;
    // No usable worker (very old browser, or the worker failed to start):
    // fall back to running Yosys on this thread, as before.
    run = await runYosysOnMainThread(args, files, onLoad, onSynthesizing);
  }
  stdoutLog = run.stdout;
  stderrLog = run.stderr;
  const resultFiles: Record<string, string> | null =
    run.outputJson === null ? null : { 'output.json': run.outputJson };

  if (resultFiles && resultFiles['output.json']) {
    try {
      const jsonRaw = resultFiles['output.json'];
      const jsonString = jsonRaw;
      const rawYosysJson = JSON.parse(jsonString);

      // Top modülü belirle. Yosys `hierarchy -auto-top` kullanıldığında ana modülün attributes objesinde `top: 1` bulunur.
      let topModule = '';
      const moduleNames = Object.keys(rawYosysJson.modules || {});

      for (const modName of moduleNames) {
        if (rawYosysJson.modules[modName].attributes?.top === 1 || rawYosysJson.modules[modName].attributes?.top === "00000000000000000000000000000001") {
          topModule = modName;
          break;
        }
      }

      // Eğer `top` özelliği bulunamazsa, ilk modülü (veya içinde instantiation olmayan modülü) fallback olarak al
      if (!topModule && moduleNames.length > 0) {
        topModule = moduleNames[moduleNames.length - 1]; // Genelde Yosys top modülü sona koyar ama emin olmak için
      }

      if (!topModule) {
        throw new HdlSynthesisError('Synthesis produced no modules.', stdoutLog, stderrLog);
      }

      report(90, 'Building schematic');
      await nextPaint();

      // yosys2digitaljs ile çevir
      const digitalJsData = yosys2digitaljs(rawYosysJson);

      // Çıkış portlarını düzelt ve kapı isimlerini (Label) temizle
      if (digitalJsData && digitalJsData.devices) {
        const mod = rawYosysJson.modules[topModule];
        const ports = mod?.ports || {};

        // Port bit haritası (bit id'sinden port adına ulaşmak için)
        const bitToPort: Record<string, string> = {};
        for (const [pName, pData] of Object.entries<any>(ports)) {
          if (pData.bits) {
            pData.bits.forEach((b: number | string) => { bitToPort[b.toString()] = pName; });
          }
        }

        for (const devId in digitalJsData.devices) {
          const dev = digitalJsData.devices[devId];

          // 1. Kapı isimlendirmeleri (Yosys $ isimleri hariç gerçek isimleri sakla)
          let givenName = '';
          if (dev.label && !dev.label.startsWith('$') && !dev.label.startsWith('dev')) {
            givenName = dev.label;
          } else if (!devId.startsWith('$') && !devId.startsWith('dev')) {
            givenName = devId;
          }

          if (givenName) {
             dev.given_name = givenName;
          }

          // Kapıların altında kapı türünün yazması için label alanına type'ı atıyoruz.
          // Input ve Output hariç.
          if (dev.type !== 'Input' && dev.type !== 'Output') {
             dev.label = dev.type;
          }

          // 2. Input ve Output portlarının isimlerini gerçek port isimleriyle değiştir
          if (dev.type === 'Input' || dev.type === 'Output') {
            // Eğer label atanmamışsa veya 'dev' ile başlıyorsa gerçek ismini bulalım
            if (!dev.label || dev.label.startsWith('dev') || dev.label === 'Input' || dev.label === 'Output') {
              if (typeof dev.net === 'string') {
                dev.label = dev.net;
              } else if (Array.isArray(dev.net) && dev.net.length > 0) {
                const bit = dev.net[0].toString();
                if (bitToPort[bit]) {
                  dev.label = bitToPort[bit];
                }
              }
            }

            // Çıkış (Output) net'i düzeltmesi (Eksik in bağlantısı varsa)
            if (dev.type === 'Output') {
              if (!dev.connections) dev.connections = {};
              if (!dev.connections.in && dev.net) {
                dev.connections.in = dev.net;
              }
            }
          }
        }
      }

      // Metadata for workspace diagnostics and inspection
      (digitalJsData as any)._topModule = topModule;
      (digitalJsData as any)._stdout = stdoutLog;
      (digitalJsData as any)._stderr = stderrLog;
      (digitalJsData as any)._rawYosysJson = rawYosysJson;

      report(100, 'Done');
      return digitalJsData;
    } catch (innerErr: any) {
      if (innerErr instanceof HdlSynthesisError) {
        throw innerErr;
      }
      throw new InternalSchematicError(
        innerErr?.message || 'Internal schematic conversion failed.',
        innerErr,
        stdoutLog,
        stderrLog
      );
    }
  }

  const errorDetails = (stderrLog.trim() || stdoutLog.trim() || 'Yosys synthesis failed to generate circuit output.');
  throw new HdlSynthesisError(errorDetails, stdoutLog, stderrLog);
}


