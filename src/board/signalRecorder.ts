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
      emit();
    }
    if (paused || !s.engine || s.simState === prev.simState) return;
    const values: Record<string, number> = {};
    for (const sig of capture.signals) {
      values[sig] = sig === 'CLOCK_50' ? s.clockState : readValue(s.simState, sig, capture.widths[sig] ?? 1);
    }
    const samples = capture.samples.length >= MAX_SAMPLES ? capture.samples.slice(1) : capture.samples.slice();
    samples.push({ n: counter++, values });
    capture = { ...capture, samples };
    emit();
  });
}

export function getCapture(): Capture { return capture; }
export function subscribeCapture(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
export function clearCapture(): void { counter = 0; capture = { ...capture, samples: [] }; emit(); }
export function setCapturePaused(p: boolean): void { paused = p; emit(); }
export function isCapturePaused(): boolean { return paused; }
