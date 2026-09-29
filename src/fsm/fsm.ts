/**
 * Finite-state machine designer model: Moore and Mealy machines drawn as a
 * state diagram, with transition conditions written as Boolean expressions
 * over the inputs. Pure functions (no React): validation, stepping, the state
 * table, state encodings and Verilog for the DE2 board.
 */
import { SEG7_PATTERNS, sanitizeName } from '../gates/circuit';

export type FsmKind = 'moore' | 'mealy';
export type Encoding = 'binary' | 'gray' | 'onehot';

export interface FsmStateNode {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Moore outputs of this state (missing = 0). */
  out: Record<string, number>;
}

export interface FsmEdge {
  id: string;
  from: string;
  to: string;
  /** Condition over the inputs, e.g. "x & ~y"; "1" (or empty) means always. */
  cond: string;
  /** Mealy outputs while this transition's condition holds (missing = 0). */
  out: Record<string, number>;
  /** Drawing only: how far the arc bows out (0 = straight). */
  bend?: number;
}

export interface FsmDesign {
  name: string;
  kind: FsmKind;
  inputs: string[];
  outputs: string[];
  states: FsmStateNode[];
  edges: FsmEdge[];
  /** State entered on reset. */
  initial: string;
  encoding: Encoding;
}

export const MAX_INPUTS = 4;
export const MAX_OUTPUTS = 6;
export const MAX_STATES = 16;

/* ── Conditions ─────────────────────────────────────────────────────── */

export type Cond =
  | { k: 'const'; v: 0 | 1 }
  | { k: 'var'; name: string }
  | { k: 'not'; a: Cond }
  | { k: 'and' | 'or' | 'xor'; a: Cond; b: Cond };

