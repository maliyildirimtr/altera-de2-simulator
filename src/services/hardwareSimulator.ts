// ============================================================
// hardwareSimulator.ts — Wasm Simulation Bridge
//
// F2.2: PERSISTENT WORKER POOL
//   Önceki davranış: Her Compile'da yeni Worker başlatılıp
//   iş bitince terminate() ediliyordu. Bu, Wasm modüllerinin
//   (ivlpp, ivl, vvp) her seferinde yeniden yüklenmesine yol
//   açıyordu (~2-5 sn maliyet).
//
//   Yeni davranış: Worker ilk çağrıda bir kez oluşturulur ve
//   kalıcı olarak açık tutulur. Sonraki istekler aynı Worker'a
//   iletilir. requestId tabanlı Map ile birden fazla eşzamanlı
//   isteği güvenle yönetebilir.
//
// F2.5: VCD parse işlemi artık Worker içinde yapılır.
//   UI thread'e SimulationData direkt gelir, vcdOutput boştur.
// ============================================================

import type { CompilerInput, CompilerOutput, CompilerPhase } from '../workers/compiler.worker.types';
import type { SimulationData } from './vcdParser';

export interface ProjectFile {
  name: string;
  type: string;
  content: string;
}

export interface SimulationResult {
  status: 'ok' | 'error' | 'pending';
  /** F2.5: pre-parsed data from worker (undefined on error) */
  simulationData?: SimulationData;
  /** kept for .vcd file direct-load path; empty for Wasm path */
  vcdOutput: string;
  logs: string[];
}

// ── F2.2: Persistent Worker Singleton ─────────────────────────
let _worker: Worker | null = null;
let _requestCounter        = 0;

/** Pending promise callbacks keyed by requestId. */
const _pending = new Map<number, {
  resolve: (r: SimulationResult) => void;
  timer?: ReturnType<typeof setTimeout>;
}>();

/**
 * A testbench without `$finish` (or with a free-running `always #5 clk = ~clk`)
 * makes vvp run forever. The worker is single-threaded, so every later run
 * would queue behind it and the waveform tool would appear frozen. After this
 * long in the simulation phase the worker is terminated and recreated.
 */
export const SIMULATION_TIMEOUT_MS = 20_000;

function killWorker(reason: string): void {
  const worker = _worker;
  _worker = null;
  worker?.terminate();
  for (const [, { resolve, timer }] of _pending) {
    if (timer) clearTimeout(timer);
    resolve({ status: 'error', vcdOutput: '', logs: [reason] });
  }
  _pending.clear();
}

function getOrCreateWorker(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    new URL('../workers/compiler.worker.ts', import.meta.url),
    { type: 'module' },
  );

  _worker.onmessage = (event: MessageEvent<CompilerOutput | CompilerPhase>) => {
    if ('phase' in event.data) {
      const entry = _pending.get(event.data.requestId);
      if (entry && !entry.timer) {
        entry.timer = setTimeout(() => {
          killWorker(
            `[ERROR] Simulation did not finish within ${SIMULATION_TIMEOUT_MS / 1000} s and was stopped. ` +
              'Make sure the testbench ends with $finish (a free-running clock never stops on its own).',
          );
        }, SIMULATION_TIMEOUT_MS);
      }
      return;
    }
    const { requestId, status, simulationData, vcdOutput, logs } = event.data;
    const pending = _pending.get(requestId);
    if (!pending) return; // stale / already resolved
    if (pending.timer) clearTimeout(pending.timer);
    _pending.delete(requestId);
    pending.resolve({ status, simulationData: simulationData as SimulationData | undefined, vcdOutput, logs });
  };

  _worker.onerror = (err) => {
    // On a fatal Worker crash, reject ALL pending requests and reset.
    for (const [, { resolve, timer }] of _pending) {
      if (timer) clearTimeout(timer);
      resolve({
        status: 'error',
        vcdOutput: '',
        logs: ['[WORKER] Compiler worker crashed; restarting.', `[ERROR] ${err.message}`],
      });
    }
    _pending.clear();
    _worker = null; // next call will spawn a fresh one
  };

  return _worker;
}

/**
 * simulateSystemVerilog
 *
 * Sends source files to the persistent compiler Web Worker.
 * Returns a Promise<SimulationResult> that resolves when the
 * worker finishes compilation, simulation, and VCD parsing.
 */
export function simulateSystemVerilog(
  files: ProjectFile[],
  activeFile?: string,
): Promise<SimulationResult> {
  return new Promise((resolve) => {
    const requestId = ++_requestCounter;

    const input: CompilerInput = {
      requestId,
      files: files.map(f => ({ name: f.name, content: f.content })),
      ...(activeFile ? { activeFile } : {}),
    };

    _pending.set(requestId, { resolve });
    getOrCreateWorker().postMessage(input);
  });
}
