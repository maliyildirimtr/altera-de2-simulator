/**
 * Boolean expressions, truth tables and two-level minimisation
 * (Quine–McCluskey with don't-cares) for the Karnaugh map tool.
 *
 * Variables are single letters so that juxtaposition means AND ("ab + a'c").
 */
import type { Circuit, GateNode, Wire } from '../gates/circuit';

export type Ast =
  | { k: 'var'; name: string }
  | { k: 'const'; v: 0 | 1 }
  | { k: 'not'; a: Ast }
  | { k: 'and' | 'or' | 'xor'; a: Ast; b: Ast };

export class ParseError extends Error {
  readonly position: number;
  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

/** Parse "a'b + c(d ⊕ !a)". Operators: ' ~ ! ¬ (NOT), & * · . or juxtaposition (AND), + | (OR), ^ ⊕ (XOR). */
export function parseExpression(text: string): Ast {
  const src = text.replace(/\s+/g, '');
  let i = 0;
  const peek = () => src[i];
  const fail = (msg: string): never => { throw new ParseError(msg, i); };

  const parseOr = (): Ast => {
    let left = parseXor();
    while (peek() === '+' || peek() === '|') {
      i++;
      left = { k: 'or', a: left, b: parseXor() };
    }
    return left;
  };
  const parseXor = (): Ast => {
    let left = parseAnd();
    while (peek() === '^' || peek() === '⊕') {
      i++;
      left = { k: 'xor', a: left, b: parseAnd() };
    }
    return left;
  };
  const startsFactor = (c: string | undefined) => !!c && /[A-Za-z01(~!¬]/.test(c);
  const parseAnd = (): Ast => {
    let left = parseUnary();
    for (;;) {
      const c = peek();
      if (c === '&' || c === '*' || c === '·' || c === '.') {
        i++;
        left = { k: 'and', a: left, b: parseUnary() };
      } else if (startsFactor(c)) {
        left = { k: 'and', a: left, b: parseUnary() };
      } else return left;
    }
  };
  const parseUnary = (): Ast => {
    const c = peek();
    if (c === '~' || c === '!' || c === '¬') {
      i++;
      return { k: 'not', a: parseUnary() };
    }
    let node = parsePrimary();
    while (peek() === "'" || peek() === '’') {
      i++;
      node = { k: 'not', a: node };
    }
    return node;
  };
  const parsePrimary = (): Ast => {
    const c = peek();
    if (c === undefined) return fail('Unexpected end of expression');
    if (c === '(') {
      i++;
      const inner = parseOr();
      if (peek() !== ')') fail('Missing )');
      i++;
      return inner;
    }
    if (c === '0' || c === '1') {
      i++;
      return { k: 'const', v: c === '1' ? 1 : 0 };
    }
    if (/[A-Za-z]/.test(c)) {
      i++;
      return { k: 'var', name: c };
    }
    return fail(`Unexpected "${c}"`);
  };

  if (!src) throw new ParseError('Empty expression', 0);
  const ast = parseOr();
  if (i < src.length) fail(`Unexpected "${src[i]}"`);
  return ast;
}

export function variablesOf(ast: Ast): string[] {
  const set = new Set<string>();
  const walk = (n: Ast) => {
    if (n.k === 'var') set.add(n.name);
    else if (n.k === 'not') walk(n.a);
    else if (n.k !== 'const') { walk(n.a); walk(n.b); }
  };
  walk(ast);
  return [...set].sort();
}

export function evalAst(ast: Ast, env: Record<string, number>): number {
  switch (ast.k) {
    case 'var': return env[ast.name] ? 1 : 0;
    case 'const': return ast.v;
    case 'not': return evalAst(ast.a, env) ^ 1;
    case 'and': return evalAst(ast.a, env) & evalAst(ast.b, env);
    case 'or': return evalAst(ast.a, env) | evalAst(ast.b, env);
    case 'xor': return evalAst(ast.a, env) ^ evalAst(ast.b, env);
  }
}

/** Output column (0/1) over all 2ⁿ rows; variable 0 is the most significant bit. */
export function tableOf(ast: Ast, vars: string[]): number[] {
  const n = vars.length;
  return Array.from({ length: 1 << n }, (_, m) => {
    const env: Record<string, number> = {};
    vars.forEach((v, k) => { env[v] = (m >> (n - 1 - k)) & 1; });
    return evalAst(ast, env);
  });
}

/* ── Quine–McCluskey ─────────────────────────────────────────────── */

/** An implicant: `bits` over the variables where `mask` bits are "don't care" (and zero in `bits`). */
export interface Implicant {
  bits: number;
  mask: number;
}

const popcount = (x: number) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };

export function covers(imp: Implicant, m: number): boolean {
  return (m & ~imp.mask) === imp.bits;
}

export function literalCount(imp: Implicant, n: number): number {
  return n - popcount(imp.mask);
}

export function primeImplicants(ones: number[], dontCares: number[]): Implicant[] {
  let current = new Map<string, Implicant>();
  for (const m of [...ones, ...dontCares]) current.set(`${m}/0`, { bits: m, mask: 0 });
  const primes = new Map<string, Implicant>();
  while (current.size) {
    const next = new Map<string, Implicant>();
    const used = new Set<string>();
    const list = [...current.entries()];
    for (let x = 0; x < list.length; x++) {
      for (let y = x + 1; y < list.length; y++) {
        const [ka, a] = list[x];
        const [kb, b] = list[y];
        if (a.mask !== b.mask) continue;
        const diff = a.bits ^ b.bits;
        if (popcount(diff) !== 1) continue;
        const merged = { bits: a.bits & ~diff, mask: a.mask | diff };
        next.set(`${merged.bits}/${merged.mask}`, merged);
        used.add(ka);
        used.add(kb);
      }
    }
    for (const [k, imp] of current) if (!used.has(k)) primes.set(k, imp);
    current = next;
  }
  return [...primes.values()];
}

/** Minimal sum-of-products cover (fewest terms, then fewest literals). */
export function minimize(n: number, ones: number[], dontCares: number[]): Implicant[] {
  if (ones.length === 0) return [];
  if (ones.length + dontCares.length === 1 << n) return [{ bits: 0, mask: (1 << n) - 1 }];
  const primes = primeImplicants(ones, dontCares).filter((p) => ones.some((m) => covers(p, m)));
  const chosen: Implicant[] = [];
  let remaining = [...ones];
  // Essential prime implicants.
  for (const m of ones) {
    const cov = primes.filter((p) => covers(p, m));
    if (cov.length === 1 && !chosen.includes(cov[0])) chosen.push(cov[0]);
  }
  remaining = remaining.filter((m) => !chosen.some((p) => covers(p, m)));
  if (remaining.length === 0) return sortImplicants(chosen, n);
  const candidates = primes.filter((p) => !chosen.includes(p) && remaining.some((m) => covers(p, m)));
  // Exact search over small candidate sets (at most 4 variables keeps this tiny).
  let best: Implicant[] | null = null;
  const cost = (set: Implicant[]) => set.length * 100 + set.reduce((s, p) => s + literalCount(p, n), 0);
  const search = (start: number, picked: Implicant[]) => {
    if (best && cost(picked) >= cost(best)) return;
    if (remaining.every((m) => picked.some((p) => covers(p, m)))) {
      best = [...picked];
      return;
    }
    for (let k = start; k < candidates.length; k++) {
      picked.push(candidates[k]);
      search(k + 1, picked);
      picked.pop();
    }
  };
  if (candidates.length <= 20) search(0, []);
  if (!best) {
    // Greedy fallback: take the implicant covering the most uncovered minterms.
    const picked: Implicant[] = [];
    let left = [...remaining];
    while (left.length) {
      const p = candidates.reduce((a, b) => (left.filter((m) => covers(b, m)).length > left.filter((m) => covers(a, m)).length ? b : a));
      picked.push(p);
      left = left.filter((m) => !covers(p, m));
    }
    best = picked;
  }
  return sortImplicants([...chosen, ...(best as Implicant[])], n);
}

function sortImplicants(list: Implicant[], n: number): Implicant[] {
  return [...list].sort((a, b) => literalCount(a, n) - literalCount(b, n) || a.bits - b.bits);
}

export function termText(imp: Implicant, vars: string[]): string {
  const n = vars.length;
  const parts: string[] = [];
  vars.forEach((v, k) => {
    const bit = 1 << (n - 1 - k);
    if (imp.mask & bit) return;
    parts.push(imp.bits & bit ? v : `${v}'`);
  });
  return parts.length ? parts.join('') : '1';
}

export function sopText(cover: Implicant[], vars: string[]): string {
  if (cover.length === 0) return '0';
  return cover.map((p) => termText(p, vars)).join(' + ');
}

export function sopVerilog(cover: Implicant[], vars: string[]): string {
  if (cover.length === 0) return "1'b0";
  const n = vars.length;
  const terms = cover.map((imp) => {
    const lits: string[] = [];
    vars.forEach((v, k) => {
      const bit = 1 << (n - 1 - k);
      if (imp.mask & bit) return;
      lits.push(imp.bits & bit ? v : `~${v}`);
    });
    if (lits.length === 0) return "1'b1";
    return lits.length === 1 ? lits[0] : `(${lits.join(' & ')})`;
  });
  return terms.join(' | ');
}

/* ── Karnaugh layout ─────────────────────────────────────────────── */

export const GRAY = [0, 1, 3, 2];

/** Row and column variables and their Gray-coded orders for 2–4 variables. */
export function kmapLayout(n: number): { rowVars: number; colVars: number; rows: number[]; cols: number[] } {
  const rowVars = n >= 4 ? 2 : 1;
  const colVars = n - rowVars;
  const order = (bits: number) => (bits === 1 ? [0, 1] : GRAY);
  return { rowVars, colVars, rows: order(rowVars), cols: order(colVars) };
}

export function cellMinterm(n: number, row: number, col: number): number {
  const { colVars } = kmapLayout(n);
  return (row << colVars) | col;
}

/* ── To a gate-level circuit ─────────────────────────────────────── */

export function sopToCircuit(cover: Implicant[], vars: string[], outName = 'y'): Circuit {
  const n = vars.length;
  const nodes: GateNode[] = [];
  const wires: Wire[] = [];
  let seq = 0;
  const node = (type: GateNode['type'], x: number, y: number, label = ''): string => {
    const id = `k${seq++}`;
    nodes.push({ id, type, x, y, label, delay: 1 });
    return id;
  };
  const wire = (from: string, to: string, pin = 0) => wires.push({ id: `w${seq++}`, from, to, pin });

  const inputs = vars.map((v, k) => node('IN', 30, 40 + k * 100, v));
  const inverted: Record<number, string> = {};
  const literal = (k: number, positive: boolean): string => {
    if (positive) return inputs[k];
    if (!inverted[k]) {
      inverted[k] = node('NOT', 170, 60 + k * 100);
      wire(inputs[k], inverted[k]);
    }
    return inverted[k];
  };

  const termOutputs: string[] = [];
  cover.forEach((imp, t) => {
    const lits: string[] = [];
    vars.forEach((_, k) => {
      const bit = 1 << (n - 1 - k);
      if (!(imp.mask & bit)) lits.push(literal(k, !!(imp.bits & bit)));
    });
    const y = 30 + t * 110;
    if (lits.length === 0) {
      // Constant 1: a + a'.
      const g = node('OR', 320, y);
      wire(inputs[0], g, 0);
      wire(literal(0, false), g, 1);
      termOutputs.push(g);
      return;
    }
    let acc = lits[0];
    lits.slice(1).forEach((l, j) => {
      const g = node('AND', 320 + j * 110, y + j * 8);
      wire(acc, g, 0);
      wire(l, g, 1);
      acc = g;
    });
    termOutputs.push(acc);
  });

  const out = node('OUT', 900, 40 + Math.max(0, (termOutputs.length - 1) * 55), outName);
  if (termOutputs.length === 0) {
    // Constant 0: a · a'.
    const g = node('AND', 700, 40);
    wire(inputs[0], g, 0);
    wire(literal(0, false), g, 1);
    wire(g, out);
  } else {
    let acc = termOutputs[0];
    termOutputs.slice(1).forEach((tOut, j) => {
      const g = node('OR', 700 + j * 20 - (termOutputs.length > 3 ? 40 : 0), 60 + j * 110);
      wire(acc, g, 0);
      wire(tOut, g, 1);
      acc = g;
    });
    wire(acc, out);
  }
  return { nodes, wires };
}
