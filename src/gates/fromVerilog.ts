/**
 * Verilog → gate circuit for the gate designer.
 *
 * Reads modules written in the style of coursework: continuous `assign`s,
 * gate primitives (and, or, not …), `always_comb` blocks with if/else and
 * case, `always_ff @(posedge clk)` blocks, localparams, and instances of
 * other modules in the same file (flattened). Every signal is taken apart
 * into bits and each operator becomes gates: bitwise operators, ?:, ==, !=,
 * <, <=, >, >=, + and -, concatenation, constant bit selects and constant
 * shifts. Constants are folded as the gates are made, so `a & 1'b1` costs
 * nothing, and equal sub-expressions share one gate.
 *
 * What cannot become a small gate circuit (multiplication, division,
 * variable shifts, latches, negedge clocks) is reported, never guessed.
 */
import { compileVerilog } from '../core/simulator/verilogEngine';
import { Parser } from '../core/simulator/expression/parser';
import { buildConstantTable } from '../core/simulator/namedConstants';
import type { Expr, Stmt } from '../core/simulator/expression/ast';
import type { Circuit, GateNode, GateType, Wire } from './circuit';

type Net = { id: string; pin: number } | 0 | 1;

/** A conversion problem, with the message in English and Turkish. */
export class ConvertError extends Error {
  readonly tr: string;
  constructor(en: string, tr?: string) {
    super(en);
    this.tr = tr ?? en;
  }
}

const MAX_PARTS = 600;
const MAX_DEPTH = 8;

interface Decl {
  width: number;
  dir: 'input' | 'output' | 'internal';
}

interface ModuleSrc {
  name: string;
  text: string;
  body: string;
  inputs: string[];
  outputs: string[];
  portWidths: Record<string, number>;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, '');
}

const PRIMS: Record<string, { op: string; invert: boolean }> = {
  and: { op: '&', invert: false }, or: { op: '|', invert: false }, xor: { op: '^', invert: false },
  nand: { op: '&', invert: true }, nor: { op: '|', invert: true }, xnor: { op: '^', invert: true },
  not: { op: '', invert: true }, buf: { op: '', invert: false },
};

function readModules(src: string): Map<string, ModuleSrc> {
  const out = new Map<string, ModuleSrc>();
  for (const m of src.matchAll(/\bmodule\s+(\w+)[\s\S]*?\bendmodule\b/g)) {
    const text = m[0];
    let engine;
    try {
      engine = compileVerilog(text);
    } catch (err) {
      throw new ConvertError(`Module ${m[1]} could not be read: ${(err as Error).message}`, `${m[1]} modülü okunamadı: ${(err as Error).message}`);
    }
    const bodyStart = text.indexOf(';', text.search(/\bmodule\b/)) + 1;
    out.set(m[1], {
      name: m[1],
      text,
      body: text.slice(bodyStart, text.lastIndexOf('endmodule')),
      inputs: engine.inputs,
      outputs: engine.outputs,
      portWidths: engine.portWidths ?? {},
    });
  }
  return out;
}