export class CondError extends Error {
  readonly position: number;
  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

/**
 * Parses a transition condition. Names are the machine's inputs (letters,
 * digits, _). Operators: ~ ! or a trailing ' (NOT), & * (AND), ^ (XOR),
 * | + (OR), parentheses, and the constants 0 and 1. Empty means 1.
 */
export function parseCond(text: string, inputs: string[]): Cond {
  const src = text.trim();
  if (!src) return { k: 'const', v: 1 };
  let i = 0;
  const skip = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const peek = () => { skip(); return src[i]; };
  const fail = (msg: string): never => { throw new CondError(msg, i); };

  const parseOr = (): Cond => {
    let left = parseXor();
    while (peek() === '|' || peek() === '+') {
      i++;
      left = { k: 'or', a: left, b: parseXor() };
    }
    return left;
  };
  const parseXor = (): Cond => {
    let left = parseAnd();
    while (peek() === '^') {
      i++;
      left = { k: 'xor', a: left, b: parseAnd() };
    }
    return left;
  };
  const parseAnd = (): Cond => {
    let left = parseUnary();
    while (peek() === '&' || peek() === '*') {
      i++;
      if (src[i] === '&') i++; // accept &&
      left = { k: 'and', a: left, b: parseUnary() };
    }
    return left;
  };
  const parseUnary = (): Cond => {
    const c = peek();
    if (c === '~' || c === '!') {
      i++;
      return { k: 'not', a: parseUnary() };
    }
    let atom = parseAtom();
    while (src[i] === "'") {
      i++;
      atom = { k: 'not', a: atom };
    }
    return atom;
  };
  const parseAtom = (): Cond => {
    const c = peek();
    if (c === '(') {
      i++;
      const e = parseOr();
      if (peek() !== ')') fail('missing )');
      i++;
      return e;
    }
    const m = /^[A-Za-z_][A-Za-z0-9_]*|^[01]\b|^[01]$/.exec(src.slice(i));
    if (!m) return fail(c === undefined ? 'unexpected end' : `unexpected "${c}"`);
    i += m[0].length;
    if (m[0] === '0' || m[0] === '1') return { k: 'const', v: m[0] === '1' ? 1 : 0 };
    if (!inputs.includes(m[0])) {
      i -= m[0].length;
      fail(`unknown input "${m[0]}"`);
    }
    return { k: 'var', name: m[0] };
  };
  const e = parseOr();
  if (peek() !== undefined) fail(`unexpected "${peek()}"`);
  return e;
}

export function evalCond(c: Cond, env: Record<string, number>): number {
  switch (c.k) {
    case 'const': return c.v;
    case 'var': return env[c.name] ? 1 : 0;
    case 'not': return evalCond(c.a, env) ^ 1;
    case 'and': return evalCond(c.a, env) & evalCond(c.b, env);
    case 'or': return evalCond(c.a, env) | evalCond(c.b, env);
    case 'xor': return evalCond(c.a, env) ^ evalCond(c.b, env);
  }
}

/** Verilog text of a condition (inputs are 1-bit, so ~ is a logical NOT). */
export function condVerilog(c: Cond, names: Record<string, string>): string {
  const wrap = (x: Cond) => (x.k === 'var' || x.k === 'const' || x.k === 'not' ? condVerilog(x, names) : `(${condVerilog(x, names)})`);
  switch (c.k) {
    case 'const': return c.v ? "1'b1" : "1'b0";
    case 'var': return names[c.name] ?? c.name;
    case 'not': return `~${wrap(c.a)}`;
    case 'and': return `${wrap(c.a)} & ${wrap(c.b)}`;
    case 'or': return `${wrap(c.a)} | ${wrap(c.b)}`;
    case 'xor': return `${wrap(c.a)} ^ ${wrap(c.b)}`;
  }
}

/** Input combinations as env objects, first input = most significant bit. */
export function combos(inputs: string[]): Array<Record<string, number>> {
  return Array.from({ length: 1 << inputs.length }, (_, m) =>
    Object.fromEntries(inputs.map((name, i) => [name, (m >> (inputs.length - 1 - i)) & 1])),
  );
}

export const comboText = (env: Record<string, number>, inputs: string[]) => inputs.map((n) => env[n] ?? 0).join('') || '–';

/* ── Validation and stepping ────────────────────────────────────────── */

export interface Analysis {
  /** Condition parse errors by edge id. */
  errors: Record<string, string>;
  /** Per state: input combinations no transition covers (the machine stays put). */
  uncovered: Record<string, string[]>;
  /** Per state: input combinations more than one transition covers (the first one wins). */
  overlapping: Record<string, string[]>;
  /** States that cannot be reached from the initial state. */
  unreachable: string[];
}

function parsedEdges(d: FsmDesign): Map<string, Cond | null> {
  const out = new Map<string, Cond | null>();
  for (const e of d.edges) {
    try {
      out.set(e.id, parseCond(e.cond, d.inputs));
    } catch {
      out.set(e.id, null);
    }
  }
  return out;
}

export function analyze(d: FsmDesign): Analysis {
  const errors: Record<string, string> = {};
  for (const e of d.edges) {
    try {
      parseCond(e.cond, d.inputs);
    } catch (err) {
      errors[e.id] = (err as Error).message;
    }
  }
  const parsed = parsedEdges(d);
  const uncovered: Record<string, string[]> = {};
  const overlapping: Record<string, string[]> = {};
  for (const s of d.states) {
    const out = d.edges.filter((e) => e.from === s.id && parsed.get(e.id));
    for (const env of combos(d.inputs)) {
      const hits = out.filter((e) => evalCond(parsed.get(e.id)!, env)).length;
      const text = comboText(env, d.inputs);
      if (hits === 0) (uncovered[s.id] ??= []).push(text);
      if (hits > 1) (overlapping[s.id] ??= []).push(text);
    }
  }
  const seen = new Set<string>();
  const stack = d.states.some((s) => s.id === d.initial) ? [d.initial] : [];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    d.edges.filter((e) => e.from === id && parsed.get(e.id)).forEach((e) => stack.push(e.to));
  }
  return { errors, uncovered, overlapping, unreachable: d.states.filter((s) => !seen.has(s.id)).map((s) => s.id) };
}

