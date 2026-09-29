/**
 * Gate-level circuit model for the drawing editor: evaluation (with
 * flip-flop state and clock edges), unit-delay timing simulation (for
 * glitches), truth tables and Verilog generation. Pure functions, no React.
 *
 * Every part has numbered input pins and numbered output pins. A signal is
 * one output pin of one node; its key is the node id for pin 0 and
 * `id#pin` for the others (see `sig`).
 */

export type GateType =
  // sources and sinks
  | 'IN' | 'OUT' | 'LED' | 'BTN' | 'CLK' | 'CONST0' | 'CONST1' | 'SEG7'
  // gates
  | 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'BUF'
  // plexers
  | 'MUX2' | 'MUX4' | 'DEMUX2' | 'DEMUX4' | 'DEC2' | 'DEC3' | 'BITSEL' | 'PENC4'
  // arithmetic
  | 'HA' | 'FA' | 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'SHIFT' | 'CMP' | 'NEG' | 'SEXT' | 'BITCNT'
  // flip-flops (rising edge)
  | 'DFF' | 'TFF' | 'JKFF' | 'SRFF';

export interface GateNode {
  id: string;
  type: GateType;
  x: number;
  y: number;
  /** Signal name for IN/OUT/BTN/CLK/SEG7; optional note for others. */
  label: string;
  /** Propagation delay in time units (glitch view). */
  delay: number;
  /** Number of inputs for AND/OR/NAND/NOR/XOR/XNOR (2–4, default 2). */
  inputs?: number;
  /** Bit width of the arithmetic blocks (1–4, default 4; barrel shifter 2–4). */
  bits?: number;
  /** Barrel shifter direction (default left). */
  dir?: 'left' | 'right';
}

export interface Wire {
  id: string;
  from: string;
  /** Output pin of the source node (default 0). */
  fromPin?: number;
  to: string;
  pin: number;
  /**
   * Hand-drawn route (drawing only, no effect on logic): alternating x and y
   * coordinates of the bends, starting and ending with an x — the x values
   * are vertical segments, the y values horizontal ones.
   */
  bends?: number[];
}

export interface Circuit {
  nodes: GateNode[];
  wires: Wire[];
}

export type PartCategory = 'io' | 'logic' | 'plexers' | 'arithmetic' | 'flipflops';

interface PartSpec {
  category: PartCategory;
  ins: string[];
  outs: string[];
  /** Input pin that is the clock (flip-flops). */
  clock?: number;
}

const FF_OUTS = ['Q', 'Q̅'];

export const PARTS: Record<GateType, PartSpec> = {
  IN: { category: 'io', ins: [], outs: [''] },
  OUT: { category: 'io', ins: [''], outs: [] },
  LED: { category: 'io', ins: [''], outs: [] },
  BTN: { category: 'io', ins: [], outs: [''] },
  CLK: { category: 'io', ins: [], outs: [''] },
  CONST0: { category: 'io', ins: [], outs: [''] },
  CONST1: { category: 'io', ins: [], outs: [''] },
  SEG7: { category: 'io', ins: ['b0', 'b1', 'b2', 'b3'], outs: [] },
  AND: { category: 'logic', ins: ['', ''], outs: [''] },
  OR: { category: 'logic', ins: ['', ''], outs: [''] },
  NOT: { category: 'logic', ins: [''], outs: [''] },
  NAND: { category: 'logic', ins: ['', ''], outs: [''] },
  NOR: { category: 'logic', ins: ['', ''], outs: [''] },
  XOR: { category: 'logic', ins: ['', ''], outs: [''] },
  XNOR: { category: 'logic', ins: ['', ''], outs: [''] },
  BUF: { category: 'logic', ins: [''], outs: [''] },
  MUX2: { category: 'plexers', ins: ['D0', 'D1', 'S'], outs: ['Y'] },
  MUX4: { category: 'plexers', ins: ['D0', 'D1', 'D2', 'D3', 'S0', 'S1'], outs: ['Y'] },
  DEMUX2: { category: 'plexers', ins: ['D', 'S'], outs: ['Y0', 'Y1'] },
  DEMUX4: { category: 'plexers', ins: ['D', 'S0', 'S1'], outs: ['Y0', 'Y1', 'Y2', 'Y3'] },
  DEC2: { category: 'plexers', ins: ['A0', 'A1'], outs: ['Y0', 'Y1', 'Y2', 'Y3'] },
  DEC3: { category: 'plexers', ins: ['A0', 'A1', 'A2'], outs: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'] },
  BITSEL: { category: 'plexers', ins: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'S0', 'S1', 'S2'], outs: ['Y'] },
  PENC4: { category: 'plexers', ins: ['I0', 'I1', 'I2', 'I3'], outs: ['Q0', 'Q1', 'V'] },
  HA: { category: 'arithmetic', ins: ['A', 'B'], outs: ['S', 'C'] },
  FA: { category: 'arithmetic', ins: ['A', 'B', 'Cin'], outs: ['S', 'Cout'] },
  // Multi-bit blocks: pins depend on the width (see arithPins); these are the 4-bit ones.
  ADD: { category: 'arithmetic', ins: [], outs: [] },
  SUB: { category: 'arithmetic', ins: [], outs: [] },
  MUL: { category: 'arithmetic', ins: [], outs: [] },
  DIV: { category: 'arithmetic', ins: [], outs: [] },
  SHIFT: { category: 'arithmetic', ins: [], outs: [] },
  CMP: { category: 'arithmetic', ins: [], outs: [] },
  NEG: { category: 'arithmetic', ins: [], outs: [] },
  SEXT: { category: 'arithmetic', ins: [], outs: [] },
  BITCNT: { category: 'arithmetic', ins: [], outs: [] },
  DFF: { category: 'flipflops', ins: ['D', 'C'], outs: FF_OUTS, clock: 1 },
  TFF: { category: 'flipflops', ins: ['T', 'C'], outs: FF_OUTS, clock: 1 },
  JKFF: { category: 'flipflops', ins: ['J', 'C', 'K'], outs: FF_OUTS, clock: 1 },
  SRFF: { category: 'flipflops', ins: ['S', 'C', 'R'], outs: FF_OUTS, clock: 1 },
};

/** Two-input gates whose input count can be raised to 4. */
export const MULTI_INPUT: GateType[] = ['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'];
export const GATE_TYPES: GateType[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'BUF'];
export const FLIP_FLOPS: GateType[] = ['DFF', 'TFF', 'JKFF', 'SRFF'];
/** Nodes whose value the user sets (inputs of the circuit). */
export const SOURCES: GateType[] = ['IN', 'BTN', 'CLK'];
/** Nodes that show a result (outputs of the circuit). */
export const SINKS: GateType[] = ['OUT', 'LED'];

