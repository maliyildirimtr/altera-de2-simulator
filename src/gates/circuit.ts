/**
 * Gate-level circuit model for the drawing editor: evaluation, unit-delay
 * timing simulation (for glitches), truth tables and Verilog generation.
 * Pure functions, no React.
 */

export type GateType = 'IN' | 'OUT' | 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR';

export interface GateNode {
  id: string;
  type: GateType;
  x: number;
  y: number;
  /** Signal name for IN/OUT; optional note for gates. */
  label: string;
  /** Propagation delay in time units (gates only). */
  delay: number;
}

export interface Wire {
  id: string;
  from: string;
  to: string;
  pin: number;
}

export interface Circuit {
  nodes: GateNode[];
  wires: Wire[];
}

export const GATE_TYPES: GateType[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'];

export function inputCount(type: GateType): number {
  if (type === 'IN') return 0;
  if (type === 'OUT' || type === 'NOT') return 1;
  return 2;
}

export function hasOutput(type: GateType): boolean {
  return type !== 'OUT';
}

export function applyGate(type: GateType, a: number, b: number): number {
  switch (type) {
    case 'AND': return a & b;
    case 'OR': return a | b;
    case 'NOT': return a ^ 1;
    case 'NAND': return (a & b) ^ 1;
    case 'NOR': return (a | b) ^ 1;
    case 'XOR': return a ^ b;
    case 'XNOR': return (a ^ b) ^ 1;
    default: return a;
  }
}

export function driverOf(c: Circuit, nodeId: string, pin: number): string | null {
  return c.wires.find((w) => w.to === nodeId && w.pin === pin)?.from ?? null;
}

export interface Evaluation {
  /** Output value of every node (OUT nodes: the value they display). */
  values: Record<string, number>;
  /** Nodes on a combinational loop, if any (then values are not meaningful). */
  loop: string[];
  /** Gate/OUT inputs with nothing connected (read as 0). */
  floating: Array<{ node: string; pin: number }>;
}

export function evaluate(c: Circuit, inputs: Record<string, number>): Evaluation {
  const byId = new Map(c.nodes.map((n) => [n.id, n]));
  const values: Record<string, number> = {};
  const state: Record<string, 0 | 1 | 2> = {}; // 1 = visiting, 2 = done
  const loop = new Set<string>();
  const floating: Array<{ node: string; pin: number }> = [];

  const visit = (id: string, stack: string[]): number => {
    const n = byId.get(id);
    if (!n) return 0;
    if (state[id] === 2) return values[id];
    if (state[id] === 1) {
      stack.slice(stack.indexOf(id)).forEach((x) => loop.add(x));
      return 0;
    }
    state[id] = 1;
    let v = 0;
    if (n.type === 'IN') v = inputs[id] ? 1 : 0;
    else {
      const ins: number[] = [];
      for (let pin = 0; pin < inputCount(n.type); pin++) {
        const src = driverOf(c, id, pin);
        if (src === null) {
          floating.push({ node: id, pin });
          ins.push(0);
        } else ins.push(visit(src, [...stack, id]));
      }
      v = n.type === 'OUT' ? ins[0] : applyGate(n.type, ins[0], ins[1] ?? 0);
    }
    state[id] = 2;
    values[id] = v;
    return v;
  };
  c.nodes.forEach((n) => visit(n.id, []));
  return { values, loop: [...loop], floating };
}

/* ── Unit-delay timing simulation ───────────────────────────────────── */

export interface Trace {
  /** Value changes per node output: [time, value] pairs, first at t=0. */
  changes: Record<string, Array<[number, number]>>;
  end: number;
  /** Nodes whose output changed more than once after the stimulus (a glitch). */
  glitches: string[];
}

/**
 * Starting from the steady state for `before`, apply `after` at t = 0 and let
 * every gate update `delay` time units after one of its inputs changes
 * (transport delay). Records each node's output over time.
 */
export function simulateTiming(
  c: Circuit,
  before: Record<string, number>,
  after: Record<string, number>,
  maxTime = 60,
): Trace {
  const steady = evaluate(c, before).values;
  const value: Record<string, number> = { ...steady };
  const changes: Record<string, Array<[number, number]>> = {};
  c.nodes.forEach((n) => { changes[n.id] = [[0, steady[n.id] ?? 0]]; });
  const fanout = new Map<string, string[]>();
  c.wires.forEach((w) => fanout.set(w.from, [...(fanout.get(w.from) ?? []), w.to]));
  const byId = new Map(c.nodes.map((n) => [n.id, n]));

  // Events: time -> set of nodes to re-evaluate.
  const queue = new Map<number, Set<string>>();
  const schedule = (t: number, id: string) => {
    if (t > maxTime) return;
    if (!queue.has(t)) queue.set(t, new Set());
    queue.get(t)!.add(id);
  };
  const set = (id: string, v: number, t: number) => {
    if (value[id] === v) return;
    value[id] = v;
    changes[id].push([t, v]);
    for (const dst of fanout.get(id) ?? []) {
      const d = byId.get(dst);
      if (!d) continue;
      schedule(t + (d.type === 'OUT' ? 0 : Math.max(1, d.delay)), dst);
    }
  };
  let end = 0;
  c.nodes.filter((n) => n.type === 'IN').forEach((n) => set(n.id, after[n.id] ? 1 : 0, 0));
  const input = (id: string, pin: number) => {
    const src = driverOf(c, id, pin);
    return src === null ? 0 : value[src] ?? 0;
  };
  for (let t = 0; t <= maxTime; t++) {
    const due = queue.get(t);
    if (!due) continue;
    queue.delete(t);
    for (const id of due) {
      const n = byId.get(id)!;
      const v = n.type === 'OUT' ? input(id, 0) : applyGate(n.type, input(id, 0), input(id, 1));
      set(id, v, t);
      end = Math.max(end, t);
    }
    // Zero-delay OUT nodes scheduled at the same t are handled by a second pass.
    const again = queue.get(t);
    if (again) {
      queue.delete(t);
      for (const id of again) {
        const n = byId.get(id)!;
        set(id, n.type === 'OUT' ? input(id, 0) : applyGate(n.type, input(id, 0), input(id, 1)), t);
      }
    }
  }
  const glitches = c.nodes
    .filter((n) => n.type !== 'IN' && changes[n.id].length > 2)
    .map((n) => n.id);
  return { changes, end: Math.max(end, 1), glitches };
}

/** Value of a node at time t from its change list. */
export function valueAt(list: Array<[number, number]>, t: number): number {
  let v = list[0]?.[1] ?? 0;
  for (const [ct, cv] of list) {
    if (ct <= t) v = cv;
    else break;
  }
  return v;
}

/* ── Truth table and Verilog ────────────────────────────────────────── */

export function ioNodes(c: Circuit): { ins: GateNode[]; outs: GateNode[] } {
  const byPos = (a: GateNode, b: GateNode) => a.y - b.y || a.x - b.x;
  return {
    ins: c.nodes.filter((n) => n.type === 'IN').sort(byPos),
    outs: c.nodes.filter((n) => n.type === 'OUT').sort(byPos),
  };
}

export function truthTable(c: Circuit, maxInputs = 6): { ins: GateNode[]; outs: GateNode[]; rows: Array<{ in: number[]; out: number[] }> } | null {
  const { ins, outs } = ioNodes(c);
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
    rows.push({ in: bits, out: outs.map((o) => ev.values[o.id] ?? 0) });
  }
  return { ins, outs, rows };
}