export function verilogToCircuit(source: string): { circuit: Circuit; name: string } {
  const src = stripComments(source);
  const modules = readModules(src);
  if (modules.size === 0) throw new ConvertError('No module … endmodule was found.', 'module … endmodule bulunamadı.');
  // The top module is the one no other module instantiates (the last such one).
  const instantiated = new Set<string>();
  for (const m of modules.values()) for (const other of modules.keys()) if (new RegExp(`\\b${other}\\s+(?:#\\s*\\([^)]*\\)\\s*)?\\w+\\s*\\(`).test(m.body)) instantiated.add(other);
  const tops = [...modules.keys()].filter((n) => !instantiated.has(n));
  const top = tops[tops.length - 1] ?? [...modules.keys()].pop()!;

  /* ── Circuit under construction (shared by every module) ── */
  const nodes: GateNode[] = [];
  const wires: Wire[] = [];
  let seq = 0;
  const node = (type: GateType, label = '', extra: Partial<GateNode> = {}): string => {
    if (nodes.length >= MAX_PARTS) throw new ConvertError(`The circuit would need more than ${MAX_PARTS} parts.`, `Devre ${MAX_PARTS} parçadan fazlasını gerektirir.`);
    const id = `v${seq++}`;
    nodes.push({ id, type, x: 0, y: 0, label, delay: 1, ...extra });
    return id;
  };
  const consts: Record<number, { id: string; pin: number }> = {};
  const constNet = (v: 0 | 1) => (consts[v] ??= { id: node(v ? 'CONST1' : 'CONST0'), pin: 0 });
  const wire = (from: Net, to: string, pin: number) => {
    const f = from === 0 || from === 1 ? constNet(from) : from;
    wires.push({ id: `w${seq++}`, from: f.id, to, pin, ...(f.pin ? { fromPin: f.pin } : {}) });
  };
  const memo = new Map<string, Net>();
  const same = (a: Net, b: Net) => a === b || (typeof a === 'object' && typeof b === 'object' && a.id === b.id && a.pin === b.pin);
  const key = (n: Net) => (typeof n === 'object' ? `${n.id}.${n.pin}` : String(n));

  const not = (a: Net): Net => {
    if (a === 0 || a === 1) return (a ^ 1) as 0 | 1;
    const k = `not:${key(a)}`;
    if (memo.has(k)) return memo.get(k)!;
    const g = node('NOT');
    wire(a, g, 0);
    const out = { id: g, pin: 0 };
    memo.set(k, out);
    memo.set(`not:${key(out)}`, a);
    return out;
  };
  const gate2 = (type: 'AND' | 'OR' | 'XOR', a: Net, b: Net): Net => {
    if (type === 'AND') {
      if (a === 0 || b === 0) return 0;
      if (a === 1) return b;
      if (b === 1) return a;
      if (same(a, b)) return a;
    } else if (type === 'OR') {
      if (a === 1 || b === 1) return 1;
      if (a === 0) return b;
      if (b === 0) return a;
      if (same(a, b)) return a;
    } else {
      if (a === 0) return b;
      if (b === 0) return a;
      if (a === 1) return not(b);
      if (b === 1) return not(a);
      if (same(a, b)) return 0;
    }
    const k = `${type}:${[key(a), key(b)].sort().join(',')}`;
    if (memo.has(k)) return memo.get(k)!;
    const g = node(type);
    wire(a, g, 0);
    wire(b, g, 1);
    const out = { id: g, pin: 0 };
    memo.set(k, out);
    return out;
  };
  const mux = (sel: Net, a0: Net, a1: Net): Net => {
    if (sel === 0) return a0;
    if (sel === 1) return a1;
    if (same(a0, a1)) return a0;
    if (a0 === 0 && a1 === 1) return sel;
    if (a0 === 1 && a1 === 0) return not(sel);
    if (a0 === 0) return gate2('AND', sel, a1);
    if (a1 === 1) return gate2('OR', sel, a0);
    const k = `mux:${key(sel)},${key(a0)},${key(a1)}`;
    if (memo.has(k)) return memo.get(k)!;
    const g = node('MUX2');
    wire(a0, g, 0);
    wire(a1, g, 1);
    wire(sel, g, 2);
    const out = { id: g, pin: 0 };
    memo.set(k, out);
    return out;
  };
  const reduce = (type: 'AND' | 'OR' | 'XOR', bits: Net[]): Net => bits.reduce((acc, b) => gate2(type, acc, b), type === 'AND' ? 1 : 0);
  const fit = (bits: Net[], w: number): Net[] => Array.from({ length: w }, (_, k) => bits[k] ?? 0);
  /** Ripple-carry sum of `w` bits; returns the sum bits and the carry out. */
  const addBits = (a: Net[], b: Net[], carryIn: Net, w: number): { sum: Net[]; carry: Net } => {
    const sum: Net[] = [];
    let c = carryIn;
    for (let k = 0; k < w; k++) {
      const x = a[k] ?? 0;
      const y = b[k] ?? 0;
      const s1 = gate2('XOR', x, y);
      sum.push(gate2('XOR', s1, c));
      c = gate2('OR', gate2('AND', x, y), gate2('AND', c, s1));
    }
    return { sum, carry: c };
  };

  /**
   * Builds one module. `given` holds the nets of its inputs when it is an
   * instance; the top module (given = null) gets IN, CLK and OUT parts.
   * Returns a reader for its output ports.
   */
  function elaborate(mod: ModuleSrc, given: Map<string, Net[]> | null, depth: number): (port: string) => Net[] {
    if (depth > MAX_DEPTH) throw new ConvertError('Modules are nested too deeply (or instantiate themselves).', 'Modüller çok derin iç içe (ya da kendilerini çağırıyorlar).');
    const constants = (() => {
      try {
        return buildConstantTable(mod.body);
      } catch (err) {
        throw new ConvertError((err as Error).message);
      }
    })();
    const decls = new Map<string, Decl>();
    for (const p of mod.inputs) decls.set(p, { width: mod.portWidths[p] ?? 1, dir: 'input' });
    for (const p of mod.outputs) decls.set(p, { width: mod.portWidths[p] ?? 1, dir: 'output' });
    for (const m of mod.body.matchAll(/\b(?:wire|logic|reg)\b\s*(?:\[(\d+)\s*:\s*(\d+)\])?\s*([^;]+);/g)) {
      const width = m[1] ? Math.abs(Number(m[1]) - Number(m[2])) + 1 : 1;
      for (const part of m[3].split(',')) {
        const n = /^\s*(\w+)/.exec(part)?.[1];
        if (n && !decls.has(n)) decls.set(n, { width, dir: 'internal' });
      }
    }
    if ([...decls.values()].some((d) => d.width > 32)) throw new ConvertError('Signals wider than 32 bits are not supported.', '32 bitten geniş sinyaller desteklenmiyor.');
    if (!given && mod.inputs.concat(mod.outputs).some((p) => (mod.portWidths[p] ?? 1) > 16)) throw new ConvertError('Ports wider than 16 bits are not supported.', '16 bitten geniş portlar desteklenmiyor.');

    // Instances of other modules: taken out of the text, connected below.
    interface Instance { mod: ModuleSrc; conns: Map<string, string>; outputs?: (p: string) => Net[] }
    const instances: Instance[] = [];
    let logic = mod.body.replace(/\b(\w+)\s+(?:#\s*\([^)]*\)\s*)?(\w+)\s*\(([^;]*?)\)\s*;/g, (whole, type: string, _inst: string, args: string) => {
      const sub = modules.get(type);
      if (!sub) return whole;
      const conns = new Map<string, string>();
      if (/^\s*\./.test(args)) {
        for (const c of args.matchAll(/\.(\w+)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) conns.set(c[1], c[2].trim());
      } else {
        const list = args.split(',').map((x) => x.trim());
        [...sub.inputs, ...sub.outputs].forEach((p, i) => { if (list[i]) conns.set(p, list[i]); });
        // Positional order follows the header, not inputs-then-outputs; re-read it.
        const header = sub.text.slice(sub.text.indexOf('(') + 1, sub.text.indexOf(')'));
        const order = [...header.matchAll(/(\w+)\s*(?=,|$)/g)].map((x) => x[1]).filter((p) => sub.inputs.includes(p) || sub.outputs.includes(p));
        if (order.length === list.length) { conns.clear(); order.forEach((p, i) => conns.set(p, list[i])); }
      }
      instances.push({ mod: sub, conns });
      return ' ';
    });
    logic = logic
      .replace(/\b(?:input|output|inout|wire|logic|reg|localparam|parameter)\b[^;]*;/g, ' ')
      .replace(/\b(and|or|xor|nand|nor|xnor|not|buf)\s+(?:\w+\s*)?\(([^)]*)\)\s*;/g, (_m, prim: string, args: string) => {
        const [out, ...ins] = args.split(',').map((x) => x.trim());
        const p = PRIMS[prim];
        const expr = p.op ? ins.join(` ${p.op} `) : ins[0];
        return ` assign ${out} = ${p.invert ? `~(${expr})` : expr}; `;
      })
      .replace(/&&/g, '&')
      .replace(/\|\|/g, '|');
    const arith = /[^*/%]([*/%])[^*/]/.exec(logic.replace(/\/\/.*$/gm, ''));
    if (arith) throw new ConvertError(`The operator "${arith[1]}" cannot be turned into gates here.`, `"${arith[1]}" operatörü burada kapılara dönüştürülemez.`);
    if (/\binitial\b/.test(logic)) throw new ConvertError('initial blocks cannot become gates.', 'initial blokları kapıya dönüştürülemez.');
    const inst = /\b(\w+)\s+(?:#\s*\([^)]*\)\s*)?\w+\s*\(\s*\./.exec(logic);
    if (inst) throw new ConvertError(`Module "${inst[1]}" is used but not defined in this file.`, `"${inst[1]}" modülü kullanılıyor ama bu dosyada tanımlı değil.`);
    let ast;
    try {
      ast = logic.trim() ? new Parser(logic).parseModuleBody() : { continuousAssigns: [], alwaysBlocks: [] };
    } catch (err) {
      throw new ConvertError(`Part of the logic in ${mod.name} uses syntax this converter does not read: ${(err as Error).message}`, `${mod.name} içindeki mantığın bir kısmı okunamayan bir yazım kullanıyor: ${(err as Error).message}`);
    }

    const widthOf = (n: string) => {
      const d = decls.get(n);
      if (!d) throw new ConvertError(`"${n}" is used in ${mod.name} but never declared.`, `"${n}" ${mod.name} içinde kullanılıyor ama tanımlanmamış.`);
      return d.width;
    };
    const constOf = (e: Expr): number => {
      if (e.type === 'Literal') return e.value;
      if (e.type === 'Identifier' && e.name in constants) return constants[e.name];
      throw new ConvertError('Bit selects must use constant indices.', 'Bit seçimlerinde sabit indis kullanılmalı.');
    };

    // Inputs: nets handed in by the parent, or IN/CLK parts at the top.
    const clocks = new Set(ast.alwaysBlocks.filter((b) => b.edge !== 'none' && b.signal).map((b) => b.signal!));
    const inputNets = new Map<string, Net[]>();
    for (const p of mod.inputs) {
      const w = widthOf(p);
      if (given) {
        inputNets.set(p, fit(given.get(p) ?? [], w));
        continue;
      }
      const inNode = node(clocks.has(p) ? 'CLK' : 'IN', p, w > 1 ? { width: w } : {});
      if (w === 1) inputNets.set(p, [{ id: inNode, pin: 0 }]);
      else {
        const sp = node('SPLIT', '', { width: w });
        wires.push({ id: `w${seq++}`, from: inNode, to: sp, pin: 0 });
        inputNets.set(p, Array.from({ length: w }, (_, k) => ({ id: sp, pin: k })));
      }
    }

    // Registers: every bit written in an always_ff gets a D flip-flop.
    const regQ = new Map<string, Net[]>();
    const regFF = new Map<string, string[]>();
    const assignedIn = (s: Stmt, out: Set<string>) => {
      if (s.type === 'Assign') out.add(s.target.name);
      else if (s.type === 'Block') s.statements.forEach((x) => assignedIn(x, out));
      else if (s.type === 'If') { assignedIn(s.thenBranch, out); if (s.elseBranch) assignedIn(s.elseBranch, out); }
      else s.cases.forEach((c) => assignedIn(c.stmt, out));
    };
    for (const b of ast.alwaysBlocks) {
      if (b.edge === 'none') continue;
      if (b.edge === 'negedge') throw new ConvertError('Only posedge clocks are supported.', 'Yalnızca posedge saatler destekleniyor.');
      const names = new Set<string>();
      assignedIn(b.body, names);
      for (const n of names) {
        if (regQ.has(n)) continue;
        const ffs = Array.from({ length: widthOf(n) }, () => node('DFF'));
        regFF.set(n, ffs);
        regQ.set(n, ffs.map((id) => ({ id, pin: 0 })));
      }
    }

    // Drivers of each signal: assigns, instance outputs, always_comb blocks.
    type Driver = { lo: number; hi: number; value?: Expr; inst?: Instance; port?: string };
    const drivers = new Map<string, Driver[]>();
    const addDriver = (target: Expr | { type: 'Identifier'; name: string } | { type: 'BitSelect'; name: string; high: Expr; low?: Expr }, d: Omit<Driver, 'lo' | 'hi'>) => {
      if (target.type !== 'Identifier' && target.type !== 'BitSelect') throw new ConvertError('Only a signal or a bit select can be driven.', 'Yalnızca bir sinyal ya da bit seçimi sürülebilir.');
      const w = widthOf(target.name);
      let lo = 0;
      let hi = w - 1;
      if (target.type === 'BitSelect') {
        const a = constOf(target.high);
        const b = target.low ? constOf(target.low) : a;
        lo = Math.min(a, b);
        hi = Math.max(a, b);
      }
      (drivers.get(target.name) ?? drivers.set(target.name, []).get(target.name)!).push({ lo, hi, ...d });
    };
    for (const a of ast.continuousAssigns) addDriver(a.target, { value: a.value });
    const parseExpr = (text: string): Expr => {
      try {
        return new Parser(text).parseExpr();
      } catch {
        throw new ConvertError(`Could not read the connection "${text}".`, `"${text}" bağlantısı okunamadı.`);
      }
    };
    for (const it of instances) {
      for (const p of it.mod.outputs) {
        const text = it.conns.get(p);
        if (text) addDriver(parseExpr(text), { inst: it, port: p });
      }
    }
    const instanceOutputs = (it: Instance): ((p: string) => Net[]) => {
      if (!it.outputs) {
        const inputs = new Map<string, Net[]>();
        for (const p of it.mod.inputs) {
          const text = it.conns.get(p);
          inputs.set(p, text ? evalExpr(parseExpr(text), new Map()) : []);
        }
        it.outputs = elaborate(it.mod, inputs, depth + 1);
      }
      return it.outputs;
    };

    const resolved = new Map<string, Net[]>();
    const busy = new Set<string>();
    const combBlocks = ast.alwaysBlocks.filter((b) => b.edge === 'none');
    const combOwner = new Map<string, number>();
    combBlocks.forEach((b, i) => { const s = new Set<string>(); assignedIn(b.body, s); s.forEach((n) => combOwner.set(n, i)); });
    const combDone = new Map<number, Map<string, Net[]>>();

    function signal(n: string): Net[] {
      if (inputNets.has(n)) return inputNets.get(n)!;
      if (regQ.has(n)) return regQ.get(n)!;
      if (resolved.has(n)) return resolved.get(n)!;
      if (busy.has(n)) throw new ConvertError(`"${n}" depends on itself without a flip-flop in between (a combinational loop).`, `"${n}" arada flip-flop olmadan kendine bağlı (kombinasyonel döngü).`);
      busy.add(n);
      const w = widthOf(n);
      let bits: Net[];
      if (drivers.has(n)) {
        bits = Array(w).fill(0);
        for (const d of drivers.get(n)!) {
          const v = fit(d.inst ? instanceOutputs(d.inst)(d.port!) : evalExpr(d.value!, new Map()), d.hi - d.lo + 1);
          for (let k = d.lo; k <= d.hi; k++) bits[k] = v[k - d.lo];
        }
      } else if (combOwner.has(n)) {
        const i = combOwner.get(n)!;
        if (!combDone.has(i)) combDone.set(i, runComb(combBlocks[i].body));
        bits = combDone.get(i)!.get(n)!;
      } else throw new ConvertError(`"${n}" is never given a value in ${mod.name}.`, `"${n}" ${mod.name} içinde hiç değer almıyor.`);
      busy.delete(n);
      resolved.set(n, bits);
      return bits;
    }

    /** Bits of an expression, least significant first. `env` overrides signals inside always blocks. */
    function evalExpr(e: Expr, env: Map<string, Net[]>): Net[] {
      const read = (n: string) => env.get(n) ?? signal(n);
      switch (e.type) {
        case 'Literal': {
          const w = e.width ?? Math.max(1, e.value.toString(2).length);
          return Array.from({ length: w }, (_, k) => ((e.value >> k) & 1) as 0 | 1);
        }
        case 'Identifier': {
          if (!decls.has(e.name) && e.name in constants) {
            const v = constants[e.name];
            return Array.from({ length: Math.max(1, v.toString(2).length) }, (_, k) => ((v >> k) & 1) as 0 | 1);
          }
          return read(e.name);
        }
        case 'BitSelect': {
          const bits = read(e.name);
          const hi = constOf(e.high);
          const lo = e.low ? constOf(e.low) : hi;
          return bits.slice(Math.min(hi, lo), Math.max(hi, lo) + 1);
        }
        case 'Concat': {
          const out: Net[] = [];
          for (let i = e.expressions.length - 1; i >= 0; i--) out.push(...evalExpr(e.expressions[i], env));
          return out;
        }
        case 'Unary': {
          const a = evalExpr(e.right, env);
          if (e.operator === '~') return a.map(not);
          if (e.operator === '!') return [not(reduce('OR', a))];
          if (e.operator === '-') return addBits(a.map(not), [], 1, a.length).sum;
          return a;
        }
        case 'Conditional': {
          const s = reduce('OR', evalExpr(e.condition, env));
          const t = evalExpr(e.trueBranch, env);
          const f = evalExpr(e.falseBranch, env);
          const w = Math.max(t.length, f.length);
          return Array.from({ length: w }, (_, k) => mux(s, f[k] ?? 0, t[k] ?? 0));
        }
        case 'Binary': {
          const a = evalExpr(e.left, env);
          const b = evalExpr(e.right, env);
          const w = Math.max(a.length, b.length);
          const A = fit(a, w);
          const B = fit(b, w);
          // A >= B exactly when A - B does not borrow, i.e. A + ~B + 1 carries out.
          const geq = () => addBits(A, B.map(not), 1, w).carry;
          switch (e.operator) {
            case '&': return A.map((x, k) => gate2('AND', x, B[k]));
            case '|': return A.map((x, k) => gate2('OR', x, B[k]));
            case '^': return A.map((x, k) => gate2('XOR', x, B[k]));
            case '~^':
            case '^~': return A.map((x, k) => not(gate2('XOR', x, B[k])));
            case '==': return [not(reduce('OR', A.map((x, k) => gate2('XOR', x, B[k]))))];
            case '!=': return [reduce('OR', A.map((x, k) => gate2('XOR', x, B[k])))];
            case '>=': return [geq()];
            case '<': return [not(geq())];
            case '>': return [not(addBits(B, A.map(not), 1, w).carry)];
            case '<=': return [addBits(B, A.map(not), 1, w).carry];
            // One extra bit keeps the carry; the assignment trims to its target width.
            case '+': return addBits([...A, 0], [...B, 0], 0, w + 1).sum;
            case '-': return addBits(A, B.map(not), 1, w).sum;
            case '<<':
            case '>>': {
              let n: number;
              try {
                n = constOf(e.right);
              } catch {
                throw new ConvertError('Shifts by a variable amount are not supported.', 'Değişken miktarda kaydırma desteklenmiyor.');
              }
              return e.operator === '<<' ? [...Array(n).fill(0), ...a] : a.slice(n);
            }
            default:
              throw new ConvertError(`The operator "${e.operator}" cannot be turned into gates here.`, `"${e.operator}" operatörü burada kapılara dönüştürülemez.`);
          }
        }
      }
    }

    /** Runs statements symbolically: blocking assigns update `env`; `<=` in always_ff reads the flip-flops. */
    function runStmt(s: Stmt, env: Map<string, Net[]>, readEnv: Map<string, Net[]>, sequential: boolean) {
      if (s.type === 'Assign') {
        const t = s.target;
        const w = widthOf(t.name);
        const current = env.get(t.name) ?? (sequential ? regQ.get(t.name)! : Array(w).fill(undefined));
        const next = [...current];
        let lo = 0;
        let hi = w - 1;
        if (t.type === 'BitSelect') {
          const a = constOf(t.high);
          const b = t.low ? constOf(t.low) : a;
          lo = Math.min(a, b);
          hi = Math.max(a, b);
        }
        const v = fit(evalExpr(s.value, sequential ? readEnv : env), hi - lo + 1);
        for (let k = lo; k <= hi; k++) next[k] = v[k - lo];
        env.set(t.name, next);
      } else if (s.type === 'Block') {
        s.statements.forEach((x) => runStmt(x, env, readEnv, sequential));
      } else if (s.type === 'If') {
        const c = reduce('OR', evalExpr(s.condition, sequential ? readEnv : env));
        const a = new Map(env);
        const b = new Map(env);
        runStmt(s.thenBranch, a, readEnv, sequential);
        if (s.elseBranch) runStmt(s.elseBranch, b, readEnv, sequential);
        mergeInto(env, c, a, b, sequential);
      } else {
        const sel = evalExpr(s.condition, sequential ? readEnv : env);
        const items = s.cases.filter((x) => x.value !== 'default');
        const dflt = s.cases.find((x) => x.value === 'default');
        const build = (i: number, into: Map<string, Net[]>) => {
          if (i >= items.length) {
            if (dflt) runStmt(dflt.stmt, into, readEnv, sequential);
            return;
          }
          const v = evalExpr(items[i].value as Expr, env);
          const w = Math.max(sel.length, v.length);
          const c = not(reduce('OR', fit(sel, w).map((x, k) => gate2('XOR', x, fit(v, w)[k]))));
          const a = new Map(into);
          const b = new Map(into);
          runStmt(items[i].stmt, a, readEnv, sequential);
          build(i + 1, b);
          mergeInto(into, c, a, b, sequential);
        };
        build(0, env);
      }
    }
    function mergeInto(env: Map<string, Net[]>, c: Net, a: Map<string, Net[]>, b: Map<string, Net[]>, sequential: boolean) {
      for (const n of new Set([...a.keys(), ...b.keys()])) {
        const w = widthOf(n);
        const base = sequential ? regQ.get(n)! : Array(w).fill(undefined);
        const x = a.get(n) ?? base;
        const y = b.get(n) ?? base;
        env.set(n, Array.from({ length: w }, (_, k) => {
          if (x[k] === undefined || y[k] === undefined) {
            if (x[k] === undefined && y[k] === undefined) return undefined as unknown as Net;
            throw new ConvertError(`"${n}" is not given a value on every path of an always_comb block (that would be a latch).`, `"${n}" always_comb bloğunun her yolunda değer almıyor (bu bir latch olurdu).`);
          }
          return mux(c, y[k], x[k]);
        }));
      }
    }
    function runComb(body: Stmt): Map<string, Net[]> {
      const env = new Map<string, Net[]>();
      runStmt(body, env, env, false);
      for (const [n, bits] of env) if (bits.some((x) => x === undefined)) throw new ConvertError(`"${n}" is not fully assigned in its always_comb block.`, `"${n}" always_comb bloğunda tam atanmıyor.`);
      return env;
    }

    // Sequential blocks: the next values feed the D inputs.
    for (const b of ast.alwaysBlocks) {
      if (b.edge === 'none') continue;
      const env = new Map<string, Net[]>();
      runStmt(b.body, env, new Map(), true);
      const clk = signal(b.signal!)[0];
      for (const [n, bits] of env) {
        regFF.get(n)!.forEach((ff, k) => {
          wire(bits[k] ?? 0, ff, 0);
          wire(clk, ff, 1);
        });
      }
    }

    if (!given) {
      for (const p of mod.outputs) {
        const bits = signal(p);
        const w = widthOf(p);
        const out = node('OUT', p);
        if (w === 1) wire(bits[0], out, 0);
        else {
          const m = node('MERGE', '', { width: w });
          bits.forEach((x, k) => wire(x, m, k));
          wires.push({ id: `w${seq++}`, from: m, to: out, pin: 0 });
        }
      }
    }
    return (port: string) => fit(signal(port), widthOf(port));
  }

  elaborate(modules.get(top)!, null, 0);
  return { circuit: { nodes, wires }, name: top };
}