export interface StepResult {
  next: string;
  /** Outputs during this step (Moore: of the current state; Mealy: of the transition taken). */
  outputs: Record<string, number>;
  edge: string | null;
}

/** What the machine does in state `state` with these inputs: first matching transition wins, none means stay. */
export function step(d: FsmDesign, state: string, env: Record<string, number>): StepResult {
  const parsed = parsedEdges(d);
  const edge = d.edges.find((e) => e.from === state && parsed.get(e.id) && evalCond(parsed.get(e.id)!, env)) ?? null;
  const zero = Object.fromEntries(d.outputs.map((o) => [o, 0]));
  const src = d.kind === 'moore' ? d.states.find((s) => s.id === state)?.out : edge?.out;
  return { next: edge ? edge.to : state, outputs: { ...zero, ...pick(src, d.outputs) }, edge: edge?.id ?? null };
}

function pick(obj: Record<string, number> | undefined, keys: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = obj?.[k] ? 1 : 0;
  return out;
}

/* ── Encoding and the state table ───────────────────────────────────── */

export function stateBits(d: FsmDesign): number {
  const n = Math.max(1, d.states.length);
  return d.encoding === 'onehot' ? n : Math.max(1, Math.ceil(Math.log2(n)));
}

/** Code of every state (by id), in the order the states are listed. */
export function stateCodes(d: FsmDesign): Record<string, number> {
  const out: Record<string, number> = {};
  d.states.forEach((s, i) => {
    out[s.id] = d.encoding === 'onehot' ? 1 << i : d.encoding === 'gray' ? i ^ (i >> 1) : i;
  });
  return out;
}

export const codeText = (v: number, bits: number) => v.toString(2).padStart(bits, '0');

export interface TableRow {
  state: string;
  input: string;
  next: string;
  outputs: number[];
  /** True when no transition covers this combination (the machine stays). */
  implicit: boolean;
}

/** The state table: one row per state and input combination. */
export function stateTable(d: FsmDesign): TableRow[] {
  const rows: TableRow[] = [];
  const parsed = parsedEdges(d);
  for (const s of d.states) {
    for (const env of combos(d.inputs)) {
      const r = step(d, s.id, env);
      const covered = d.edges.some((e) => e.from === s.id && parsed.get(e.id) && evalCond(parsed.get(e.id)!, env));
      rows.push({ state: s.id, input: comboText(env, d.inputs), next: r.next, outputs: d.outputs.map((o) => r.outputs[o] ?? 0), implicit: !covered });
    }
  }
  return rows;
}

/* ── Verilog ────────────────────────────────────────────────────────── */

export type ClockSource = 'CLOCK_50' | 'KEY1';

export interface VerilogOptions {
  /** DE2 board ports: inputs on SW, outputs on LEDR, state on LEDG and HEX0, reset on KEY0. */
  de2?: boolean;
  /** DE2: which signal clocks the machine. */
  clock?: ClockSource;
}

