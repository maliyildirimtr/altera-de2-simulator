/**
 * Visual testbench generator: the student draws input waveforms step by step
 * and this module turns them into an ordinary SystemVerilog testbench
 * ($dumpfile / $dumpvars / $finish) that the Waveform simulator runs with
 * Icarus Verilog. Pure functions only — the UI lives in StimulusEditor.tsx.
 */
import { compileVerilog } from '../core/simulator/verilogEngine';

export interface StimPort {
  name: string;
  width: number;
}

export interface StimulusSpec {
  top: string;
  inputs: StimPort[];
  outputs: StimPort[];
  /** Input driven as a free-running clock, or null for none. */
  clock: string | null;
  /** Full clock period in ns (even, ≥ 2). */
  clockPeriod: number;
  /** Duration of one stimulus step in ns. */
  stepTime: number;
  steps: number;
  /** Per input (clock excluded): one value per step. */
  values: Record<string, number[]>;
}

export const MIN_STEPS = 2;
export const MAX_STEPS = 64;
/** Input bits for which "all combinations" is offered (2^6 = 64 steps). */
export const MAX_EXHAUSTIVE_BITS = 6;

const CLOCK_RE = /^(clk|clock|clk_?\w*|\w*_clk|clock_50|clk50)$/i;
const RESET_RE = /^(rst|reset|rst_?n|reset_?n|areset|nreset|clr|clear)$/i;
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_$]*$/;

export function mask(width: number): number {
  return width >= 31 ? 0x7fffffff : (1 << width) - 1;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, '');
}

/**
 * Reads the top module's ports: first with the built-in engine, then with a
 * plain ANSI-header parser for constructs the engine does not handle.
 */
