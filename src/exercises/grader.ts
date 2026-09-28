/**
 * Automatic checking of combinational exercises.
 *
 * Both the reference solution and the student's code are compiled with the
 * DE2 simulator's own TypeScript engine and evaluated on every input
 * combination. The result is a truth table with each row marked as matching or
 * not. No browser, network or WebAssembly is involved, so checking is instant.
 */
import { compileVerilog, type VerilogModule } from '../core/simulator/verilogEngine';

export interface Port {
  name: string;
  width: number;
}

export interface TruthRow {
  /** Clock cycle number, for sequential exercises only. */
  cycle?: number;
  inputs: Record<string, number>;
  expected: Record<string, number>;
  actual: Record<string, number> | null;
  ok: boolean;
}

export type GradeResult =
  | { kind: 'compile-error'; message: string }
  | { kind: 'unsupported'; message: string }
  | { kind: 'port-mismatch'; message: string; missing: string[]; extra: string[] }
  | {
      kind: 'graded';
      rows: TruthRow[];
      passed: number;
      total: number;
      inputs: Port[];
      outputs: Port[];
      /** Outputs the design never drove in any row. */
      undriven: string[];
    };

/**
 * A clocked exercise: instead of every input combination, the design is run
 * through a fixed list of cycles. For each step the inputs are applied with
 * the clock low, the clock rises once, and the outputs are read.
 */
export interface SequentialSpec {
  clock: string;
  steps: ReadonlyArray<Record<string, number>>;
}

/** Most input bits enumerated (2^10 = 1024 rows). */
export const MAX_INPUT_BITS = 10;

function ports(engine: VerilogModule, names: string[]): Port[] {
  return names.map((name) => ({ name, width: Math.max(1, engine.portWidths?.[name] ?? 1) }));
}

function mask(width: number): number {
  return width >= 31 ? 0x7fffffff : (1 << width) - 1;
}

/** Read a port from an evaluated state, whichever spelling the engine used. */
export function readPort(state: Record<string, number>, name: string, width: number): number {
  const v = state[name];
  if (typeof v === 'number' && Number.isFinite(v)) return v & mask(width);
  let packed = 0;
  let found = false;
  for (let i = 0; i < width && i < 31; i++) {
    const b = state[`${name}_${i}`] ?? state[`${name}[${i}]`];
    if (typeof b === 'number') found = true;
    if (b) packed |= 1 << i;
  }
  // NaN marks an output the design never drives, so it can never "match".
  return found ? packed : Number.NaN;
}

function drive(inputs: Port[], combo: number): Record<string, number> {
  const values: Record<string, number> = {};
  let shift = 0;
  // Earlier ports are more significant, like reading a truth table left to right.
  for (let i = inputs.length - 1; i >= 0; i--) {
    const p = inputs[i];
    values[p.name] = (combo >> shift) & mask(p.width);
    shift += p.width;
  }
  return values;
}

function withBits(values: Record<string, number>, inputs: Port[]): Record<string, number> {
  // Also offer per-bit spellings so either representation of a vector input works.
  const out: Record<string, number> = { ...values };
  for (const p of inputs) {
    if (p.width === 1) continue;
    for (let i = 0; i < p.width; i++) {
      const bit = (values[p.name] >> i) & 1;
      out[`${p.name}_${i}`] = bit;
      out[`${p.name}[${i}]`] = bit;
    }
  }
  return out;
}

function evaluate(engine: VerilogModule, values: Record<string, number>, inputs: Port[], outputs: Port[]): Record<string, number> {
  const driven = withBits(values, inputs);
  let state = engine.evaluate(driven, { ...driven });
  // A second pass lets chains of continuous assignments settle.
  state = engine.evaluate(driven, { ...state, ...driven });
  const result: Record<string, number> = {};
  for (const o of outputs) result[o.name] = readPort(state, o.name, o.width);
  return result;
}

