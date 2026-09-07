// ============================================================
// testbenchParser.ts — Testbench-driven Approximate Simulator
//
// Phase 1: Replay 'initial begin' to drive input signals.
// Phase 2: Evaluate combinational logic (assign / always_comb)
//          from the design module to compute output signals.
// ============================================================

import type { SimulationData, VCDSignal, VCDTransition } from './vcdParser';

interface ParsedFile {
  name: string;
  content: string;
}

// ── Helpers ───────────────────────────────────────────────────

function stripComments(src: string): string {
  return src
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractSignals(content: string): VCDSignal[] {
  const signals: VCDSignal[] = [];
  let code = 33;
  const re = /\b(reg|logic|wire)\b\s*(?:\[\s*\d+\s*:\s*\d+\s*\]\s*)?([A-Za-z_][A-Za-z0-9_,\s]*);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const type = m[1] === 'wire' ? 'Wire' : 'Reg';
    for (const name of m[2].split(',').map(s => s.trim()).filter(Boolean)) {
      if (!signals.find(s => s.name === name))
        signals.push({ name, type, width: 1, symbol: String.fromCharCode(code++), transitions: [] });
    }
  }
  return signals;
}

/** Returns the signal's value at or before `time` */
function valAt(transitions: VCDTransition[], time: number): number {
  let v = 0;
  for (const t of transitions) {
    if (t.time <= time) v = t.val as number;
    else break;
  }
  return v;
}

/** Set or overwrite a transition at exactly `time` */
function setAt(sig: VCDSignal, time: number, val: number) {
  const last = sig.transitions.at(-1);
  if (last && last.time === time) {
    last.val = val;
  } else {
    sig.transitions.push({ time, val });
  }
}

// ── Phase 1: port mapping (from testbench UUT instantiation) ──

/** Returns { portName → tbSignalName }  e.g. { A: 'At', B: 'Bt' } */
function parsePortMap(tbContent: string): Record<string, string> {
  const map: Record<string, string> = {};
  const re = /\.(\w+)\s*\(\s*(\w+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tbContent)) !== null) map[m[1]] = m[2];
  return map;
}

// ── Phase 2: combinational logic evaluation ───────────────────

/** Collect { lhsName → rhsExpr } from assign & always_comb */
function parseAssigns(designContent: string): { lhs: string; rhs: string }[] {
  const result: { lhs: string; rhs: string }[] = [];

  // assign S = A ^ B ^ Cin;
  const asgRe = /\bassign\b\s+(\w+)\s*=\s*([^;]+)/g;
  let m: RegExpExecArray | null;
  while ((m = asgRe.exec(designContent)) !== null)
    result.push({ lhs: m[1], rhs: m[2].trim() });

  // always_comb / always @(*) block: simple "lhs = rhs;"
  const combRe = /\b(?:always_comb|always\s*@\s*\(?\s*\*\s*\)?)\s*(?:begin)?([\s\S]*?)(?:end\b|(?=\b(?:always|assign|endmodule)\b))/g;
  while ((m = combRe.exec(designContent)) !== null) {
    const block = m[1];
    const innerRe = /^\s*(\w+)\s*=\s*([^;]+)/gm;
    let inner: RegExpExecArray | null;
    while ((inner = innerRe.exec(block)) !== null)
      result.push({ lhs: inner[1], rhs: inner[2].trim() });
  }

  return result;
}

/** Evaluate a simple bitwise expression.
 *  Substitutes signal names with numeric values then calls Function().
 *  JS operators &, |, ^, ~ are identical to SV 1-bit bitwise ops. */
function evalExpr(rhs: string, values: Record<string, number>): number {
  let expr = rhs;
  // Replace signal names (longest first to avoid partial replacement)
  const names = Object.keys(values).sort((a, b) => b.length - a.length);
  for (const n of names)
    expr = expr.replace(new RegExp(`\\b${n}\\b`, 'g'), String(values[n]));
  try {
    // eslint-disable-next-line no-new-func
    return (Function('"use strict"; return (' + expr + ') & 1')() as number);
  } catch {
    return 0;
  }
}

// ── Public API ────────────────────────────────────────────────