export const PALETTE: Array<{ category: PartCategory; types: GateType[] }> = [
  { category: 'logic', types: GATE_TYPES },
  { category: 'io', types: ['OUT', 'LED', 'IN', 'CLK', 'BTN', 'CONST0', 'CONST1', 'SEG7'] },
  { category: 'plexers', types: ['MUX2', 'MUX4', 'DEMUX2', 'DEMUX4', 'DEC2', 'DEC3', 'BITSEL', 'PENC4'] },
  { category: 'arithmetic', types: ['HA', 'FA', 'ADD', 'SUB', 'MUL', 'DIV', 'SHIFT', 'CMP', 'NEG', 'SEXT', 'BITCNT'] },
  { category: 'flipflops', types: FLIP_FLOPS },
];

export function isFlipFlop(type: GateType): boolean {
  return FLIP_FLOPS.includes(type);
}

export function isGate(type: GateType): boolean {
  return GATE_TYPES.includes(type);
}

/** Multi-bit arithmetic blocks (Digital's Arithmetic menu). */
export const ARITH: GateType[] = ['ADD', 'SUB', 'MUL', 'DIV', 'SHIFT', 'CMP', 'NEG', 'SEXT', 'BITCNT'];

type Shape = Pick<GateNode, 'type'> & Partial<Pick<GateNode, 'inputs' | 'bits' | 'dir'>>;

export function bitWidth(n: Shape): number {
  return Math.max(n.type === 'SHIFT' ? 2 : 1, Math.min(4, n.bits ?? 4));
}
const bus = (name: string, k: number) => Array.from({ length: k }, (_, i) => `${name}${i}`);
const shiftBits = (k: number) => Math.max(1, Math.ceil(Math.log2(k)));
const countBits = (k: number) => Math.ceil(Math.log2(k + 1));

/** Input and output pin names of an arithmetic block, least significant bit first. */
export function arithPins(n: Shape): { ins: string[]; outs: string[] } {
  const k = bitWidth(n);
  switch (n.type) {
    case 'ADD': return { ins: [...bus('A', k), ...bus('B', k), 'Cin'], outs: [...bus('S', k), 'Cout'] };
    case 'SUB': return { ins: [...bus('A', k), ...bus('B', k), 'Bin'], outs: [...bus('D', k), 'Bout'] };
    case 'MUL': return { ins: [...bus('A', k), ...bus('B', k)], outs: bus('P', 2 * k) };
    case 'DIV': return { ins: [...bus('A', k), ...bus('B', k)], outs: [...bus('Q', k), ...bus('R', k)] };
    case 'SHIFT': return { ins: [...bus('D', k), ...bus('S', shiftBits(k))], outs: bus('Y', k) };
    case 'CMP': return { ins: [...bus('A', k), ...bus('B', k)], outs: ['GT', 'EQ', 'LT'] };
    case 'NEG': return { ins: bus('D', k), outs: bus('Y', k) };
    case 'SEXT': return { ins: bus('D', k), outs: bus('Y', 2 * k) };
    case 'BITCNT': return { ins: bus('D', k), outs: bus('C', countBits(k)) };
    default: return { ins: [], outs: [] };
  }
}

export function inputNames(n: Shape): string[] {
  if (MULTI_INPUT.includes(n.type)) {
    const k = Math.max(2, Math.min(4, n.inputs ?? 2));
    return Array(k).fill('');
  }
  if (ARITH.includes(n.type)) return arithPins(n).ins;
  return PARTS[n.type].ins;
}

export function outputNames(n: Shape): string[] {
  if (ARITH.includes(n.type)) return arithPins(n).outs;
  return PARTS[n.type].outs;
}

const pack = (bits: number[], from: number, k: number) => bits.slice(from, from + k).reduce((v, b, i) => v | ((b & 1) << i), 0);
const unpack = (v: number, k: number) => Array.from({ length: k }, (_, i) => (v >> i) & 1);

/** Values of an arithmetic block (unsigned; divide by zero gives Q = 0, R = A). */
function arithValue(n: GateNode, ins: number[]): number[] {
  const k = bitWidth(n);
  const mask = (1 << k) - 1;
  const A = pack(ins, 0, k);
  const B = pack(ins, k, k);
  switch (n.type) {
    case 'ADD': return unpack(A + B + (ins[2 * k] ?? 0), k + 1);
    case 'SUB': {
      const d = A - B - (ins[2 * k] ?? 0);
      return [...unpack(d & mask, k), d < 0 ? 1 : 0];
    }
    case 'MUL': return unpack(A * B, 2 * k);
    case 'DIV': return [...unpack(B ? Math.floor(A / B) : 0, k), ...unpack(B ? A % B : A, k)];
    case 'SHIFT': {
      const sh = pack(ins, k, shiftBits(k));
      return unpack((n.dir === 'right' ? A >> sh : A << sh) & mask, k);
    }
    case 'CMP': return [A > B ? 1 : 0, A === B ? 1 : 0, A < B ? 1 : 0];
    case 'NEG': return unpack(-A & mask, k);
    case 'SEXT': return [...unpack(A, k), ...Array(k).fill((A >> (k - 1)) & 1)];
    case 'BITCNT': return unpack(unpack(A, k).reduce((x, y) => x + y, 0), countBits(k));
    default: return [];
  }
}

/** Number of input pins (accepts a node, or a type for the default count). */
export function inputCount(n: GateType | Pick<GateNode, 'type' | 'inputs'>): number {
  return inputNames(typeof n === 'string' ? { type: n } : n).length;
}

export function outputCount(n: GateType | Pick<GateNode, 'type'>): number {
  return outputNames(typeof n === 'string' ? { type: n } : n).length;
}

export function hasOutput(type: GateType): boolean {
  return outputCount(type) > 0;
}

/** Signal key of one output pin. */
export function sig(id: string, pin = 0): string {
  return pin ? `${id}#${pin}` : id;
}

/** Two-input gate function (kept for callers of the old API). */
export function applyGate(type: GateType, a: number, b: number): number {
  return gateValue(type, [a, b]);
}

function gateValue(type: GateType, ins: number[]): number {
  const and = ins.every((v) => v === 1) ? 1 : 0;
  const or = ins.some((v) => v === 1) ? 1 : 0;
  const xor = ins.reduce((x, v) => x ^ (v & 1), 0);
  switch (type) {
    case 'AND': return and;
    case 'OR': return or;
    case 'NAND': return and ^ 1;
    case 'NOR': return or ^ 1;
    case 'XOR': return xor;
    case 'XNOR': return xor ^ 1;
    case 'NOT': return (ins[0] ?? 0) ^ 1;
    default: return ins[0] ?? 0;
  }
}

/** Seven-segment patterns for 0–F, DE2 style: bit i = segment a..g, 0 = lit. */
export const SEG7_PATTERNS = [
  0b1000000, 0b1111001, 0b0100100, 0b0110000, 0b0011001, 0b0010010, 0b0000010, 0b1111000,
  0b0000000, 0b0010000, 0b0001000, 0b0000011, 0b1000110, 0b0100001, 0b0000110, 0b0001110,
];

