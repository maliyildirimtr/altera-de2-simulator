/**
 * Printable lab report for a DE2 design.
 *
 * Builds one self-contained HTML document (inline CSS and SVG, no network)
 * from the current design and board state. The page opens in a new tab and
 * the browser's own "Save as PDF" turns it into the report file, so no PDF
 * library is bundled. Everything here is pure: it reads the inputs it is
 * given and never touches the simulation.
 */
import { compileVerilog } from '../core/simulator/verilogEngine';
import { lintVerilog, type Diagnostic } from '../core/simulator/diagnostics';
import { expectedTable, type Port, type TruthRow } from '../exercises/grader';
import { extractFsm, type FsmModel } from '../board/fsmExtract';
import type { Capture } from '../board/signalRecorder';
import type { ParsedPort } from '../utils/parser/pinParser';

export type ReportLang = 'en' | 'tr';

export interface LabReportInput {
  lang: ReportLang;
  source: string;
  mappings: ParsedPort[];
  board: {
    switches: number[];
    keys: number[];
    ledR: number[];
    ledG: number[];
    hex: number[][];
    /** Two LCD lines, or null when the design never drove the LCD. */
    lcd: [string, string] | null;
  };
  capture?: Capture | null;
  author?: string;
  course?: string;
  title?: string;
  notes?: string;
  /** Defaults to now; injectable for tests. */
  date?: Date;
}

/** Truth tables stay readable up to 64 rows. */
export const REPORT_MAX_INPUT_BITS = 6;
const WAVE_MAX_SIGNALS = 14;
const WAVE_MAX_SAMPLES = 64;