function runSequence(
  engine: VerilogModule,
  inputs: Port[],
  outputs: Port[],
  spec: SequentialSpec,
): TruthRow[] {
  const rows: TruthRow[] = [];
  let state: Record<string, number> = {};
  spec.steps.forEach((step, cycle) => {
    const iv: Record<string, number> = {};
    for (const p of inputs) iv[p.name] = (step[p.name] ?? 0) & mask(p.width);
    const driven = withBits(iv, inputs);
    // Clock low: inputs settle, no edge.
    state = engine.evaluate({ ...driven, [spec.clock]: 0 }, { ...state, ...driven, [spec.clock]: 0 });
    // Rising edge: sequential blocks fire exactly once.
    state = engine.evaluate({ ...driven, [spec.clock]: 1 }, { ...state, ...driven, [spec.clock]: 1 });
    // Clock still high: combinational logic settles on the new register values.
    state = engine.evaluate({ ...driven, [spec.clock]: 1 }, { ...state, ...driven });
    const out: Record<string, number> = {};
    for (const o of outputs) out[o.name] = readPort(state, o.name, o.width);
    rows.push({ cycle, inputs: iv, expected: out, actual: null, ok: true });
  });
  return rows;
}

export function referencePorts(reference: string): { inputs: Port[]; outputs: Port[] } {
  const ref = compileVerilog(reference);
  return { inputs: ports(ref, ref.inputs), outputs: ports(ref, ref.outputs) };
}

/** Truth table (or cycle table) of the reference solution alone (shown as the goal). */
export function expectedTable(
  reference: string,
  sequential?: SequentialSpec,
): { inputs: Port[]; outputs: Port[]; rows: TruthRow[] } {
  const ref = compileVerilog(reference);
  const inputs = ports(ref, ref.inputs.filter((n) => n !== sequential?.clock));
  const outputs = ports(ref, ref.outputs);
  if (sequential) return { inputs, outputs, rows: runSequence(ref, inputs, outputs, sequential) };
  const bits = inputs.reduce((n, p) => n + p.width, 0);
  const rows: TruthRow[] = [];
  for (let combo = 0; combo < 1 << Math.min(bits, MAX_INPUT_BITS); combo++) {
    const iv = drive(inputs, combo);
    const expected = evaluate(ref, iv, inputs, outputs);
    rows.push({ inputs: iv, expected, actual: null, ok: true });
  }
  return { inputs, outputs, rows };
}

export function gradeSubmission(reference: string, submission: string, sequential?: SequentialSpec): GradeResult {
  let student: VerilogModule;
  try {
    student = compileVerilog(submission);
  } catch (err) {
    return { kind: 'compile-error', message: (err as Error)?.message || 'The design could not be compiled.' };
  }
  if (!/\bmodule\b[\s\S]*\bendmodule\b/.test(submission.replace(/\/\/.*$/gm, ''))) {
    return { kind: 'compile-error', message: 'No complete module … endmodule block was found.' };
  }
  const goal = expectedTable(reference, sequential);
  const want = [...goal.inputs, ...goal.outputs].map((p) => p.name);
  if (sequential) want.push(sequential.clock);
  const have = [...student.inputs, ...student.outputs];
  const missing = want.filter((n) => !have.includes(n));
  const extra = have.filter((n) => !want.includes(n));
  const dirMismatch =
    goal.inputs.some((p) => !student.inputs.includes(p.name)) ||
    goal.outputs.some((p) => !student.outputs.includes(p.name)) ||
    (sequential !== undefined && !student.inputs.includes(sequential.clock));
  if (missing.length > 0 || dirMismatch) {
    return {
      kind: 'port-mismatch',
      message: 'The module ports must match the exercise exactly (names and directions).',
      missing,
      extra,
    };
  }
  if (student.transpileError) {
    return { kind: 'unsupported', message: student.transpileError };
  }
  let passed = 0;
  let studentRows: TruthRow[] | null = null;
  if (sequential) {
    try {
      studentRows = runSequence(student, goal.inputs, goal.outputs, sequential);
    } catch {
      studentRows = null;
    }
  }
  const rows = goal.rows.map((row, i) => {
    let actual: Record<string, number>;
    try {
      actual = sequential ? studentRows?.[i]?.expected ?? {} : evaluate(student, row.inputs, goal.inputs, goal.outputs);
    } catch {
      actual = {};
    }
    const ok = goal.outputs.every((o) => actual[o.name] === row.expected[o.name]);
    if (ok) passed++;
    return { ...row, actual, ok };
  });
  const undriven = goal.outputs
    .filter((o) => rows.every((r) => r.actual === null || Number.isNaN(r.actual[o.name])))
    .map((o) => o.name);
  return { kind: 'graded', rows, passed, total: rows.length, inputs: goal.inputs, outputs: goal.outputs, undriven };
}