/** Output values of a node for the given input values (flip-flops: current state). */
export function computeNode(n: GateNode, ins: number[], q = 0, sourceValue = 0): number[] {
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = ins;
  switch (n.type) {
    case 'IN':
    case 'BTN':
    case 'CLK': return [sourceValue ? 1 : 0];
    case 'CONST0': return [0];
    case 'CONST1': return [1];
    case 'OUT':
    case 'LED':
    case 'SEG7': return [];
    case 'MUX2': return [c ? b : a];
    case 'MUX4': return [[a, b, c, d][(f << 1) | e]];
    case 'DEMUX2': return [b ? 0 : a, b ? a : 0];
    case 'DEMUX4': {
      const k = (c << 1) | b;
      return [0, 1, 2, 3].map((i) => (i === k ? a : 0));
    }
    case 'DEC2': {
      const k = (b << 1) | a;
      return [0, 1, 2, 3].map((i) => (i === k ? 1 : 0));
    }
    case 'DEC3': {
      const k = (c << 2) | (b << 1) | a;
      return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i === k ? 1 : 0));
    }
    case 'BITSEL': return [ins[((ins[10] ?? 0) << 2) | ((ins[9] ?? 0) << 1) | (ins[8] ?? 0)] ?? 0];
    case 'PENC4': {
      // Highest set input wins; V = any input set.
      const k = d ? 3 : c ? 2 : b ? 1 : 0;
      const any = a | b | c | d;
      return [any ? k & 1 : 0, any ? k >> 1 : 0, any];
    }
    case 'HA': return [a ^ b, a & b];
    case 'FA': return [a ^ b ^ c, (a & b) | (c & (a ^ b))];
    case 'ADD':
    case 'SUB':
    case 'MUL':
    case 'DIV':
    case 'SHIFT':
    case 'CMP':
    case 'NEG':
    case 'SEXT':
    case 'BITCNT': return arithValue(n, ins);
    case 'DFF':
    case 'TFF':
    case 'JKFF':
    case 'SRFF': return [q, q ^ 1];
    default: return [gateValue(n.type, ins)];
  }
}

/** Flip-flop state after a rising clock edge, from the inputs just before it. */
export function nextState(n: GateNode, ins: number[], q: number): number {
  const [x = 0, , y = 0] = ins;
  switch (n.type) {
    case 'DFF': return x;
    case 'TFF': return x ? q ^ 1 : q;
    case 'JKFF': return x && y ? q ^ 1 : x ? 1 : y ? 0 : q;
    // S = R = 1 is not allowed on a real SR flip-flop; here S wins.
    case 'SRFF': return x ? 1 : y ? 0 : q;
    default: return q;
  }
}

export function driverOf(c: Circuit, nodeId: string, pin: number): string | null {
  return c.wires.find((w) => w.to === nodeId && w.pin === pin)?.from ?? null;
}

/** The wire feeding an input pin, if any. */
export function wireInto(c: Circuit, nodeId: string, pin: number): Wire | undefined {
  return c.wires.find((w) => w.to === nodeId && w.pin === pin);
}

export interface Evaluation {
  /** Value of every signal (see `sig`). */
  values: Record<string, number>;
  /** Nodes on a combinational loop, if any (then values are not meaningful). */
  loop: string[];
  /** Inputs with nothing connected (read as 0). */
  floating: Array<{ node: string; pin: number }>;
  /** Input pin values of every node. */
  pins: Record<string, number[]>;
}

/**
 * Settles the combinational logic. `inputs` holds the value of each source
 * node (IN, BTN, CLK) by id; `q` the stored bit of each flip-flop.
 * Flip-flop outputs come from their state, so feedback through a flip-flop
 * is not a loop.
 */
export function evaluate(c: Circuit, inputs: Record<string, number>, q: Record<string, number> = {}): Evaluation {
  const byId = new Map(c.nodes.map((n) => [n.id, n]));
  const into = new Map<string, Wire>();
  c.wires.forEach((w) => into.set(`${w.to}:${w.pin}`, w));
  const outs: Record<string, number[]> = {};
  const state: Record<string, 0 | 1 | 2> = {};
  const loop = new Set<string>();
  const floating: Array<{ node: string; pin: number }> = [];

  const readPin = (id: string, pin: number, stack: string[]): number => {
    const w = into.get(`${id}:${pin}`);
    if (!w || !byId.has(w.from)) {
      floating.push({ node: id, pin });
      return 0;
    }
    return visit(w.from, stack)[w.fromPin ?? 0] ?? 0;
  };

  const visit = (id: string, stack: string[]): number[] => {
    const n = byId.get(id)!;
    if (state[id] === 2) return outs[id];
    if (state[id] === 1) {
      stack.slice(stack.indexOf(id)).forEach((x) => loop.add(x));
      return outputNames(n).map(() => 0);
    }
    state[id] = 1;
    let v: number[];
    if (isFlipFlop(n.type)) v = computeNode(n, [], q[id] ?? 0);
    else {
      const ins = inputNames(n).map((_, pin) => readPin(id, pin, [...stack, id]));
      v = computeNode(n, ins, 0, inputs[id]);
      outs[`${id}@in`] = ins;
    }
    state[id] = 2;
    outs[id] = v;
    return v;
  };
  c.nodes.forEach((n) => visit(n.id, []));
  // Flip-flop inputs are read after the settle (they do not feed back).
  c.nodes.filter((n) => isFlipFlop(n.type)).forEach((n) => {
    outs[`${n.id}@in`] = inputNames(n).map((_, pin) => readPin(n.id, pin, [n.id]));
  });

  const values: Record<string, number> = {};
  for (const n of c.nodes) {
    const o = outs[n.id] ?? [];
    o.forEach((v, pin) => { values[sig(n.id, pin)] = v; });
    // OUT and SEG7 show their inputs.
    if (SINKS.includes(n.type)) values[n.id] = outs[`${n.id}@in`]?.[0] ?? 0;
    if (n.type === 'SEG7') {
      const b = outs[`${n.id}@in`] ?? [];
      values[n.id] = (b[0] ?? 0) | ((b[1] ?? 0) << 1) | ((b[2] ?? 0) << 2) | ((b[3] ?? 0) << 3);
    }
  }
  const pins: Record<string, number[]> = {};
  for (const n of c.nodes) pins[n.id] = outs[`${n.id}@in`] ?? [];
  return { values, loop: [...loop], floating: dedupe(floating), pins };
}