const VERILOG_KEYWORDS = new Set(['module', 'endmodule', 'input', 'output', 'wire', 'logic', 'reg', 'assign', 'always', 'begin', 'end', 'if', 'else', 'case', 'and', 'or', 'not', 'xor', 'nand', 'nor', 'xnor', 'buf']);

export function sanitizeName(raw: string, fallback: string): string {
  let s = (raw || '').trim().replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => ({ ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' })[ch] ?? ch);
  s = s.replace(/[^A-Za-z0-9_]/g, '_');
  if (!/^[A-Za-z_]/.test(s)) s = `n_${s}`;
  if (!s || s === 'n_' || VERILOG_KEYWORDS.has(s)) s = fallback;
  return s;
}

export function toVerilog(c: Circuit, moduleName = 'gate_design', rename: Record<string, string> = {}): string {
  const { ins, outs } = ioNodes(c);
  const names = new Map<string, string>();
  const used = new Set<string>();
  const unique = (base: string) => {
    let n = base;
    let k = 2;
    while (used.has(n)) n = `${base}_${k++}`;
    used.add(n);
    return n;
  };
  ins.forEach((n, i) => names.set(n.id, unique(rename[n.id] ?? sanitizeName(n.label, `in${i}`))));
  outs.forEach((n, i) => names.set(n.id, unique(rename[n.id] ?? sanitizeName(n.label, `out${i}`))));
  const gates = c.nodes.filter((n) => GATE_TYPES.includes(n.type)).sort((a, b) => a.x - b.x || a.y - b.y);
  gates.forEach((g, i) => names.set(g.id, unique(`g${i + 1}`)));

  const src = (id: string, pin: number) => {
    const d = driverOf(c, id, pin);
    return d ? names.get(d) ?? "1'b0" : "1'b0";
  };
  const expr = (g: GateNode) => {
    const a = src(g.id, 0);
    const b = src(g.id, 1);
    switch (g.type) {
      case 'AND': return `${a} & ${b}`;
      case 'OR': return `${a} | ${b}`;
      case 'NOT': return `~${a}`;
      case 'NAND': return `~(${a} & ${b})`;
      case 'NOR': return `~(${a} | ${b})`;
      case 'XOR': return `${a} ^ ${b}`;
      case 'XNOR': return `~(${a} ^ ${b})`;
      default: return a;
    }
  };
  const mod = sanitizeName(moduleName, 'gate_design');
  const ports = [
    ...ins.map((n) => `    input  logic ${names.get(n.id)}`),
    ...outs.map((n) => `    output logic ${names.get(n.id)}`),
  ];
  const lines = [
    '// Generated by the Logic Lab gate editor',
    `module ${mod} (`,
    ports.join(',\n'),
    ');',
  ];
  if (gates.length) {
    lines.push('', `    logic ${gates.map((g) => names.get(g.id)).join(', ')};`, '');
    gates.forEach((g) => lines.push(`    assign ${names.get(g.id)} = ${expr(g)};  // ${g.type}`));
  }
  lines.push('');
  outs.forEach((o) => lines.push(`    assign ${names.get(o.id)} = ${src(o.id, 0)};`));
  lines.push('', 'endmodule', '');
  return lines.join('\n');
}

/* ── Presets ────────────────────────────────────────────────────────── */

const node = (id: string, type: GateType, x: number, y: number, label = '', delay = 1): GateNode => ({ id, type, x, y, label, delay });
const wire = (from: string, to: string, pin = 0): Wire => ({ id: `${from}-${to}-${pin}`, from, to, pin });

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
};

/** Same design with inputs on SW0.. and outputs on LEDR0.., ready for the DE2 board. */
export function toDe2Verilog(c: Circuit, moduleName = 'gate_design'): string {
  const { ins, outs } = ioNodes(c);
  const rename: Record<string, string> = {};
  const notes: string[] = [];
  ins.forEach((n, i) => { rename[n.id] = `SW${i}`; notes.push(`//   SW${i}  = ${sanitizeName(n.label, `in${i}`)}`); });
  outs.forEach((n, i) => { rename[n.id] = `LEDR${i}`; notes.push(`//   LEDR${i} = ${sanitizeName(n.label, `out${i}`)}`); });
  return ['// DE2 board mapping:', ...notes, toVerilog(c, `${sanitizeName(moduleName, 'gate_design')}_de2`, rename)].join('\n');
}
