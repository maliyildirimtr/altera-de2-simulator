/**
 * Logic-analyzer capture for the DE2 simulator.
 *
 * Subscribes to the board store (read-only) and records the value of every
 * top-level port each time the design is evaluated — a switch flip, a key
 * press or a clock tick. Samples live in a fixed-size ring so memory stays
 * bounded however long the simulation runs. Recording never writes back to
 * the store, so it cannot change simulation behaviour.
 */
import { useBoardStore } from '../store/boardStore';

export const MAX_SAMPLES = 256;

export interface Sample {
  /** Monotonic evaluation counter since the last reset. */
  n: number;
  values: Record<string, number>;
}

export interface Capture {
  signals: string[];
  widths: Record<string, number>;
  samples: Sample[];
  version: number;
}

let capture: Capture = { signals: [], widths: {}, samples: [], version: 0 };
let paused = false;

/* ── Trigger ────────────────────────────────────────────────────────────
 * Like a bench logic analyzer: once armed, capture runs until the condition
 * is met, keeps POST_TRIGGER_SAMPLES more samples so the event sits in the
 * middle of the buffer, then pauses by itself. */
export type TriggerCondition = 'rise' | 'fall' | 'change' | 'equals';

export interface TriggerConfig {
  signal: string;
  condition: TriggerCondition;
  /** Compared value for 'equals'. */
  value: number;
}

export type TriggerStatus = 'off' | 'armed' | 'triggered' | 'done';

export const POST_TRIGGER_SAMPLES = MAX_SAMPLES / 2;

let trigger: TriggerConfig | null = null;
let triggerStatus: TriggerStatus = 'off';
let triggerN: number | null = null;
let postRemaining = 0;

function triggerMatches(cfg: TriggerConfig, prev: number | undefined, next: number): boolean {
  switch (cfg.condition) {
    case 'rise': return prev !== undefined && (prev & 1) === 0 && (next & 1) === 1;
    case 'fall': return prev !== undefined && (prev & 1) === 1 && (next & 1) === 0;
    case 'change': return prev !== undefined && prev !== next;
    case 'equals': return next === cfg.value && prev !== next;
  }
}
let counter = 0;
const listeners = new Set<() => void>();
let started = false;

function emit() {
  capture = { ...capture, version: capture.version + 1 };
  listeners.forEach((l) => l());
}

function signalsFor(engine: ReturnType<typeof useBoardStore.getState>['engine']): { signals: string[]; widths: Record<string, number> } {
  if (!engine) return { signals: [], widths: {} };
  const seen = new Set<string>();
  const signals: string[] = [];
  for (const s of [...engine.inputs, ...engine.outputs]) {
    if (!seen.has(s)) { seen.add(s); signals.push(s); }
  }
  const widths: Record<string, number> = {};
  for (const s of signals) widths[s] = Math.max(1, engine.portWidths?.[s] ?? 1);
  return { signals, widths };
}

function readValue(state: Record<string, number>, name: string, width: number): number {
  const v = state[name];
  if (typeof v === 'number' && Number.isFinite(v)) return width >= 32 ? v >>> 0 : v & ((1 << width) - 1);
  // Per-bit spellings the engine may produce for vectors: NAME_0 / NAME[0]
  let packed = 0;
  let any = false;
  for (let i = 0; i < width && i < 31; i++) {
    const b = state[`${name}_${i}`] ?? state[`${name}[${i}]`];
    if (typeof b === 'number') { any = true; if (b) packed |= 1 << i; }
  }
  return any ? packed : 0;
}