function dedupe(list: Array<{ node: string; pin: number }>): Array<{ node: string; pin: number }> {
  const seen = new Set<string>();
  return list.filter((f) => {
    const k = `${f.node}:${f.pin}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}


/* ── Sequential stepping ────────────────────────────────────────────── */

export interface SeqState {
  /** Stored bit of each flip-flop. */
  q: Record<string, number>;
  /** Clock pin level of each flip-flop at the last settle (edge detection). */
  clk: Record<string, number>;
}

export const EMPTY_SEQ: SeqState = { q: {}, clk: {} };

/**
 * Applies `inputs`, then lets every flip-flop whose clock pin went 0 → 1
 * take its next state, repeating while outputs keep clocking other
 * flip-flops (ripple counters). Returns the settled evaluation and state.
 */
export function settle(c: Circuit, inputs: Record<string, number>, seq: SeqState = EMPTY_SEQ): { ev: Evaluation; seq: SeqState } {
  const ffs = c.nodes.filter((n) => isFlipFlop(n.type));
  let q: Record<string, number> = {};
  ffs.forEach((f) => { q[f.id] = seq.q[f.id] ?? 0; });
  const clk: Record<string, number> = { ...seq.clk };
  // A flip-flop seen for the first time takes the clock level of the circuit
  // at rest (every CLK low), so the first clock pulse after adding it counts
  // and flip-flops clocked by other flip-flops do not fire spuriously.
  const unknown = ffs.filter((f) => !(f.id in clk));
  if (unknown.length) {
    const rest = { ...inputs };
    c.nodes.filter((n) => n.type === 'CLK').forEach((n) => { rest[n.id] = 0; });
    const base = evaluate(c, rest, q);
    unknown.forEach((f) => { clk[f.id] = base.pins[f.id]?.[PARTS[f.type].clock!] ?? 0; });
  }
  let ev = evaluate(c, inputs, q);
  for (let iter = 0; iter < 32 && ffs.length; iter++) {
    const pins = ev.pins;
    const next = { ...q };
    let changed = false;
    for (const f of ffs) {
      const ins = pins[f.id] ?? [];
      const level = ins[PARTS[f.type].clock!] ?? 0;
      const prev = clk[f.id];
      clk[f.id] = level;
      if (prev === 0 && level === 1) {
        const nq = nextState(f, ins, q[f.id] ?? 0);
        if (nq !== next[f.id]) {
          next[f.id] = nq;
          changed = true;
        }
      }
    }
    if (!changed) break;
    q = next;
    ev = evaluate(c, inputs, q);
  }
  // Record clock levels that the last evaluation produced.
  const pins = ev.pins;
  for (const f of ffs) clk[f.id] = pins[f.id]?.[PARTS[f.type].clock!] ?? 0;
  return { ev, seq: { q, clk } };
}

/* ── Unit-delay timing simulation ───────────────────────────────────── */

export interface Trace {
  /** Value changes per signal (see `sig`): [time, value] pairs, first at t=0. */
  changes: Record<string, Array<[number, number]>>;
  end: number;
  /** Nodes with an output that changed more than once (a glitch). */
  glitches: string[];
}

/**
 * Starting from the steady state for `before`, apply `after` at t = 0 and let
 * every part update `delay` time units after one of its inputs changes
 * (transport delay). Flip-flops keep the state `q` (no clocking here).
 */
export function simulateTiming(
  c: Circuit,
  before: Record<string, number>,
  after: Record<string, number>,
  maxTime = 60,
  q: Record<string, number> = {},
): Trace {
  const steady = evaluate(c, before, q).values;
  const value: Record<string, number> = { ...steady };
  const changes: Record<string, Array<[number, number]>> = {};
  const byId = new Map(c.nodes.map((n) => [n.id, n]));
  for (const n of c.nodes) {
    if (SINKS.includes(n.type) || n.type === 'SEG7') changes[n.id] = [[0, steady[n.id] ?? 0]];
    outputNames(n).forEach((_, pin) => { changes[sig(n.id, pin)] = [[0, steady[sig(n.id, pin)] ?? 0]]; });
  }
  const fanout = new Map<string, string[]>();
  c.wires.forEach((w) => {
    const k = sig(w.from, w.fromPin ?? 0);
    fanout.set(k, [...(fanout.get(k) ?? []), w.to]);
  });

  const queue = new Map<number, Set<string>>();
  const schedule = (t: number, nid: string) => {
    if (t > maxTime) return;
    if (!queue.has(t)) queue.set(t, new Set());
    queue.get(t)!.add(nid);
  };
  const set = (key: string, v: number, t: number) => {
    if (value[key] === v) return;
    value[key] = v;
    (changes[key] ??= [[0, v]]).push([t, v]);
    for (const dst of fanout.get(key) ?? []) {
      const d = byId.get(dst);
      if (!d) continue;
      schedule(t + (SINKS.includes(d.type) || d.type === 'SEG7' ? 0 : Math.max(1, d.delay)), dst);
    }
  };
  const input = (nid: string, pin: number) => {
    const w = wireInto(c, nid, pin);
    return w ? value[sig(w.from, w.fromPin ?? 0)] ?? 0 : 0;
  };
  const update = (n: GateNode, t: number) => {
    const ins = inputNames(n).map((_, pin) => input(n.id, pin));
    if (SINKS.includes(n.type)) return set(n.id, ins[0] ?? 0, t);
    if (n.type === 'SEG7') return set(n.id, (ins[0] ?? 0) | ((ins[1] ?? 0) << 1) | ((ins[2] ?? 0) << 2) | ((ins[3] ?? 0) << 3), t);
    if (isFlipFlop(n.type)) return;
    computeNode(n, ins, 0, after[n.id]).forEach((v, pin) => set(sig(n.id, pin), v, t));
  };

  let end = 0;
  c.nodes.filter((n) => SOURCES.includes(n.type)).forEach((n) => set(n.id, after[n.id] ? 1 : 0, 0));
  for (let t = 0; t <= maxTime; t++) {
    for (let pass = 0; pass < 2; pass++) {
      const due = queue.get(t);
      if (!due) break;
      queue.delete(t);
      for (const nid of due) {
        update(byId.get(nid)!, t);
        end = Math.max(end, t);
      }
    }
  }
  const glitchy = new Set<string>();
  for (const [key, list] of Object.entries(changes)) {
    const nid = key.split('#')[0];
    const n = byId.get(nid);
    if (n && !SOURCES.includes(n.type) && list.length > 2) glitchy.add(nid);
  }
  return { changes, end: Math.max(end, 1), glitches: [...glitchy] };
}

/** Value of a signal at time t from its change list. */
export function valueAt(list: Array<[number, number]>, t: number): number {
  let v = list[0]?.[1] ?? 0;
  for (const [ct, cv] of list) {
    if (ct <= t) v = cv;
    else break;
  }
  return v;
}

/* ── Truth table and Verilog ────────────────────────────────────────── */

const byPos = (a: GateNode, b: GateNode) => a.y - b.y || a.x - b.x;

/** Inputs (IN, BTN, CLK) and outputs (OUT) ordered top to bottom. */
export function ioNodes(c: Circuit): { ins: GateNode[]; outs: GateNode[]; displays: GateNode[] } {
  return {
    ins: c.nodes.filter((n) => SOURCES.includes(n.type)).sort(byPos),
    outs: c.nodes.filter((n) => SINKS.includes(n.type)).sort(byPos),
    displays: c.nodes.filter((n) => n.type === 'SEG7').sort(byPos),
  };
}

export function isSequential(c: Circuit): boolean {
  return c.nodes.some((n) => isFlipFlop(n.type));
}

export function truthTable(c: Circuit, maxInputs = 6): { ins: GateNode[]; outs: GateNode[]; rows: Array<{ in: number[]; out: number[] }> } | null {
  if (isSequential(c)) return null;
  const { ins, outs, displays } = ioNodes(c);
  const shown = [...outs, ...displays];
  if (ins.length === 0 || ins.length > maxInputs) return null;
  const rows = [];
  for (let combo = 0; combo < 1 << ins.length; combo++) {
    const iv: Record<string, number> = {};
    const bits = ins.map((n, i) => {
      const b = (combo >> (ins.length - 1 - i)) & 1;
      iv[n.id] = b;
      return b;
    });
    const ev = evaluate(c, iv);
    rows.push({ in: bits, out: shown.map((o) => ev.values[o.id] ?? 0) });
  }
  return { ins, outs: shown, rows };
}

const VERILOG_KEYWORDS = new Set(['module', 'endmodule', 'input', 'output', 'wire', 'logic', 'reg', 'assign', 'always', 'always_ff', 'always_comb', 'posedge', 'negedge', 'begin', 'end', 'if', 'else', 'case', 'endcase', 'default', 'and', 'or', 'not', 'xor', 'nand', 'nor', 'xnor', 'buf', 'initial']);

export function sanitizeName(raw: string, fallback: string): string {
  let s = (raw || '').trim().replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => ({ ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' })[ch] ?? ch);
  s = s.replace(/[^A-Za-z0-9_]/g, '_');
  if (!/^[A-Za-z_]/.test(s)) s = `n_${s}`;
  if (!s || s === 'n_' || VERILOG_KEYWORDS.has(s)) s = fallback;
  return s;
}

const NET_PREFIX: Partial<Record<GateType, string>> = {
  ADD: 'add', SUB: 'sub', MUL: 'mul', DIV: 'div', SHIFT: 'shift', CMP: 'cmp', NEG: 'neg', SEXT: 'sext', BITCNT: 'cnt', MUX2: 'mux', MUX4: 'mux', DEMUX2: 'demux', DEMUX4: 'demux', DEC2: 'dec', DEC3: 'dec', BITSEL: 'bitsel', PENC4: 'penc', HA: 'ha', FA: 'fa', DFF: 'dff', TFF: 'tff', JKFF: 'jk', SRFF: 'sr', CONST0: 'c0', CONST1: 'c1',
};

const OUT_SUFFIX: Partial<Record<GateType, string[]>> = {
  MUX2: ['y'], MUX4: ['y'], DEMUX2: ['y0', 'y1'], DEMUX4: ['y0', 'y1', 'y2', 'y3'], DEC2: ['y0', 'y1', 'y2', 'y3'], DEC3: ['y0', 'y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7'], BITSEL: ['y'], PENC4: ['q0', 'q1', 'v'], HA: ['s', 'c'], FA: ['s', 'cout'], DFF: ['q', 'qn'], TFF: ['q', 'qn'], JKFF: ['q', 'qn'], SRFF: ['q', 'qn'],
};

type Mode = 'generic' | 'de2';

interface Built {
  code: string;
  /** Board mapping notes (DE2 mode). */
  notes: string[];
}

function buildVerilog(c: Circuit, moduleName: string, mode: Mode): Built {
  const { ins, outs, displays } = ioNodes(c);
  const names = new Map<string, string>(); // sig -> net name
  const used = new Set<string>();
  const unique = (base: string) => {
    let n = base;
    let k = 2;
    while (used.has(n) || VERILOG_KEYWORDS.has(n)) n = `${base}_${k++}`;
    used.add(n);
    return n;
  };
  const ports: string[] = [];
  const body: string[] = [];
  const notes: string[] = [];

  // Board resources in DE2 mode.
  let sw = 0;
  let key = 0;
  let led = 0;
  let ledg = 0;
  let hex = 0;
  let clockPort: string | null = null;

  for (const [i, n] of ins.entries()) {
    const fallback = n.type === 'CLK' ? 'clk' : n.type === 'BTN' ? `btn${i}` : `in${i}`;
    const label = sanitizeName(n.label, fallback);
    if (mode === 'de2') {
      if (n.type === 'CLK') {
        if (!clockPort) {
          clockPort = unique('CLOCK_50');
          ports.push(`    input  logic ${clockPort}`);
          notes.push(`//   CLOCK_50 = ${label} (use Run or Clock step on the board)`);
        }
        names.set(n.id, clockPort);
      } else if (n.type === 'BTN' && key < 4) {
        const p = unique(`KEY${key}`);
        ports.push(`    input  logic ${p}`);
        const net = unique(label);
        body.push(`    logic ${net};`, `    assign ${net} = ~${p};  // DE2 keys are active-low`);
        notes.push(`//   KEY${key} = ${label} (pressed = 1)`);
        names.set(n.id, net);
        key++;
      } else {
        const p = unique(`SW${sw}`);
        ports.push(`    input  logic ${p}`);
        notes.push(`//   SW${sw}  = ${label}`);
        names.set(n.id, p);
        sw++;
      }
    } else {
      const p = unique(label);
      ports.push(`    input  logic ${p}`);
      names.set(n.id, p);
    }
  }

  const outPorts: Array<{ node: GateNode; port: string }> = [];
  for (const [i, n] of outs.entries()) {
    const label = sanitizeName(n.label, `out${i}`);
    // DE2: outputs on the red LEDs, LED parts on the green ones (LEDG0..8).
    const p = unique(mode === 'de2' ? (n.type === 'LED' && ledg < 9 ? `LEDG${ledg++}` : `LEDR${led++}`) : label);
    if (mode === 'de2') notes.push(`//   ${p} = ${label}`);
    ports.push(`    output logic ${p}`);
    outPorts.push({ node: n, port: p });
  }
  const segPorts: Array<{ node: GateNode; port: string }> = [];
  for (const [i, n] of displays.entries()) {
    const label = sanitizeName(n.label, `hex${i}`);
    const p = unique(mode === 'de2' && hex < 8 ? `HEX${hex++}` : label);
    if (mode === 'de2') notes.push(`//   ${p} = ${label} (7-segment)`);
    ports.push(`    output logic [6:0] ${p}`);
    segPorts.push({ node: n, port: p });
  }

  // Internal nets, left to right.
  const parts = c.nodes.filter((n) => !SOURCES.includes(n.type) && !SINKS.includes(n.type) && n.type !== 'SEG7').sort((a, b) => a.x - b.x || a.y - b.y);
  const counters: Record<string, number> = {};
  for (const n of parts) {
    const prefix = NET_PREFIX[n.type] ?? 'g';
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    const base = `${prefix}${counters[prefix]}`;
    const suffix = OUT_SUFFIX[n.type] ?? (ARITH.includes(n.type) ? outputNames(n).map((x) => x.toLowerCase()) : undefined);
    outputNames(n).forEach((_, pin) => names.set(sig(n.id, pin), unique(suffix ? `${base}_${suffix[pin]}` : base)));
  }

  const src = (nid: string, pin: number) => {
    const w = wireInto(c, nid, pin);
    return w ? names.get(sig(w.from, w.fromPin ?? 0)) ?? "1'b0" : "1'b0";
  };

  const internal = parts.flatMap((n) => outputNames(n).map((_, pin) => names.get(sig(n.id, pin))!));
  if (internal.length) body.push(`    logic ${internal.join(', ')};`);
  body.push('');

  const ops: Partial<Record<GateType, string>> = { AND: ' & ', OR: ' | ', NAND: ' & ', NOR: ' | ', XOR: ' ^ ', XNOR: ' ^ ' };
  for (const n of parts) {
    const net = (pin = 0) => names.get(sig(n.id, pin))!;
    const i = (pin: number) => src(n.id, pin);
    switch (n.type) {
      case 'CONST0': body.push(`    assign ${net()} = 1'b0;`); break;
      case 'CONST1': body.push(`    assign ${net()} = 1'b1;`); break;
      case 'NOT': body.push(`    assign ${net()} = ~${i(0)};  // NOT`); break;
      case 'BUF': body.push(`    assign ${net()} = ${i(0)};  // buffer`); break;
      case 'MUX2': body.push(`    assign ${net()} = ${i(2)} ? ${i(1)} : ${i(0)};  // 2:1 mux`); break;
      case 'MUX4': body.push(`    assign ${net()} = ${i(5)} ? (${i(4)} ? ${i(3)} : ${i(2)}) : (${i(4)} ? ${i(1)} : ${i(0)});  // 4:1 mux`); break;
      case 'DEMUX2':
        body.push(`    // 1-to-2 demultiplexer`, `    assign ${net(0)} = ${i(0)} & ~${i(1)};`, `    assign ${net(1)} = ${i(0)} &  ${i(1)};`);
        break;
      case 'DEMUX4':
        body.push(`    // 1-to-4 demultiplexer`);
        [0, 1, 2, 3].forEach((k) => body.push(`    assign ${net(k)} = ${i(0)} & ${k & 2 ? ' ' : '~'}${i(2)} & ${k & 1 ? ' ' : '~'}${i(1)};`));
        break;
      case 'DEC3':
        body.push(`    // 3-to-8 decoder`);
        [0, 1, 2, 3, 4, 5, 6, 7].forEach((k) => body.push(`    assign ${net(k)} = ${k & 4 ? ' ' : '~'}${i(2)} & ${k & 2 ? ' ' : '~'}${i(1)} & ${k & 1 ? ' ' : '~'}${i(0)};`));
        break;
      case 'BITSEL': {
        // 8-to-1 bit selector: pick D[S] from an 8-bit input.
        const pick = (lo: number, bits: number[]): string =>
          bits.length === 0 ? i(lo) : `${i(8 + bits.length - 1)} ? (${pick(lo + (1 << (bits.length - 1)), bits.slice(1))}) : (${pick(lo, bits.slice(1))})`;
        body.push(`    assign ${net()} = ${pick(0, [2, 1, 0])};  // bit selector`);
        break;
      }
      case 'PENC4':
        body.push(`    // 4-to-2 priority encoder (highest input wins), v = any input set`);
        body.push(`    assign ${net(0)} = ${i(3)} | (~${i(2)} & ${i(1)});`, `    assign ${net(1)} = ${i(3)} | ${i(2)};`, `    assign ${net(2)} = ${i(0)} | ${i(1)} | ${i(2)} | ${i(3)};`);
        break;
      case 'DEC2':
        body.push(`    // 2-to-4 decoder`);
        body.push(`    assign ${net(0)} = ~${i(1)} & ~${i(0)};`, `    assign ${net(1)} = ~${i(1)} &  ${i(0)};`, `    assign ${net(2)} =  ${i(1)} & ~${i(0)};`, `    assign ${net(3)} =  ${i(1)} &  ${i(0)};`);
        break;
      case 'HA': body.push(`    assign ${net(0)} = ${i(0)} ^ ${i(1)};  // half adder sum`, `    assign ${net(1)} = ${i(0)} & ${i(1)};  // half adder carry`); break;
      case 'ADD':
      case 'SUB':
      case 'MUL':
      case 'DIV':
      case 'SHIFT':
      case 'CMP':
      case 'NEG':
      case 'SEXT':
      case 'BITCNT': {
        const k = bitWidth(n);
        const vec = (from: number, len: number) => (len === 1 ? i(from) : `{${Array.from({ length: len }, (_, j) => i(from + len - 1 - j)).join(', ')}}`);
        const base = net(0).replace(/_[a-z]+0$/, '');
        const A = unique(`${base}_a`);
        const B = unique(`${base}_b`);
        const r = unique(`${base}_r`);
        const outs = outputNames(n);
        const declare = (name: string, width: number) => body.push(`    logic ${width > 1 ? `[${width - 1}:0] ` : ''}${name};`);
        const bitsOut = (vecName: string, from: number, count: number, first = 0) => {
          for (let j = 0; j < count; j++) body.push(`    assign ${net(from + j)} = ${vecName}[${first + j}];`);
        };
        body.push(`    // ${k}-bit ${n.type === 'SHIFT' ? `barrel shifter (${n.dir === 'right' ? 'right' : 'left'})` : n.type.toLowerCase()}`);
        declare(A, k);
        body.push(`    assign ${A} = ${vec(0, k)};`);
        if (n.type === 'SEXT') {
          for (let j = 0; j < 2 * k; j++) body.push(`    assign ${net(j)} = ${A}[${Math.min(j, k - 1)}];`);
          break;
        }
        if (n.type === 'NEG') {
          declare(r, k);
          body.push(`    assign ${r} = 0 - ${A};  // two's complement`);
          bitsOut(r, 0, k);
          break;
        }
        if (n.type === 'BITCNT') {
          const w = outs.length;
          declare(r, w);
          body.push(`    assign ${r} = ${Array.from({ length: k }, (_, j) => i(j)).join(' + ')};`);
          bitsOut(r, 0, w);
          break;
        }
        if (n.type === 'SHIFT') {
          const sw = inputNames(n).length - k;
          declare(B, sw);
          body.push(`    assign ${B} = ${vec(k, sw)};`);
          declare(r, k);
          body.push(`    assign ${r} = ${A} ${n.dir === 'right' ? '>>' : '<<'} ${B};`);
          bitsOut(r, 0, k);
          break;
        }
        declare(B, k);
        body.push(`    assign ${B} = ${vec(k, k)};`);
        if (n.type === 'ADD') {
          declare(r, k + 1);
          body.push(`    assign ${r} = ${A} + ${B} + ${i(2 * k)};`);
          bitsOut(r, 0, k + 1);
        } else if (n.type === 'SUB') {
          declare(r, k + 1);
          body.push(`    assign ${r} = ${A} - ${B} - ${i(2 * k)};  // bit ${k} = borrow`);
          bitsOut(r, 0, k + 1);
        } else if (n.type === 'MUL') {
          declare(r, 2 * k);
          // Shift-and-add: one partial product per bit of B.
          body.push(`    assign ${r} = ${Array.from({ length: k }, (_, j) => `(${B}[${j}] ? (${A} << ${j}) : 0)`).join(' + ')};`);
          bitsOut(r, 0, 2 * k);
        } else if (n.type === 'DIV') {
          // Restoring division, most significant bit first: shift in the
          // next bit of A, subtract B when it fits. Divide by zero gives Q = 0, R = A.
          body.push(`    logic ${base}_nz;`, `    assign ${base}_nz = ${B} != 0;`);
          let prev = '0';
          for (let j = k - 1; j >= 0; j--) {
            const t = unique(`${base}_t${j}`);
            const rj = unique(`${base}_r${j}`);
            declare(t, k + 1);
            declare(rj, k + 1);
            body.push(`    assign ${t} = (${prev} << 1) | ${A}[${j}];`);
            body.push(`    assign ${net(j)} = ${base}_nz & (${t} >= ${B});`);
            body.push(`    assign ${rj} = (${t} >= ${B}) ? ${t} - ${B} : ${t};`);
            prev = rj;
          }
          for (let j = 0; j < k; j++) body.push(`    assign ${net(k + j)} = ${prev}[${j}];`);
        } else if (n.type === 'CMP') {
          body.push(`    assign ${net(0)} = ${A} > ${B};`, `    assign ${net(1)} = ${A} == ${B};`, `    assign ${net(2)} = ${A} < ${B};`);
        }
        break;
      }
      case 'FA':
        body.push(`    assign ${net(0)} = ${i(0)} ^ ${i(1)} ^ ${i(2)};  // full adder sum`);
        body.push(`    assign ${net(1)} = (${i(0)} & ${i(1)}) | (${i(2)} & (${i(0)} ^ ${i(1)}));  // full adder carry`);
        break;
      case 'DFF':
      case 'TFF':
      case 'JKFF':
      case 'SRFF': {
        const clk = wireInto(c, n.id, 1) ? i(1) : null;
        const q = net(0);
        const next =
          n.type === 'DFF' ? i(0)
          : n.type === 'TFF' ? `${q} ^ ${i(0)}`
          : n.type === 'JKFF' ? `(${i(0)} & ~${q}) | (~${i(2)} & ${q})`
          : `${i(0)} | (~${i(2)} & ${q})`;
        if (clk) body.push(`    always_ff @(posedge ${clk}) ${q} <= ${next};  // ${n.type}`);
        else body.push(`    // ${n.type} ${q}: clock input not connected, it keeps its value`);
        body.push(`    assign ${net(1)} = ~${q};`);
        break;
      }
      default: {
        const list = inputNames(n).map((_, pin) => i(pin));
        const joined = list.join(ops[n.type] ?? ' & ');
        const inverted = n.type === 'NAND' || n.type === 'NOR' || n.type === 'XNOR';
        body.push(`    assign ${net()} = ${inverted ? `~(${joined})` : joined};  // ${n.type}`);
      }
    }
  }
  if (parts.length) body.push('');
  for (const { node, port } of outPorts) body.push(`    assign ${port} = ${src(node.id, 0)};`);
  for (const { node, port } of segPorts) {
    const v = unique(`${port}_value`);
    body.push('', `    // 7-segment decoder, segments a..g = ${port}[0..6], active-low as on the DE2`);
    body.push(`    logic [3:0] ${v};`);
    body.push(`    assign ${v} = {${src(node.id, 3)}, ${src(node.id, 2)}, ${src(node.id, 1)}, ${src(node.id, 0)}};`);
    body.push('    always_comb begin');
    body.push(`        case (${v})`);
    SEG7_PATTERNS.forEach((pat, k) => body.push(`            4'h${k.toString(16).toUpperCase()}: ${port} = 7'b${pat.toString(2).padStart(7, '0')};`));
    body.push(`            default: ${port} = 7'b1111111;`);
    body.push('        endcase');
    body.push('    end');
  }

  const mod = sanitizeName(moduleName, 'gate_design');
  const code = ['// Generated by the Logic Lab gate editor', `module ${mod} (`, ports.join(',\n'), ');', '', ...body, '', 'endmodule', ''].join('\n');
  return { code: code.replace(/\n{3,}/g, '\n\n'), notes };
}