export function simulateFromTestbench(files: ParsedFile[]): SimulationData | null {
  const logs: string[] = [];

  // Identify testbench vs design files
  const tb = files.find(f => /^tb_|_tb\.(sv|v)$/i.test(f.name)) ?? files[0];
  if (!tb) return null;

  const designFiles = files.filter(f => f !== tb);
  const baseName = tb.name.replace(/\.\w+$/, '');

  logs.push(`# [Approx. Sim] Testbench: ${tb.name}`);

  const tbClean  = stripComments(tb.content);
  const allClean = files.map(f => stripComments(f.content)).join('\n');

  // ── Extract all declared signals ─────────────────────────────
  const signals = extractSignals(allClean);
  if (!signals.length) { logs.push('# Sinyal bulunamadı.'); return null; }
  logs.push(`# ${signals.length} sinyal: ${signals.map(s => s.name).join(', ')}`);

  // ── Parse initial begin block ─────────────────────────────────
  const initMatch = tbClean.match(/\binitial\b\s*\bbegin\b([\s\S]*?)\bend\b/);
  if (!initMatch) { logs.push('# initial begin bulunamadı.'); return null; }

  const curVals: Record<string, number> = {};
  signals.forEach(s => { curVals[s.name] = 0; });

  let t = 0;
  const timePoints: number[] = [0];

  // Collect all unique time points while replaying assignments
  const stmts = initMatch[1]
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('$stop') && !s.startsWith('$finish'));

  for (const stmt of stmts) {
    // Delay
    const dm = stmt.match(/^#\s*(\d+)$/);
    if (dm) {
      const logV = signals.map(s => `${s.name}=${curVals[s.name]}`).join(' ');
      logs.push(`# ${String(t).padStart(4)} ps : ${logV}`);
      t += parseInt(dm[1], 10);
      timePoints.push(t);
      continue;
    }

    // Assignment
    const am = stmt.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (am) {
      const sigName = am[1];
      let   valStr  = am[2].trim();
      const lit = valStr.match(/\d*'\s*[bBdDhH]\s*([0-9a-fA-Fxz]+)/);
      if (lit) valStr = lit[1];
      const val = parseInt(valStr, 10);
      if (!isNaN(val) && sigName in curVals) {
        curVals[sigName] = val & 1;
        const sig = signals.find(s => s.name === sigName)!;
        setAt(sig, t, val & 1);
      }
    }
  }
  // Final log
  logs.push(`# ${String(t).padStart(4)} ps : ${signals.map(s => `${s.name}=${curVals[s.name]}`).join(' ')}`);
  const maxTime = t > 0 ? t : 100;

  // ── Phase 2: Evaluate combinational logic ────────────────────
  const portMap = parsePortMap(tbClean); // portName → tbSignalName

  // Collect assigns from all design files
  const assigns: { lhs: string; rhs: string }[] = [];
  for (const df of designFiles)
    assigns.push(...parseAssigns(stripComments(df.content)));

  if (assigns.length > 0) {
    logs.push(`# [Comb. Eval] ${assigns.length} assign/comb ifadesi bulundu.`);
  }

  // For every unique time point, evaluate all combinational assigns
  const uniqueTimes = [...new Set(timePoints)].sort((a, b) => a - b);

  for (const tp of uniqueTimes) {
    // Build evaluation context:
    // For each module port, look up the testbench signal's value at tp
    const evalCtx: Record<string, number> = {};

    // Start with all testbench signals at this time
    for (const sig of signals)
      evalCtx[sig.name] = valAt(sig.transitions, tp);

    // Add reverse port mapping: portName → value of its tb signal
    for (const [port, tbSig] of Object.entries(portMap)) {
      const sig = signals.find(s => s.name === tbSig);
      if (sig) evalCtx[port] = valAt(sig.transitions, tp);
    }

    // Evaluate assigns (multiple passes for dependency resolution)
    const MAX_PASSES = 4;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      for (const { lhs, rhs } of assigns) {
        const computed = evalExpr(rhs, evalCtx);
        evalCtx[lhs] = computed;

        // Map result back to testbench signal name if needed
        const tbOut = portMap[lhs] ?? lhs; // if lhs is a port name, map to tb name; else use as-is
        const outSig = signals.find(s => s.name === tbOut);
        if (outSig) {
          const prev = valAt(outSig.transitions, tp - 1 >= 0 ? tp - 1 : 0);
          if (computed !== prev || tp === 0) {
            setAt(outSig, tp, computed);
            evalCtx[tbOut] = computed; // update ctx for next iteration
          }
        }

        // Also try direct lhs match (for internal signals like s1, c1, c2)
        const directSig = signals.find(s => s.name === lhs);
        if (directSig && directSig !== outSig) {
          setAt(directSig, tp, computed);
          evalCtx[lhs] = computed;
        }
      }
    }
  }

  // ── Finalise: ensure t=0 entry & extend to maxTime ───────────
  signals.forEach(sig => {
    sig.transitions.sort((a, b) => a.time - b.time);
    if (!sig.transitions.length || sig.transitions[0].time > 0)
      sig.transitions.unshift({ time: 0, val: 0 });
    const last = sig.transitions.at(-1)!;
    if (last.time < maxTime)
      sig.transitions.push({ time: maxTime, val: last.val });
  });

  logs.push(`# [Approx. Sim] Tamamlandı. Max: ${maxTime} ps`);
  logs.push(`# vsim -gui work.${baseName}`);

  return { 
    maxTime, 
    signals, 
    logs,
    tree: { name: 'Root', type: 'root', children: {}, signals: {} },
    timescale: { magnitude: 1, unit: 'ps' as const, toPsFactor: 1 }
  };
}