export function startSignalRecorder(): void {
  if (started) return;
  started = true;
  const initial = signalsFor(useBoardStore.getState().engine);
  capture = { ...capture, signals: initial.signals, widths: initial.widths };
  useBoardStore.subscribe((s, prev) => {
    if (s.engine !== prev.engine) {
      const { signals, widths } = signalsFor(s.engine);
      counter = 0;
      capture = { signals, widths, samples: [], version: capture.version };
      triggerN = null;
      if (trigger && !signals.includes(trigger.signal)) trigger = null;
      triggerStatus = trigger ? 'armed' : 'off';
      emit();
    }
    if (paused || !s.engine || s.simState === prev.simState) return;
    const values: Record<string, number> = {};
    for (const sig of capture.signals) {
      values[sig] = sig === 'CLOCK_50' ? s.clockState : readValue(s.simState, sig, capture.widths[sig] ?? 1);
    }
    const prevSample = capture.samples[capture.samples.length - 1];
    const samples = capture.samples.length >= MAX_SAMPLES ? capture.samples.slice(1) : capture.samples.slice();
    const n = counter++;
    samples.push({ n, values });
    capture = { ...capture, samples };

    if (trigger && triggerStatus === 'armed' && trigger.signal in values) {
      if (triggerMatches(trigger, prevSample?.values[trigger.signal], values[trigger.signal])) {
        triggerStatus = 'triggered';
        triggerN = n;
        postRemaining = POST_TRIGGER_SAMPLES;
      }
    } else if (triggerStatus === 'triggered') {
      postRemaining -= 1;
      if (postRemaining <= 0) {
        triggerStatus = 'done';
        paused = true;
      }
    }
    emit();
  });
}

export function getCapture(): Capture { return capture; }
export function subscribeCapture(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
export function clearCapture(): void {
  counter = 0;
  capture = { ...capture, samples: [] };
  triggerN = null;
  if (trigger) {
    triggerStatus = 'armed';
    paused = false;
  }
  emit();
}

/** Arm (or with `null`, disarm) the trigger. Arming resumes a paused capture. */
export function setTrigger(cfg: TriggerConfig | null): void {
  trigger = cfg;
  triggerN = null;
  triggerStatus = cfg ? 'armed' : 'off';
  if (cfg) paused = false;
  emit();
}
export function getTrigger(): TriggerConfig | null { return trigger; }
export function getTriggerStatus(): TriggerStatus { return triggerStatus; }
/** Sample number (`Sample.n`) at which the trigger fired, if it has. */
export function getTriggerSample(): number | null { return triggerN; }

/**
 * The capture as a Value Change Dump. The analyzer has no wall-clock time
 * base — it samples on every evaluation — so one time unit is one sample.
 */
export function captureToVcd(cap: Capture = capture, moduleName = 'de2_board'): string {
  const ids = cap.signals.map((_, i) => {
    let id = '';
    let k = i;
    do { id += String.fromCharCode(33 + (k % 94)); k = Math.floor(k / 94); } while (k > 0);
    return id;
  });
  const lines: string[] = [
    '$date ' + new Date().toISOString() + ' $end',
    '$version Logic Lab DE2 logic analyzer $end',
    '$comment one time unit = one board evaluation (sample) $end',
    '$timescale 1ns $end',
    `$scope module ${moduleName} $end`,
  ];
  cap.signals.forEach((sig, i) => {
    const w = cap.widths[sig] ?? 1;
    lines.push(`$var wire ${w} ${ids[i]} ${sig.replace(/\s+/g, '_')} $end`);
  });
  lines.push('$upscope $end', '$enddefinitions $end');
  const fmt = (v: number, w: number, id: string) =>
    w <= 1 ? `${v & 1}${id}` : `b${(v >>> 0).toString(2).slice(-w)} ${id}`;
  const first = cap.samples[0]?.n ?? 0;
  let prev: Record<string, number> | null = null;
  for (const sample of cap.samples) {
    const changes: string[] = [];
    cap.signals.forEach((sig, i) => {
      const v = sample.values[sig] ?? 0;
      if (!prev || prev[sig] !== v) changes.push(fmt(v, cap.widths[sig] ?? 1, ids[i]));
    });
    if (changes.length) {
      lines.push(`#${sample.n - first}`);
      if (!prev) lines.push('$dumpvars', ...changes, '$end');
      else lines.push(...changes);
    }
    prev = sample.values;
  }
  const last = cap.samples[cap.samples.length - 1];
  if (last) lines.push(`#${last.n - first + 1}`);
  return lines.join('\n') + '\n';
}
export function setCapturePaused(p: boolean): void { paused = p; emit(); }
export function isCapturePaused(): boolean { return paused; }