export function toVerilog(c: Circuit, moduleName = 'gate_design'): string {
  return buildVerilog(c, moduleName, 'generic').code;
}

/**
 * Same design for the DE2 board: inputs on SW0.., buttons on KEY0.. (active
 * low), a clock on CLOCK_50, outputs on LEDR0.. and 7-segment displays on
 * HEX0...
 */
export function toDe2Verilog(c: Circuit, moduleName = 'gate_design'): string {
  const built = buildVerilog(c, `${sanitizeName(moduleName, 'gate_design')}_de2`, 'de2');
  return ['// DE2 board mapping:', ...built.notes, built.code].join('\n');
}

/* ── Presets ────────────────────────────────────────────────────────── */

const node = (id: string, type: GateType, x: number, y: number, label = '', delay = 1): GateNode => ({ id, type, x, y, label, delay });
const wire = (from: string, to: string, pin = 0, fromPin = 0): Wire => ({ id: `${from}-${fromPin}-${to}-${pin}`, from, to, pin, ...(fromPin ? { fromPin } : {}) });

export const PRESETS: Record<string, { title: { en: string; tr: string }; circuit: Circuit }> = {
  half_adder: {
    title: { en: 'Half adder', tr: 'Yarım toplayıcı' },
    circuit: {
      nodes: [node('a', 'IN', 60, 120, 'a'), node('b', 'IN', 60, 260, 'b'), node('x', 'XOR', 300, 110), node('n', 'AND', 300, 250), node('s', 'OUT', 540, 125, 'sum'), node('c', 'OUT', 540, 265, 'carry')],
      wires: [wire('a', 'x', 0), wire('b', 'x', 1), wire('a', 'n', 0), wire('b', 'n', 1), wire('x', 's'), wire('n', 'c')],
    },
  },
  mux2: {
    title: { en: '2:1 multiplexer', tr: '2:1 çoklayıcı' },
    circuit: {
      nodes: [node('a', 'IN', 40, 80, 'a'), node('s', 'IN', 40, 200, 'sel'), node('b', 'IN', 40, 320, 'b'), node('ns', 'NOT', 200, 150), node('g1', 'AND', 360, 90), node('g2', 'AND', 360, 290), node('o', 'OR', 540, 190), node('y', 'OUT', 720, 205, 'y')],
      wires: [wire('s', 'ns'), wire('a', 'g1', 0), wire('ns', 'g1', 1), wire('s', 'g2', 0), wire('b', 'g2', 1), wire('g1', 'o', 0), wire('g2', 'o', 1), wire('o', 'y')],
    },
  },
  hazard: {
    title: { en: 'Static hazard (glitch)', tr: 'Statik tehlike (glitch)' },
    circuit: {
      nodes: [node('a', 'IN', 40, 190, 'a'), node('b', 'IN', 40, 70, 'b'), node('c', 'IN', 40, 320, 'c'), node('na', 'NOT', 200, 250, '', 2), node('g1', 'AND', 380, 90), node('g2', 'AND', 380, 290), node('o', 'OR', 560, 190), node('y', 'OUT', 740, 205, 'y')],
      wires: [wire('b', 'g1', 0), wire('a', 'g1', 1), wire('a', 'na'), wire('na', 'g2', 0), wire('c', 'g2', 1), wire('g1', 'o', 0), wire('g2', 'o', 1), wire('o', 'y')],
    },
  },
  full_adder: {
    title: { en: 'Full adder from two half adders', tr: 'İki yarım toplayıcıdan tam toplayıcı' },
    circuit: {
      nodes: [node('a', 'IN', 40, 80, 'a'), node('b', 'IN', 40, 200, 'b'), node('ci', 'IN', 40, 340, 'cin'), node('h1', 'HA', 240, 100), node('h2', 'HA', 460, 180), node('o', 'OR', 680, 300), node('s', 'OUT', 900, 190, 'sum'), node('co', 'OUT', 900, 310, 'cout')],
      wires: [wire('a', 'h1', 0), wire('b', 'h1', 1), wire('h1', 'h2', 0), wire('ci', 'h2', 1), wire('h2', 's'), wire('h1', 'o', 0, 1), wire('h2', 'o', 1, 1), wire('o', 'co')],
    },
  },
  adder4: {
    title: { en: '4-bit adder → 7-segment', tr: '4 bit toplayıcı → 7 segment' },
    circuit: {
      nodes: [
        ...[0, 1, 2, 3].map((i) => node(`a${i}`, 'IN', 40, 20 + i * 64, `a${i}`)),
        ...[0, 1, 2, 3].map((i) => node(`b${i}`, 'IN', 40, 290 + i * 64, `b${i}`)),
        node('cin', 'CONST0', 180, 560),
        { ...node('add', 'ADD', 360, 150), bits: 4 },
        ...[0, 1, 2, 3].map((i) => node(`s${i}`, 'OUT', 620, 60 + i * 70, `s${i}`)),
        node('co', 'OUT', 620, 360, 'cout'),
        node('h', 'SEG7', 900, 150, 'hex0'),
      ],
      wires: [
        ...[0, 1, 2, 3].map((i) => wire(`a${i}`, 'add', i)),
        ...[0, 1, 2, 3].map((i) => wire(`b${i}`, 'add', 4 + i)),
        wire('cin', 'add', 8),
        ...[0, 1, 2, 3].map((i) => wire('add', `s${i}`, 0, i)),
        wire('add', 'co', 0, 4),
        ...[0, 1, 2, 3].map((i) => wire('add', 'h', i, i)),
      ],
    },
  },
  mux4: {
    title: { en: '4:1 multiplexer', tr: '4:1 çoklayıcı' },
    circuit: {
      nodes: [node('d0', 'IN', 40, 40, 'd0'), node('d1', 'IN', 40, 120, 'd1'), node('d2', 'IN', 40, 200, 'd2'), node('d3', 'IN', 40, 280, 'd3'), node('s0', 'IN', 40, 400, 's0'), node('s1', 'IN', 40, 480, 's1'), node('m', 'MUX4', 320, 180), node('y', 'OUT', 560, 235, 'y')],
      wires: [wire('d0', 'm', 0), wire('d1', 'm', 1), wire('d2', 'm', 2), wire('d3', 'm', 3), wire('s0', 'm', 4), wire('s1', 'm', 5), wire('m', 'y')],
    },
  },
  seg7: {
    title: { en: '7-segment display (4 switches)', tr: '7 segment gösterge (4 anahtar)' },
    circuit: {
      nodes: [node('b0', 'IN', 60, 60, 'b0'), node('b1', 'IN', 60, 150, 'b1'), node('b2', 'IN', 60, 240, 'b2'), node('b3', 'IN', 60, 330, 'b3'), node('h', 'SEG7', 360, 130, 'hex0')],
      wires: [wire('b0', 'h', 0), wire('b1', 'h', 1), wire('b2', 'h', 2), wire('b3', 'h', 3)],
    },
  },
  dff: {
    title: { en: 'D flip-flop', tr: 'D flip-flop' },
    circuit: {
      nodes: [node('d', 'IN', 60, 100, 'd'), node('clk', 'CLK', 60, 220, 'clk'), node('f', 'DFF', 300, 130), node('q', 'OUT', 540, 130, 'q')],
      wires: [wire('d', 'f', 0), wire('clk', 'f', 1), wire('f', 'q')],
    },
  },
  counter4: {
    title: { en: '4-bit ripple counter → 7-segment', tr: '4 bit dalgalı sayıcı → 7 segment' },
    circuit: {
      nodes: [
        node('one', 'CONST1', 60, 40), node('clk', 'CLK', 60, 200, 'clk'),
        node('t0', 'TFF', 240, 170), node('t1', 'TFF', 420, 170), node('t2', 'TFF', 600, 170), node('t3', 'TFF', 780, 170),
        node('q0', 'OUT', 260, 330, 'q0'), node('q1', 'OUT', 440, 330, 'q1'), node('q2', 'OUT', 620, 330, 'q2'), node('q3', 'OUT', 800, 330, 'q3'),
        node('h', 'SEG7', 960, 400, 'hex0'),
      ],
      wires: [
        wire('one', 't0', 0), wire('one', 't1', 0), wire('one', 't2', 0), wire('one', 't3', 0),
        wire('clk', 't0', 1), wire('t0', 't1', 1, 1), wire('t1', 't2', 1, 1), wire('t2', 't3', 1, 1),
        wire('t0', 'q0'), wire('t1', 'q1'), wire('t2', 'q2'), wire('t3', 'q3'),
        wire('t0', 'h', 0), wire('t1', 'h', 1), wire('t2', 'h', 2), wire('t3', 'h', 3),
      ],
    },
  },
};
