/**
 * Beginner-friendly diagnostics for Verilog/SystemVerilog source.
 *
 * The built-in engine is deliberately forgiving and reports parse problems as
 * offsets into its internal, flattened logic ("at index 23"), which means
 * nothing to a student. This module scans the source the student actually
 * wrote and reports likely mistakes with a line number and a suggested fix.
 * It never blocks compilation on its own except for the two cases the engine
 * cannot recover from (VHDL input, no module at all).
 */

export type Severity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  /** 1-based line in the source. */
  line: number;
  severity: Severity;
  message: { en: string; tr: string };
}

const KEYWORDS = new Set([
  'module', 'endmodule', 'input', 'output', 'inout', 'wire', 'reg', 'logic', 'bit', 'integer', 'int', 'genvar',
  'assign', 'always', 'always_ff', 'always_comb', 'always_latch', 'initial', 'begin', 'end', 'if', 'else',
  'case', 'casez', 'casex', 'endcase', 'default', 'posedge', 'negedge', 'or', 'and', 'not', 'for', 'while',
  'localparam', 'parameter', 'typedef', 'enum', 'struct', 'packed', 'signed', 'unsigned', 'function',
  'endfunction', 'task', 'endtask', 'generate', 'endgenerate', 'return', 'unique', 'priority', 'forever',
  'repeat', 'automatic', 'void', 'byte', 'shortint', 'longint', 'real', 'time', 'string', 'const', 'var',
  'xor', 'nand', 'nor', 'xnor', 'buf', 'supply0', 'supply1', 'tri',
]);

const STATEMENT_WORDS = ['assign', 'always', 'always_ff', 'always_comb', 'module', 'endmodule', 'input', 'output', 'logic', 'wire', 'reg', 'begin', 'end', 'case', 'endcase', 'localparam', 'parameter', 'initial', 'default'];

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function closest(word: string, candidates: Iterable<string>, maxDistance = 2): string | null {
  let best: string | null = null;
  let bestD = maxDistance + 1;
  for (const c of candidates) {
    if (Math.abs(c.length - word.length) > maxDistance) continue;
    const d = levenshtein(word.toLowerCase(), c.toLowerCase());
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

/** Replace comments and string contents with spaces, keeping line/column positions. */
function blankComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, (m) => ' '.repeat(m.length))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, (m) => `"${' '.repeat(Math.max(0, m.length - 2))}"`);
}

function lineOf(src: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === '\n') line++;
  return line;
}