const T = {
  en: {
    report: 'Lab report',
    author: 'Student',
    course: 'Course',
    date: 'Date',
    board: 'Target board',
    boardName: 'Terasic / Altera DE2 · Cyclone II EP2C35F672C6',
    summary: 'Design summary',
    top: 'Top module',
    inputs: 'Inputs',
    outputs: 'Outputs',
    lines: 'Source lines',
    kind: 'Type',
    combinational: 'Combinational',
    sequential: 'Sequential (clocked)',
    notes: 'Notes',
    pins: 'Pin assignments',
    port: 'Port',
    component: 'DE2 component',
    pin: 'FPGA pin',
    noPins: 'No pins mapped.',
    unmapped: 'not mapped',
    checks: 'Design checks',
    noIssues: 'No issues found.',
    compileFailed: 'The design could not be compiled:',
    truth: 'Truth table',
    truthSkipped: 'Omitted: {n} input bits would need {rows} rows (the limit is 64).',
    truthSequential: 'Not shown for a clocked design; see the timing diagram below.',
    fsm: 'State machine',
    fsmState: 'State',
    fsmNext: 'Next state',
    fsmCond: 'Condition',
    fsmInitial: 'initial',
    always: 'always',
    boardState: 'Board state at the time of the report',
    lcd: 'LCD',
    timing: 'Timing diagram (logic analyzer)',
    timingInfo: 'Last {n} samples; one step per evaluation of the design.',
    noCapture: 'No capture yet. Open the logic analyzer, interact with the board, then create the report again.',
    source: 'Source code',
    footer: 'Generated with Logic Lab',
    print: 'Print / Save as PDF',
    printHint: 'In the print dialog choose "Save as PDF" as the destination.',
    severity: { error: 'Error', warning: 'Warning', info: 'Note' },
    line: 'line',
  },
  tr: {
    report: 'Laboratuvar raporu',
    author: 'Öğrenci',
    course: 'Ders',
    date: 'Tarih',
    board: 'Hedef kart',
    boardName: 'Terasic / Altera DE2 · Cyclone II EP2C35F672C6',
    summary: 'Tasarım özeti',
    top: 'Üst modül',
    inputs: 'Girişler',
    outputs: 'Çıkışlar',
    lines: 'Kaynak satırı',
    kind: 'Tür',
    combinational: 'Kombinasyonel',
    sequential: 'Ardışıl (saatli)',
    notes: 'Notlar',
    pins: 'Pin atamaları',
    port: 'Port',
    component: 'DE2 bileşeni',
    pin: 'FPGA pini',
    noPins: 'Eşlenmiş pin yok.',
    unmapped: 'eşlenmedi',
    checks: 'Tasarım kontrolleri',
    noIssues: 'Sorun bulunmadı.',
    compileFailed: 'Tasarım derlenemedi:',
    truth: 'Doğruluk tablosu',
    truthSkipped: 'Gösterilmedi: {n} giriş biti {rows} satır gerektirir (sınır 64).',
    truthSequential: 'Saatli tasarımda gösterilmez; aşağıdaki zamanlama diyagramına bakın.',
    fsm: 'Durum makinesi',
    fsmState: 'Durum',
    fsmNext: 'Sonraki durum',
    fsmCond: 'Koşul',
    fsmInitial: 'başlangıç',
    always: 'her zaman',
    boardState: 'Rapor anındaki kart durumu',
    lcd: 'LCD',
    timing: 'Zamanlama diyagramı (lojik analizör)',
    timingInfo: 'Son {n} örnek; tasarımın her değerlendirilmesi bir adım.',
    noCapture: 'Henüz kayıt yok. Lojik analizörü açıp kartla etkileşime geç, sonra raporu yeniden oluştur.',
    source: 'Kaynak kod',
    footer: 'Logic Lab ile oluşturuldu',
    print: 'Yazdır / PDF olarak kaydet',
    printHint: 'Yazdırma penceresinde hedef olarak "PDF olarak kaydet" seçeneğini seç.',
    severity: { error: 'Hata', warning: 'Uyarı', info: 'Not' },
    line: 'satır',
  },
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

function fmtDate(d: Date, lang: ReportLang): string {
  try {
    return d.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

function bin(v: number, width: number): string {
  if (!Number.isFinite(v)) return 'x';
  return width === 1 ? String(v & 1) : v.toString(2).padStart(width, '0');
}

/* ── Board snapshot (SVG) ──────────────────────────────────────────────── */

// Segment polygons for one digit in a 30x50 box, a..g (DE2 HEXn[0] is a).
const SEGMENTS = [
  '6,2 24,2 21,6 9,6', // a
  '25,3 28,6 27,23 23,21 24,7', // b
  '27,27 28,44 25,47 23,43 23,29', // c
  '6,48 24,48 21,44 9,44', // d
  '5,47 2,44 3,27 7,29 7,43', // e
  '5,3 2,6 3,23 7,21 6,7', // f
  '7,25 10,22 20,22 23,25 20,28 10,28', // g
];

export function boardSvg(board: LabReportInput['board'], lang: ReportLang): string {
  const W = 720;
  const out: string[] = [];
  const label = (x: number, y: number, text: string, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-size="10" fill="#475569" text-anchor="${anchor}">${escapeHtml(text)}</text>`;

  // HEX7..HEX0, left to right as on the board.
  out.push(label(20, 16, 'HEX7 … HEX0'));
  for (let d = 7; d >= 0; d--) {
    const x = 20 + (7 - d) * 40;
    const segs = board.hex[d] ?? [];
    out.push(`<g transform="translate(${x},24)"><rect x="-4" y="-3" width="38" height="56" rx="3" fill="#111827"/>`);
    SEGMENTS.forEach((pts, i) => {
      const on = segs[i] === 0; // active-low
      out.push(`<polygon points="${pts}" fill="${on ? '#ef4444' : '#3f1d1d'}"/>`);
    });
    out.push('</g>');
  }

  if (board.lcd) {
    out.push(label(360, 16, 'LCD 16×2'));
    out.push(`<rect x="360" y="21" width="340" height="56" rx="4" fill="#9fbf3b" stroke="#4d5f18"/>`);
    board.lcd.forEach((line, r) => {
      out.push(`<text x="372" y="${45 + r * 24}" font-family="ui-monospace,Menlo,monospace" font-size="18" letter-spacing="1.5" fill="#1f2a08" xml:space="preserve">${escapeHtml(line.padEnd(16).slice(0, 16))}</text>`);
    });
  }

  // LEDR17..0 and LEDG8..0.
  const ledRow = (y: number, name: string, values: number[], count: number, on: string, off: string) => {
    out.push(label(20, y - 8, `${name}${count - 1} … ${name}0`));
    for (let i = count - 1; i >= 0; i--) {
      const x = 26 + (count - 1 - i) * 22;
      out.push(`<rect x="${x - 6}" y="${y - 3}" width="12" height="7" rx="1.5" fill="${values[i] ? on : off}" stroke="#94a3b8" stroke-width=".5"/>`);
      out.push(`<text x="${x}" y="${y + 16}" font-size="7.5" fill="#94a3b8" text-anchor="middle">${i}</text>`);
    }
  };
  ledRow(112, 'LEDR', board.ledR, 18, '#ef4444', '#fde2e2');
  ledRow(152, 'LEDG', board.ledG, 9, '#22c55e', '#dcfce7');

  // SW17..0 (up = 1) and KEY3..0 (active-low: 0 = pressed).
  out.push(label(20, 184, `SW17 … SW0`));
  for (let i = 17; i >= 0; i--) {
    const x = 26 + (17 - i) * 22;
    const up = board.switches[i] === 1;
    out.push(`<rect x="${x - 6}" y="190" width="12" height="26" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width=".6"/>`);
    out.push(`<rect x="${x - 5}" y="${up ? 191 : 204}" width="10" height="11" rx="1.5" fill="#334155"/>`);
    out.push(`<text x="${x}" y="228" font-size="7.5" fill="#94a3b8" text-anchor="middle">${i}</text>`);
  }
  out.push(label(460, 184, 'KEY3 … KEY0'));
  for (let i = 3; i >= 0; i--) {
    const x = 474 + (3 - i) * 44;
    const pressed = board.keys[i] === 0;
    out.push(`<rect x="${x - 14}" y="190" width="28" height="28" rx="4" fill="#cbd5e1" stroke="#64748b" stroke-width=".6"/>`);
    out.push(`<circle cx="${x}" cy="204" r="9" fill="${pressed ? '#2563eb' : '#1e293b'}"/>`);
    out.push(`<text x="${x}" y="230" font-size="7.5" fill="#94a3b8" text-anchor="middle">${pressed ? (lang === 'tr' ? 'basılı' : 'pressed') : i}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 240" width="100%" role="img" aria-label="DE2 board state">${out.join('')}</svg>`;
}

/* ── Timing diagram (SVG) ──────────────────────────────────────────────── */

export function timingSvg(capture: Capture): string {
  const samples = capture.samples.slice(-WAVE_MAX_SAMPLES);
  const signals = capture.signals.slice(0, WAVE_MAX_SIGNALS);
  if (!samples.length || !signals.length) return '';
  const nameW = 110;
  const rowH = 26;
  const step = Math.max(6, Math.min(24, Math.floor(600 / samples.length)));
  const W = nameW + step * samples.length + 10;
  const H = signals.length * rowH + 10;
  const out: string[] = [];
  for (let i = 0; i <= samples.length; i += Math.max(1, Math.round(samples.length / 16))) {
    const x = nameW + i * step;
    out.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#e2e8f0" stroke-width=".6"/>`);
  }
  signals.forEach((name, r) => {
    const width = capture.widths[name] ?? 1;
    const y0 = 5 + r * rowH;
    const hi = y0 + 4;
    const lo = y0 + rowH - 8;
    out.push(`<text x="4" y="${y0 + rowH / 2 + 2}" font-size="10" font-family="ui-monospace,Menlo,monospace" fill="#0f172a">${escapeHtml(name)}${width > 1 ? `[${width - 1}:0]` : ''}</text>`);
    if (width === 1) {
      let d = '';
      samples.forEach((s, i) => {
        const y = (s.values[name] ?? 0) & 1 ? hi : lo;
        const x = nameW + i * step;
        d += i === 0 ? `M${x},${y}` : `L${x},${y}`;
        d += `L${x + step},${y}`;
      });
      out.push(`<path d="${d}" fill="none" stroke="#059669" stroke-width="1.4"/>`);
    } else {
      // Bus: a hexagon per run of equal values, labelled in hex.
      let start = 0;
      for (let i = 1; i <= samples.length; i++) {
        const prev = samples[i - 1].values[name];
        if (i < samples.length && samples[i].values[name] === prev) continue;
        const x1 = nameW + start * step;
        const x2 = nameW + i * step;
        const m = Math.min(3, (x2 - x1) / 2);
        out.push(`<polygon points="${x1},${(hi + lo) / 2} ${x1 + m},${hi} ${x2 - m},${hi} ${x2},${(hi + lo) / 2} ${x2 - m},${lo} ${x1 + m},${lo}" fill="#ecfdf5" stroke="#059669" stroke-width="1"/>`);
        const text = Number.isFinite(prev) ? `${(prev as number).toString(16).toUpperCase()}` : 'x';
        if (x2 - x1 >= text.length * 6 + 4) out.push(`<text x="${(x1 + x2) / 2}" y="${(hi + lo) / 2 + 3.5}" font-size="9" font-family="ui-monospace,Menlo,monospace" text-anchor="middle" fill="#065f46">${text}</text>`);
        start = i;
      }
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Timing diagram">${out.join('')}</svg>`;
}

/* ── Document ─────────────────────────────────────────────────────────── */

interface Analysis {
  top: string;
  inputs: Port[];
  outputs: Port[];
  sequential: boolean;
  compileError: string | null;
  diagnostics: Diagnostic[];
  truth: { inputs: Port[]; outputs: Port[]; rows: TruthRow[] } | null;
  truthBits: number;
  fsm: FsmModel | null;
}

export function analyzeDesign(source: string): Analysis {
  let top = 'top';
  let inputs: Port[] = [];
  let outputs: Port[] = [];
  let compileError: string | null = null;
  let transpileError: string | undefined;
  try {
    const m = compileVerilog(source);
    top = m.topModule || top;
    transpileError = m.transpileError;
    const w = (n: string) => Math.max(1, m.portWidths?.[n] ?? 1);
    inputs = m.inputs.map((name) => ({ name, width: w(name) }));
    outputs = m.outputs.map((name) => ({ name, width: w(name) }));
  } catch (err) {
    compileError = (err as Error).message;
  }
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const sequential = /\b(always_ff|posedge|negedge)\b/.test(clean);
  const truthBits = inputs.reduce((n, p) => n + p.width, 0);
  let truth: Analysis['truth'] = null;
  if (!compileError && !transpileError && !sequential && inputs.length && outputs.length && truthBits <= REPORT_MAX_INPUT_BITS) {
    try {
      truth = expectedTable(source);
    } catch {
      truth = null;
    }
  }
  let fsm: FsmModel | null = null;
  try {
    fsm = sequential ? extractFsm(source) : null;
  } catch {
    fsm = null;
  }
  return { top, inputs, outputs, sequential, compileError, diagnostics: compileError ? [] : lintVerilog(source, transpileError), truth, truthBits, fsm };
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#f1f5f9;color:#0f172a;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.page{max-width:210mm;margin:16px auto;background:#fff;padding:18mm 16mm;box-shadow:0 1px 4px rgba(0,0,0,.12)}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:14px;gap:16px}
.brand{color:#0f766e;font-weight:700;font-size:12px;letter-spacing:.08em}
.brand span{text-transform:uppercase}
h1{font-size:22px;margin:2px 0 0}
h2{font-size:14.5px;margin:20px 0 8px;padding-bottom:3px;border-bottom:1px solid #e2e8f0;color:#0f766e;break-after:avoid}
.meta{font-size:12px;text-align:right;color:#334155;white-space:nowrap}
.meta b{color:#0f172a}
table{border-collapse:collapse;width:100%;font-size:12px}
th,td{border:1px solid #e2e8f0;padding:3px 7px;text-align:left;vertical-align:top}
th{background:#f8fafc;font-weight:600}
td.mono,th.mono,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
table.truth td,table.truth th{text-align:center;padding:2px 6px}
table.truth td.out{background:#f0fdfa;font-weight:600}
.kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:12.5px}
.kv dt{color:#64748b}.kv dd{margin:0}
.muted{color:#64748b}
.diag-error{color:#b91c1c}.diag-warning{color:#b45309}.diag-info{color:#0369a1}
pre.code{margin:0;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:8px 10px;counter-reset:ln}
pre.code span{display:block;padding-left:3.2em;text-indent:-3.2em}
pre.code span::before{counter-increment:ln;content:counter(ln);display:inline-block;width:2.6em;margin-right:.6em;text-align:right;color:#94a3b8}
.fig{border:1px solid #e2e8f0;border-radius:4px;padding:8px;break-inside:avoid}
.notes{white-space:pre-wrap;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:8px 10px}
footer{margin-top:22px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;display:flex;justify-content:space-between}
.toolbar{max-width:210mm;margin:16px auto 0;display:flex;gap:10px;align-items:center;font-size:12.5px;color:#475569}
.toolbar button{font:inherit;font-weight:600;color:#fff;background:#0f766e;border:0;border-radius:5px;padding:8px 14px;cursor:pointer}
section{break-inside:auto}
tr{break-inside:avoid}
@media print{
  @page{size:A4;margin:14mm 12mm}
  body{background:#fff}
  .page{margin:0;padding:0;box-shadow:none;max-width:none}
  .toolbar{display:none}
  h2{break-after:avoid}
}
`;

export function buildLabReport(input: LabReportInput): string {
  const t = T[input.lang];
  const a = analyzeDesign(input.source);
  const date = input.date ?? new Date();
  const title = input.title?.trim() || a.top;
  const port = (p: Port) => `${escapeHtml(p.name)}${p.width > 1 ? `[${p.width - 1}:0]` : ''}`;
  const parts: string[] = [];

  parts.push(`<header><div><div class="brand"><span lang="en">Logic Lab</span> · ${escapeHtml(t.report.toLocaleUpperCase(input.lang === 'tr' ? 'tr-TR' : 'en-US'))}</div><h1>${escapeHtml(title)}</h1><div class="muted">${escapeHtml(t.boardName)}</div></div>
<div class="meta">${input.author?.trim() ? `<div>${escapeHtml(t.author)}: <b>${escapeHtml(input.author.trim())}</b></div>` : ''}${input.course?.trim() ? `<div>${escapeHtml(t.course)}: <b>${escapeHtml(input.course.trim())}</b></div>` : ''}<div>${escapeHtml(t.date)}: <b>${escapeHtml(fmtDate(date, input.lang))}</b></div></div></header>`);

  // Summary
  parts.push(`<section><h2>1. ${escapeHtml(t.summary)}</h2><dl class="kv">
<dt>${escapeHtml(t.top)}</dt><dd class="mono">${escapeHtml(a.top)}</dd>
<dt>${escapeHtml(t.kind)}</dt><dd>${escapeHtml(a.sequential ? t.sequential : t.combinational)}</dd>
<dt>${escapeHtml(t.inputs)}</dt><dd class="mono">${a.inputs.map(port).join(', ') || '—'}</dd>
<dt>${escapeHtml(t.outputs)}</dt><dd class="mono">${a.outputs.map(port).join(', ') || '—'}</dd>
<dt>${escapeHtml(t.lines)}</dt><dd>${input.source.split('\n').length}</dd>
</dl>${input.notes?.trim() ? `<p><b>${escapeHtml(t.notes)}</b></p><div class="notes">${escapeHtml(input.notes.trim())}</div>` : ''}</section>`);

  // Pins
  const pins = input.mappings.filter((m) => m.portName);
  parts.push(`<section><h2>2. ${escapeHtml(t.pins)}</h2>${pins.length ? `<table><thead><tr><th>${escapeHtml(t.port)}</th><th>${escapeHtml(t.component)}</th><th>${escapeHtml(t.pin)}</th></tr></thead><tbody>${pins
    .map((m) => `<tr><td class="mono">${escapeHtml(m.portName)}</td><td class="mono">${m.virtualComponent ? escapeHtml(m.virtualComponent) : `<span class="muted">${escapeHtml(t.unmapped)}</span>`}</td><td class="mono">${m.physicalPin ? escapeHtml(m.physicalPin) : '—'}</td></tr>`)
    .join('')}</tbody></table>` : `<p class="muted">${escapeHtml(t.noPins)}</p>`}</section>`);

  // Checks
  parts.push(`<section><h2>3. ${escapeHtml(t.checks)}</h2>${
    a.compileError
      ? `<p class="diag-error">${escapeHtml(t.compileFailed)} ${escapeHtml(a.compileError)}</p>`
      : a.diagnostics.length
        ? `<ul>${a.diagnostics.map((d) => `<li class="diag-${d.severity}"><b>${escapeHtml(t.severity[d.severity])}</b> (${escapeHtml(t.line)} ${d.line}): ${escapeHtml(d.message[input.lang])}</li>`).join('')}</ul>`
        : `<p>${escapeHtml(t.noIssues)}</p>`
  }</section>`);

  // Truth table / FSM
  let n = 4;
  if (a.sequential) {
    if (a.fsm && a.fsm.transitions.length) {
      const f = a.fsm;
      parts.push(`<section><h2>${n++}. ${escapeHtml(t.fsm)} <span class="muted mono" style="font-weight:400">(${escapeHtml(f.stateVar)})</span></h2><table><thead><tr><th>${escapeHtml(t.fsmState)}</th><th>${escapeHtml(t.fsmCond)}</th><th>${escapeHtml(t.fsmNext)}</th></tr></thead><tbody>${f.transitions
        .map((tr) => `<tr><td class="mono">${escapeHtml(tr.from)}${tr.from === f.initial ? ` <span class="muted">(${escapeHtml(t.fsmInitial)})</span>` : ''}</td><td class="mono">${escapeHtml(tr.condition || t.always)}</td><td class="mono">${escapeHtml(tr.to)}</td></tr>`)
        .join('')}</tbody></table></section>`);
    } else {
      parts.push(`<section><h2>${n++}. ${escapeHtml(t.truth)}</h2><p class="muted">${escapeHtml(t.truthSequential)}</p></section>`);
    }
  } else if (a.truth) {
    const tt = a.truth;
    parts.push(`<section><h2>${n++}. ${escapeHtml(t.truth)}</h2><table class="truth"><thead><tr>${tt.inputs.map((p) => `<th class="mono">${port(p)}</th>`).join('')}${tt.outputs.map((p) => `<th class="mono">${port(p)}</th>`).join('')}</tr></thead><tbody>${tt.rows
      .map((r) => `<tr>${tt.inputs.map((p) => `<td class="mono">${bin(r.inputs[p.name], p.width)}</td>`).join('')}${tt.outputs.map((p) => `<td class="mono out">${bin(r.expected[p.name], p.width)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table></section>`);
  } else if (!a.compileError && a.truthBits > REPORT_MAX_INPUT_BITS) {
    parts.push(`<section><h2>${n++}. ${escapeHtml(t.truth)}</h2><p class="muted">${escapeHtml(fill(t.truthSkipped, { n: a.truthBits, rows: 2 ** Math.min(a.truthBits, 40) }))}</p></section>`);
  }

  // Board
  parts.push(`<section><h2>${n++}. ${escapeHtml(t.boardState)}</h2><div class="fig">${boardSvg(input.board, input.lang)}</div></section>`);

  // Timing
  const cap = input.capture;
  const svg = cap ? timingSvg(cap) : '';
  parts.push(`<section><h2>${n++}. ${escapeHtml(t.timing)}</h2>${svg ? `<div class="fig">${svg}</div><p class="muted">${escapeHtml(fill(t.timingInfo, { n: Math.min(cap!.samples.length, WAVE_MAX_SAMPLES) }))}</p>` : `<p class="muted">${escapeHtml(t.noCapture)}</p>`}</section>`);

  // Source
  const lines = input.source.replace(/\s+$/, '').split('\n');
  parts.push(`<section><h2>${n++}. ${escapeHtml(t.source)}</h2><pre class="code">${lines.map((l) => `<span>${escapeHtml(l) || ' '}</span>`).join('')}</pre></section>`);

  parts.push(`<footer><span>${escapeHtml(t.footer)}</span><span>${escapeHtml(t.boardName)}</span></footer>`);

  const docTitle = `${title} — ${t.report}`;
  return `<!doctype html>
<html lang="${input.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(docTitle)}</title><style>${CSS}</style></head>
<body><div class="toolbar"><button type="button" onclick="window.print()">${escapeHtml(t.print)}</button><span>${escapeHtml(t.printHint)}</span></div>
<div class="page">${parts.join('\n')}</div></body></html>`;
}

/**
 * Opens the report in a new tab. Falls back to downloading the HTML file
 * when the browser blocks the new tab.
 */
export function openLabReport(html: string, fileName: string): 'opened' | 'downloaded' {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'opened';
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