export function toVerilog(d: FsmDesign, opts: VerilogOptions = {}): string {
  const used = new Set<string>(['clk', 'reset', 'state', 'next_state']);
  const unique = (base: string) => {
    let n = base;
    let k = 2;
    while (used.has(n)) n = `${base}_${k++}`;
    used.add(n);
    return n;
  };
  const inName: Record<string, string> = {};
  d.inputs.forEach((x, i) => { inName[x] = unique(sanitizeName(x, `in${i}`)); });
  const outName: Record<string, string> = {};
  d.outputs.forEach((x, i) => { outName[x] = unique(sanitizeName(x, `out${i}`)); });
  const stName: Record<string, string> = {};
  d.states.forEach((s, i) => { stName[s.id] = unique(sanitizeName(s.name, `S${i}`).toUpperCase()); });

  const bits = stateBits(d);
  const codes = stateCodes(d);
  const vec = bits > 1 ? `[${bits - 1}:0] ` : '';
  const lit = (v: number) => (d.encoding === 'onehot' ? `${bits}'b${codeText(v, bits)}` : `${bits}'d${v}`);
  const init = d.states.find((s) => s.id === d.initial) ?? d.states[0];
  const parsed = parsedEdges(d);
  const mod = sanitizeName(d.name, 'fsm') + (opts.de2 ? '_de2' : '');
  const de2 = !!opts.de2;
  const clock = opts.clock ?? 'KEY1';

  const lines: string[] = [];
  lines.push('// Generated by the Logic Lab FSM designer');
  lines.push(`// ${d.kind === 'moore' ? 'Moore' : 'Mealy'} machine, ${d.states.length} states, ${d.encoding === 'onehot' ? 'one-hot' : d.encoding} encoding`);
  if (de2) {
    lines.push('// DE2 board mapping:');
    lines.push(clock === 'KEY1' ? '//   KEY1 = clock (one step per press)' : '//   CLOCK_50 = clock (use Run or Clock step on the board)');
    lines.push('//   KEY0 = reset (hold to go back to the initial state)');
    d.inputs.forEach((x, i) => lines.push(`//   SW${i} = ${x}`));
    d.outputs.forEach((x, i) => lines.push(`//   LEDR${i} = ${x}`));
    lines.push(`//   LEDG${bits > 1 ? `${Math.min(bits, 9) - 1}..LEDG0` : '0'} = state code, HEX0 = state number`);
  }
  const ports: string[] = [];
  if (de2) {
    ports.push(`    input  logic ${clock === 'KEY1' ? 'KEY1' : 'CLOCK_50'}`, '    input  logic KEY0');
    d.inputs.forEach((_, i) => ports.push(`    input  logic SW${i}`));
    d.outputs.forEach((_, i) => ports.push(`    output logic LEDR${i}`));
    for (let i = 0; i < Math.min(bits, 9); i++) ports.push(`    output logic LEDG${i}`);
    ports.push('    output logic [6:0] HEX0');
  } else {
    ports.push('    input  logic clk', '    input  logic reset');
    d.inputs.forEach((x) => ports.push(`    input  logic ${inName[x]}`));
    d.outputs.forEach((x) => ports.push(`    output logic ${outName[x]}`));
  }
  lines.push(`module ${mod} (`, ports.join(',\n'), ');', '');
  if (!de2) lines.push('    // reset is synchronous and active-high: it returns the machine to its initial state', '');

  if (de2) {
    lines.push('    logic clk, reset;');
    lines.push(clock === 'KEY1' ? '    assign clk = ~KEY1;    // DE2 keys are active-low: pressing is a rising edge here' : '    assign clk = CLOCK_50;');
    lines.push('    assign reset = ~KEY0;  // hold KEY0 to reset');
    if (d.inputs.length) {
      lines.push(`    logic ${d.inputs.map((x) => inName[x]).join(', ')};`);
      d.inputs.forEach((x, i) => lines.push(`    assign ${inName[x]} = SW${i};`));
    }
    if (d.outputs.length) lines.push(`    logic ${d.outputs.map((x) => outName[x]).join(', ')};`);
    lines.push('');
  }

  d.states.forEach((s) => lines.push(`    localparam ${vec}${stName[s.id]} = ${lit(codes[s.id])};`));
  lines.push('', `    logic ${vec}state, next_state;`, '');

  lines.push('    // State register');
  lines.push('    always_ff @(posedge clk) begin');
  lines.push('        if (reset) begin', `            state <= ${init ? stName[init.id] : lit(0)};`, '        end else begin', '            state <= next_state;', '        end');
  lines.push('    end', '');

  const caseBody = (make: (e: FsmEdge) => string[], skipQuiet = false) => {
    const out: string[] = [];
    for (const s of d.states) {
      const edges = d.edges.filter((e) => e.from === s.id && parsed.get(e.id));
      const cut = edges.findIndex((e) => { const c = parsed.get(e.id)!; return c.k === 'const' && c.v === 1; });
      const used = cut >= 0 ? edges.slice(0, cut + 1) : edges;
      // Mealy outputs: a state none of whose transitions sets an output needs no branch.
      if (skipQuiet && used.every((e) => make(e).length === 0)) continue;
      // Transitions after an unconditional one can never be taken.
      out.push(`            ${stName[s.id]}: begin`, ...branchLines(used, make), '            end');
    }
    return out;
  };
  const branchLines = (edges: FsmEdge[], make: (e: FsmEdge) => string[]) => {
    const out: string[] = [];
    edges.forEach((e, k) => {
      const c = parsed.get(e.id)!;
      const always = c.k === 'const' && c.v === 1;
      if (always && k === 0) {
        make(e).forEach((l) => out.push(`                ${l}`));
        return;
      }
      out.push(`                ${k === 0 ? 'if' : always ? 'end else' : 'end else if'}${always ? ' begin' : ` (${condVerilog(c, inName)}) begin`}`);
      make(e).forEach((l) => out.push(`                    ${l}`));
      if (k === edges.length - 1) out.push('                end');
    });
    return out;
  };

  lines.push('    // Next state: the first transition whose condition holds; otherwise stay');
  lines.push('    always_comb begin', '        next_state = state;', '        case (state)');
  lines.push(...caseBody((e) => [`next_state = ${stName[e.to]};`]));
  lines.push(`            default: next_state = ${init ? stName[init.id] : lit(0)};`, '        endcase', '    end', '');

  if (d.outputs.length) {
    if (d.kind === 'moore') {
      lines.push('    // Outputs (Moore): depend on the state only');
      for (const o of d.outputs) {
        const on = d.states.filter((s) => s.out[o]);
        lines.push(`    assign ${outName[o]} = ${on.length ? on.map((s) => `(state == ${stName[s.id]})`).join(' | ') : "1'b0"};`);
      }
    } else {
      lines.push('    // Outputs (Mealy): depend on the state and the inputs');
      lines.push('    always_comb begin');
      d.outputs.forEach((o) => lines.push(`        ${outName[o]} = 1'b0;`));
      lines.push('        case (state)');
      lines.push(...caseBody((e) => d.outputs.filter((o) => e.out[o]).map((o) => `${outName[o]} = 1'b1;`), true));
      lines.push('            default: begin', '            end', '        endcase', '    end');
    }
    lines.push('');
  }

  if (de2) {
    d.outputs.forEach((o, i) => lines.push(`    assign LEDR${i} = ${outName[o]};`));
    for (let i = 0; i < Math.min(bits, 9); i++) lines.push(`    assign LEDG${i} = ${bits > 1 ? `state[${i}]` : 'state'};`);
    lines.push('', '    // HEX0: number of the current state (0, 1, 2 …), active-low segments');
    lines.push('    always_comb begin', '        case (state)');
    d.states.forEach((s, i) => lines.push(`            ${stName[s.id]}: HEX0 = 7'b${SEG7_PATTERNS[i % 16].toString(2).padStart(7, '0')};`));
    lines.push("            default: HEX0 = 7'b1111111;", '        endcase', '    end', '');
  }
  lines.push('endmodule', '');
  return lines.join('\n');
}