function collectDeclared(code: string): Set<string> {
  const declared = new Set<string>();
  const add = (list: string) => {
    for (const part of list.split(',')) {
      const m = /(\w+)\s*(?:\[[^\]]*\]\s*)*(?:=.*)?$/.exec(part.trim());
      if (m) declared.add(m[1]);
    }
  };
  // Port and net declarations: input logic [3:0] a, b
  const declRe = /\b(?:input|output|inout|wire|reg|logic|bit|integer|int|genvar|byte)\b((?:\s+(?:wire|reg|logic|signed|unsigned|bit))*)\s*(?:\[[^\]]*\]\s*)*([^;()]*?)(?=[;)]|\b(?:input|output|inout)\b)/g;
  let m: RegExpExecArray | null;
  while ((m = declRe.exec(code)) !== null) add(m[2]);
  // Typed declarations: state_t state, next;
  const typedRe = /\b(\w+_t)\s+([\w\s,]+);/g;
  while ((m = typedRe.exec(code)) !== null) add(m[2]);
  const paramRe = /\b(?:localparam|parameter)\b[^;]*?;/g;
  while ((m = paramRe.exec(code)) !== null) {
    for (const pm of m[0].matchAll(/(\w+)\s*=/g)) declared.add(pm[1]);
  }
  for (const em of code.matchAll(/\benum\b[^{]*\{([^}]*)\}\s*(\w+)?/g)) {
    for (const part of em[1].split(',')) {
      const n = /^\s*(\w+)/.exec(part);
      if (n) declared.add(n[1]);
    }
    if (em[2]) declared.add(em[2]);
  }
  for (const tm of code.matchAll(/\btypedef\b[\s\S]*?\}\s*(\w+)\s*;/g)) declared.add(tm[1]);
  for (const mm of code.matchAll(/\bmodule\s+(\w+)/g)) declared.add(mm[1]);
  // Instances: type name ( ... );
  for (const im of code.matchAll(/^\s*(\w+)\s+(?:#\s*\([^)]*\)\s*)?(\w+)\s*\(/gm)) {
    if (!KEYWORDS.has(im[1])) { declared.add(im[1]); declared.add(im[2]); }
  }
  for (const fm of code.matchAll(/\b(?:function|task)\b[^;]*?(\w+)\s*\(/g)) declared.add(fm[1]);
  for (const lm of code.matchAll(/\bfor\s*\(\s*(?:int|integer|genvar)?\s*(\w+)/g)) declared.add(lm[1]);
  return declared;
}

export function lintVerilog(source: string, transpileError?: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  const push = (line: number, severity: Severity, en: string, tr: string) => {
    if (!out.some((d) => d.line === line && d.message.en === en)) out.push({ line, severity, message: { en, tr } });
  };
  const code = blankComments(source);
  const lines = code.split('\n');

  // ── Not Verilog at all ──
  if (/\bentity\s+\w+\s+is\b|\barchitecture\s+\w+\s+of\b|\bstd_logic\b/i.test(code)) {
    const idx = code.search(/\bentity\b|\barchitecture\b|\bstd_logic\b/i);
    push(lineOf(code, idx), 'error',
      'This looks like VHDL. Logic Lab simulates Verilog/SystemVerilog only; VHDL is not supported.',
      'Bu VHDL koduna benziyor. Logic Lab yalnızca Verilog/SystemVerilog simüle eder; VHDL desteklenmiyor.');
    return out;
  }
  const modules = [...code.matchAll(/\bmodule\b/g)].length;
  const ends = [...code.matchAll(/\bendmodule\b/g)].length;
  if (modules === 0) {
    push(1, 'error', 'No module found. A design starts with module name (...); and ends with endmodule.',
      'Modül bulunamadı. Bir tasarım module isim (...); ile başlar ve endmodule ile biter.');
    return out;
  }
  if (ends < modules) {
    const lastModule = [...code.matchAll(/\bmodule\b/g)].pop()!;
    push(lineOf(code, lastModule.index ?? 0), 'error', 'This module has no matching endmodule. Add endmodule at the end.',
      'Bu modülün endmodule satırı yok. Sona endmodule ekle.');
  }

  // ── begin/end balance ──
  const begins = [...code.matchAll(/\bbegin\b/g)].length;
  const endsKw = [...code.matchAll(/\bend\b/g)].length;
  if (begins !== endsKw) {
    push(1, 'warning', `begin/end do not match (${begins} begin, ${endsKw} end). Every begin needs its own end.`,
      `begin/end sayısı tutmuyor (${begins} begin, ${endsKw} end). Her begin'in kendi end'i olmalı.`);
  }

  const declared = collectDeclared(code);
  const blockKinds: Array<'ff' | 'comb' | 'other'> = [];
  let pendingBlock: 'ff' | 'comb' | 'other' | null = null;
  let singleStatementBlock: 'ff' | 'comb' | 'other' | null = null;

  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (!line) return;

    // Typo in a statement keyword: "asign y = a;"
    const first = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?:<?=|\[)/.exec(line);
    if (first && !KEYWORDS.has(first[1]) && !declared.has(first[1])) {
      const guess = closest(first[1], STATEMENT_WORDS);
      if (guess) {
        push(n, 'error', `Unknown word "${first[1]}". Did you mean "${guess}"?`, `Bilinmeyen kelime "${first[1]}". "${guess}" mı demek istedin?`);
      }
    }

    // Parentheses balance within one line (multi-line port lists excluded).
    const opens = (line.match(/\(/g) ?? []).length;
    const closes = (line.match(/\)/g) ?? []).length;
    if (/^(assign|if|else\s+if)\b/.test(line) && opens !== closes && /;\s*$/.test(line)) {
      push(n, 'error', `Parentheses do not match on this line (${opens} "(" and ${closes} ")").`,
        `Bu satırda parantezler eşleşmiyor (${opens} "(" ve ${closes} ")").`);
    }

    // Missing semicolon after an assignment.
    if (/^(assign\s+)?[\w[\]:.{}, ]+\s*(<=|=)\s*[^=]/.test(line) && !/^(if|else|for|case|module|input|output|localparam|parameter)\b/.test(line)) {
      const next = lines.slice(i + 1).find((l) => l.trim().length > 0)?.trim() ?? '';
      const continues = /^[&|^+\-*/?:)~<>=]/.test(next) || /[&|^+\-*/?:(,~=<>]\s*$/.test(line);
      if (!/;/.test(line) && !/[,{(]\s*$/.test(line) && !/\b(begin|end|endcase)\s*$/.test(line) && !continues) {
        push(n, 'error', 'Missing ";" at the end of this line.', 'Bu satırın sonunda ";" eksik.');
      }
    }

    // Track the kind of always block for = / <= advice.
    if (/\balways_ff\b|\balways\s*@\s*\(\s*(pos|neg)edge/.test(line)) pendingBlock = 'ff';
    else if (/\balways_comb\b|\balways\s*@\s*\(\s*\*\s*\)|\balways\s*@\*/.test(line)) pendingBlock = 'comb';
    if (pendingBlock) {
      if (/\bbegin\b/.test(line)) { blockKinds.push(pendingBlock); pendingBlock = null; singleStatementBlock = null; }
      else if (/;/.test(line)) { singleStatementBlock = pendingBlock; pendingBlock = null; }
    } else {
      for (const _ of line.matchAll(/\bbegin\b/g)) blockKinds.push(blockKinds[blockKinds.length - 1] ?? 'other');
    }
    const kind = singleStatementBlock ?? blockKinds[blockKinds.length - 1] ?? null;
    if (kind === 'ff' && /(^|[^<>=!])=(?!=)/.test(line.replace(/\bfor\s*\(.*\)/, '')) && /^[\w[\]:.]+\s*=/.test(line.replace(/^.*?\b(if\s*\(.*\)|else)\s*/, ''))) {
      push(n, 'warning', 'Use "<=" (non-blocking) inside a clocked always block, not "=".',
        'Saatli always bloğunda "=" yerine "<=" (non-blocking) kullan.');
    }
    if (kind === 'comb' && /^[\w[\]:.]+\s*<=/.test(line.replace(/^.*?\b(if\s*\(.*\)|else)\s*/, ''))) {
      push(n, 'warning', 'Use "=" (blocking) inside always_comb, not "<=".', 'always_comb içinde "<=" yerine "=" kullan.');
    }
    if (/^assign\b[^;]*<=/.test(line) && !/[<>]=\s*[\w(]/.test(line.replace(/^assign\s+[\w[\]:.]+\s*<=/, ''))) {
      if (/^assign\s+[\w[\]:.]+\s*<=/.test(line)) {
        push(n, 'error', 'assign uses "=", not "<=".', 'assign ifadesinde "<=" değil "=" kullanılır.');
      }
    }
    for (const _ of line.matchAll(/\bend\b/g)) {
      blockKinds.pop();
    }
    if (singleStatementBlock && /;/.test(line) && !/\balways/.test(line)) singleStatementBlock = null;

    // Constructs the built-in simulator cannot run.
    if (/~\^|\^~/.test(line)) {
      push(n, 'warning', 'XNOR (~^) is not supported by the built-in simulator. Write ~(a ^ b) instead.',
        'XNOR (~^) yerleşik simülatörde desteklenmiyor. Onun yerine ~(a ^ b) yaz.');
    }
    if (/^assign\s*\{/.test(line) || /^\{[^}]*\}\s*<?=/.test(line)) {
      push(n, 'warning', 'Concatenation on the left side ({a, b} = …) is not supported by the built-in simulator. Assign each signal separately.',
        'Sol tarafta birleştirme ({a, b} = …) yerleşik simülatörde desteklenmiyor. Her sinyale ayrı ayrı değer ata.');
    }
    if (/\bfor\s*\(/.test(line)) {
      push(n, 'warning', 'for loops are not run by the built-in simulator. Write the bits out explicitly (they still synthesize in Schematic).',
        'for döngüleri yerleşik simülatörde çalışmaz. Bitleri tek tek yaz (Şematik aracında yine sentezlenir).');
    }
    {
      // Unary reduction like ^data or &bus: an operator with no left operand.
      const compact = line.replace(/\s+/g, '').replace(/~\^|\^~/g, 'X');
      if (/(^|[=(,?:!{+\-*/<>~])[&|^][A-Za-z_(]/.test(compact.replace(/^assign/, ''))) {
        push(n, 'warning', 'Reduction operators (&bus, |bus, ^bus) are not supported by the built-in simulator. Combine the bits explicitly, e.g. a[0] ^ a[1] ^ a[2].',
          'İndirgeme operatörleri (&bus, |bus, ^bus) yerleşik simülatörde desteklenmiyor. Bitleri açıkça birleştir, örn. a[0] ^ a[1] ^ a[2].');
      }
    }

    // Identifiers that were never declared.
    const body = /^(assign\b|if\b|else\b|[\w[\]:.]+\s*<?=)/.test(line) || /\b(always|case)\b/.test(line) ? line : '';
    if (body) {
      const stripped = body
        .replace(/\d*'[sS]?[bBoOdDhH][0-9a-fA-FxXzZ_]+/g, ' ')
        .replace(/\$\w+/g, ' ')
        .replace(/\.\w+\s*\(/g, ' (')
        .replace(/\b\d+\b/g, ' ');
      for (const m of stripped.matchAll(/\b([A-Za-z_]\w*)\b/g)) {
        const id = m[1];
        if (KEYWORDS.has(id) || declared.has(id)) continue;
        if (/^(clk|CLOCK_50)$/.test(id) && declared.has(id)) continue;
        const guess = closest(id, declared);
        push(n, 'error',
          `"${id}" is used here but never declared.${guess ? ` Did you mean "${guess}"?` : ' Declare it (e.g. logic ' + id + ';) or add it to the port list.'}`,
          `"${id}" burada kullanılıyor ama hiç tanımlanmamış.${guess ? ` "${guess}" mı demek istedin?` : ' Tanımla (örn. logic ' + id + ';) ya da port listesine ekle.'}`);
      }
    }
  });

  if (transpileError && !out.some((d) => d.severity !== 'info')) {
    push(1, 'warning',
      'Part of the logic uses a construct the built-in simulator cannot run, so some outputs will not change. Use assign statements, if/case and bitwise operators.',
      'Mantığın bir kısmı yerleşik simülatörün çalıştıramadığı bir yapı kullanıyor, bu yüzden bazı çıkışlar değişmeyecek. assign, if/case ve bit düzeyi operatörler kullan.');
  }
  return out.sort((a, b) => a.line - b.line);
}

/* ── Editor hand-off ─────────────────────────────────────────────────────
 * The DE2 page computes diagnostics on Compile; the code editor, which owns
 * the Monaco instance, turns them into squiggles. */
type Listener = (diagnostics: Diagnostic[]) => void;
const listeners = new Set<Listener>();
let latest: Diagnostic[] = [];

export function publishDiagnostics(diagnostics: Diagnostic[]): void {
  latest = diagnostics;
  listeners.forEach((l) => l(diagnostics));
}

export function subscribeDiagnostics(listener: Listener): () => void {
  listeners.add(listener);
  listener(latest);
  return () => listeners.delete(listener);
}