export function readPorts(source: string): { top: string; inputs: StimPort[]; outputs: StimPort[] } | null {
  try {
    const m = compileVerilog(source);
    if (m.topModule && (m.inputs.length || m.outputs.length)) {
      const w = (n: string) => Math.max(1, m.portWidths?.[n] ?? 1);
      return { top: m.topModule, inputs: m.inputs.map((name) => ({ name, width: w(name) })), outputs: m.outputs.map((name) => ({ name, width: w(name) })) };
    }
  } catch {
    /* fall back to the header parser */
  }
  const clean = stripComments(source);
  const head = /\bmodule\s+([A-Za-z_][A-Za-z0-9_$]*)\s*(?:#\s*\([\s\S]*?\)\s*)?\(([\s\S]*?)\)\s*;/.exec(clean);
  if (!head) return null;
  const inputs: StimPort[] = [];
  const outputs: StimPort[] = [];
  let dir: 'input' | 'output' | null = null;
  let width = 1;
  for (const raw of head[2].split(',')) {
    const part = raw.trim();
    const d = /^(input|output|inout)\b/.exec(part);
    if (d) {
      dir = d[1] === 'output' ? 'output' : d[1] === 'input' ? 'input' : null;
      const r = /\[\s*(\d+)\s*:\s*(\d+)\s*\]/.exec(part);
      width = r ? Math.abs(Number(r[1]) - Number(r[2])) + 1 : 1;
    }
    const name = /([A-Za-z_][A-Za-z0-9_$]*)\s*$/.exec(part)?.[1];
    if (!name || !dir) continue;
    (dir === 'input' ? inputs : outputs).push({ name, width });
  }
  return inputs.length || outputs.length ? { top: head[1], inputs, outputs } : null;
}

export function guessClock(inputs: StimPort[]): string | null {
  return inputs.find((p) => p.width === 1 && CLOCK_RE.test(p.name))?.name ?? null;
}

export function isReset(name: string): boolean {
  return RESET_RE.test(name);
}

/** True for reset inputs that are active low (rst_n, nreset…). */
export function isActiveLowReset(name: string): boolean {
  return /(_n|n)$/i.test(name) && isReset(name) && !/^(clr|clear)$/i.test(name);
}

function driven(spec: Pick<StimulusSpec, 'inputs' | 'clock'>): StimPort[] {
  return spec.inputs.filter((p) => p.name !== spec.clock);
}

/** Every input combination, first input most significant (like a truth table). */
export function exhaustive(inputs: StimPort[]): { steps: number; values: Record<string, number[]> } | null {
  const bits = inputs.reduce((n, p) => n + p.width, 0);
  if (bits === 0 || bits > MAX_EXHAUSTIVE_BITS) return null;
  const steps = Math.max(MIN_STEPS, 1 << bits);
  const values: Record<string, number[]> = {};
  for (const p of inputs) values[p.name] = [];
  for (let combo = 0; combo < steps; combo++) {
    let shift = 0;
    for (let i = inputs.length - 1; i >= 0; i--) {
      const p = inputs[i];
      values[p.name].push((combo >> shift) & mask(p.width));
      shift += p.width;
    }
  }
  return { steps, values };
}

/** A sensible starting point: all combinations, or a reset pulse then zeros. */
export function defaultSpec(ports: { top: string; inputs: StimPort[]; outputs: StimPort[] }): StimulusSpec {
  const clock = guessClock(ports.inputs);
  const data = ports.inputs.filter((p) => p.name !== clock);
  const base: StimulusSpec = { top: ports.top, inputs: ports.inputs, outputs: ports.outputs, clock, clockPeriod: 10, stepTime: 10, steps: 16, values: {} };
  const all = clock ? null : exhaustive(data);
  if (all) return { ...base, steps: all.steps, values: all.values };
  for (const p of data) {
    const low = isActiveLowReset(p.name);
    base.values[p.name] = Array.from({ length: base.steps }, (_, i) => (isReset(p.name) ? ((i < 2) !== low ? 1 : 0) : 0));
  }
  return base;
}

/** Resizes every row to `steps`, repeating each row's last value. */
export function resizeSpec(spec: StimulusSpec, steps: number): StimulusSpec {
  const n = Math.max(MIN_STEPS, Math.min(MAX_STEPS, Math.round(steps)));
  const values: Record<string, number[]> = {};
  for (const p of driven(spec)) {
    const row = spec.values[p.name] ?? [];
    values[p.name] = Array.from({ length: n }, (_, i) => row[i] ?? row[row.length - 1] ?? 0);
  }
  return { ...spec, steps: n, values };
}

export function setValue(spec: StimulusSpec, name: string, step: number, value: number): StimulusSpec {
  const port = spec.inputs.find((p) => p.name === name);
  if (!port || step < 0 || step >= spec.steps) return spec;
  const row = [...(spec.values[name] ?? Array(spec.steps).fill(0))];
  row[step] = value & mask(port.width);
  return { ...spec, values: { ...spec.values, [name]: row } };
}

function literal(value: number, width: number): string {
  return width === 1 ? `1'b${value & 1}` : `${width}'h${(value & mask(width)).toString(16).toUpperCase()}`;
}

function decl(p: StimPort): string {
  return `logic${p.width > 1 ? ` [${p.width - 1}:0]` : ''} ${p.name};`;
}

/** Builds the testbench text. Throws on names that are not plain identifiers. */
export function generateTestbench(spec: StimulusSpec): string {
  const all = [...spec.inputs, ...spec.outputs];
  for (const p of all) if (!IDENT_RE.test(p.name)) throw new Error(`Unsupported port name: ${p.name}`);
  if (!IDENT_RE.test(spec.top)) throw new Error(`Unsupported module name: ${spec.top}`);
  const tb = `${spec.top}_tb`;
  const half = Math.max(1, Math.round(spec.clockPeriod / 2));
  const step = Math.max(1, Math.round(spec.stepTime));
  const data = driven(spec);
  const out: string[] = [];
  out.push('// Generated by the Logic Lab stimulus editor. Edit freely.');
  out.push('`timescale 1ns/1ps');
  out.push('');
  out.push(`module ${tb};`);
  for (const p of spec.inputs) out.push(`  ${decl(p)}`);
  for (const p of spec.outputs) out.push(`  ${decl(p)}`);
  out.push('');
  out.push(`  ${spec.top} dut (`);
  out.push(all.map((p) => `    .${p.name}(${p.name})`).join(',\n'));
  out.push('  );');
  out.push('');
  if (spec.clock) {
    out.push(`  // ${spec.clock}: period ${half * 2} ns`);
    out.push(`  initial ${spec.clock} = 1'b0;`);
    out.push(`  always #${half} ${spec.clock} = ~${spec.clock};`);
    out.push('');
  }
  out.push('  initial begin');
  out.push(`    $dumpfile("${tb}.vcd");`);
  out.push(`    $dumpvars(0, ${tb});`);
  if (data.length === 0) {
    out.push(`    #${step * spec.steps};`);
  }
  let prev: Record<string, number> = {};
  for (let s = 0; s < spec.steps && data.length; s++) {
    const changes = data.filter((p) => s === 0 || (spec.values[p.name]?.[s] ?? 0) !== prev[p.name]);
    const now: Record<string, number> = {};
    for (const p of data) now[p.name] = (spec.values[p.name]?.[s] ?? 0) & mask(p.width);
    const assigns = changes.map((p) => `${p.name} = ${literal(now[p.name], p.width)};`).join(' ');
    out.push(`    ${assigns ? `${assigns} ` : ''}#${step};`);
    prev = now;
  }
  out.push('    $finish;');
  out.push('  end');
  out.push('endmodule');
  out.push('');
  return out.join('\n');
}