/* ── Examples ───────────────────────────────────────────────────────── */

const st = (id: string, name: string, x: number, y: number, out: Record<string, number> = {}): FsmStateNode => ({ id, name, x, y, out });
const ed = (id: string, from: string, to: string, cond: string, out: Record<string, number> = {}, bend?: number): FsmEdge => ({ id, from, to, cond, out, ...(bend !== undefined ? { bend } : {}) });

export const FSM_PRESETS: Record<string, { title: { en: string; tr: string }; design: FsmDesign }> = {
  seq1011: {
    title: { en: 'Sequence detector 1011 (Mealy)', tr: '1011 dizi dedektörü (Mealy)' },
    design: {
      name: 'detect_1011', kind: 'mealy', inputs: ['x'], outputs: ['z'], encoding: 'binary', initial: 's0',
      states: [st('s0', 'S0', 140, 200), st('s1', 'S1', 340, 200), st('s2', 'S2', 540, 200), st('s3', 'S3', 740, 200)],
      edges: [
        ed('e1', 's0', 's1', 'x'), ed('e2', 's0', 's0', '~x'),
        ed('e3', 's1', 's2', '~x'), ed('e4', 's1', 's1', 'x'),
        ed('e5', 's2', 's3', 'x'), ed('e6', 's2', 's0', '~x', {}, 0.35),
        ed('e7', 's3', 's1', 'x', { z: 1 }, -0.35), ed('e8', 's3', 's2', '~x', {}, 0.3),
      ],
    },
  },
  traffic: {
    title: { en: 'Traffic light (Moore)', tr: 'Trafik ışığı (Moore)' },
    design: {
      name: 'traffic_light', kind: 'moore', inputs: ['t'], outputs: ['red', 'yellow', 'green'], encoding: 'binary', initial: 'r',
      states: [
        st('r', 'RED', 200, 120, { red: 1 }), st('ry', 'RED_YELLOW', 520, 120, { red: 1, yellow: 1 }),
        st('g', 'GREEN', 520, 340, { green: 1 }), st('y', 'YELLOW', 200, 340, { yellow: 1 }),
      ],
      edges: [ed('a', 'r', 'ry', 't'), ed('b', 'ry', 'g', 't'), ed('c', 'g', 'y', 't'), ed('d', 'y', 'r', 't')],
    },
  },
  updown: {
    title: { en: '2-bit up/down counter (Moore)', tr: '2 bit yukarı/aşağı sayıcı (Moore)' },
    design: {
      name: 'updown2', kind: 'moore', inputs: ['up'], outputs: ['q1', 'q0'], encoding: 'binary', initial: 'c0',
      states: [st('c0', 'C0', 200, 120), st('c1', 'C1', 500, 120, { q0: 1 }), st('c2', 'C2', 500, 360, { q1: 1 }), st('c3', 'C3', 200, 360, { q1: 1, q0: 1 })],
      edges: [
        ed('u0', 'c0', 'c1', 'up', {}, 0.2), ed('u1', 'c1', 'c2', 'up', {}, 0.2), ed('u2', 'c2', 'c3', 'up', {}, 0.2), ed('u3', 'c3', 'c0', 'up', {}, 0.2),
        ed('d0', 'c0', 'c3', '~up', {}, 0.2), ed('d1', 'c1', 'c0', '~up', {}, 0.2), ed('d2', 'c2', 'c1', '~up', {}, 0.2), ed('d3', 'c3', 'c2', '~up', {}, 0.2),
      ],
    },
  },
};

export function emptyDesign(): FsmDesign {
  return {
    name: 'my_fsm', kind: 'moore', inputs: ['x'], outputs: ['z'], encoding: 'binary', initial: 's0',
    states: [st('s0', 'S0', 220, 220), st('s1', 'S1', 520, 220, { z: 1 })],
    edges: [ed('e1', 's0', 's1', 'x'), ed('e2', 's1', 's0', '~x')],
  };
}

/** Accepts a stored or opened design only when its shape is right. */
export function isDesign(v: unknown): v is FsmDesign {
  const d = v as FsmDesign;
  return !!d && typeof d === 'object' && (d.kind === 'moore' || d.kind === 'mealy') && Array.isArray(d.inputs) && Array.isArray(d.outputs) && Array.isArray(d.states) && Array.isArray(d.edges) && typeof d.initial === 'string';
}
