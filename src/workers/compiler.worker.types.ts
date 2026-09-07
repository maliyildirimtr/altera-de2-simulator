// ============================================================
// compiler.worker.types.ts — Shared types (main thread ↔ worker)
//
// F2.2: Added requestId for persistent worker multiplexing.
// F2.5: CompilerOutput now carries pre-parsed SimulationData
//       so the UI thread never blocks on VCD parsing.
// ============================================================

// ── Inlined minimal VCD types (worker cannot import from src/) ─
export interface VCDTransition {
  time: number;
  val: number | string; // 0 | 1 | 'x' | 'z' | binary-string (bus)
}

export interface VCDSignal {
  name: string;
  type: string;
  width: number;
  symbol: string;
  transitions: VCDTransition[];
  isTopLevel?: boolean;
}

export interface VCDScope {
  name: string;
  type: string;
  children: Record<string, VCDScope>;
  signals: Record<string, VCDSignal>;
}

export interface VCDTimescale {
  magnitude: number;
  unit: 'fs' | 'ps' | 'ns' | 'us' | 'ms' | 's';
  toPsFactor: number;
}

/** Pre-parsed simulation data returned by the worker.
 *  Structurally compatible with SimulationData (vcdParser.ts).
 *  The `logs` field is optional here; the main thread attaches
 *  compiler logs before calling initSimulationData(). */
export interface ParsedSimulationData {
  maxTime: number;
  signals: VCDSignal[];
  tree: VCDScope;
  timescale: VCDTimescale;
  logs?: string[]; // optional — populated by main thread after merge
}

// ── Worker message protocol ────────────────────────────────────
export interface CompilerInput {
  /** Unique ID — echoed back in CompilerOutput for request matching. */
  requestId: number;
  files: { name: string; content: string }[];
  activeFile?: string;
}

export interface CompilerOutput {
  /** Echoed from CompilerInput — used by the persistent worker pool. */
  requestId: number;
  status: 'ok' | 'error';
  /** F2.5: pre-parsed simulation data (undefined on error). */
  simulationData?: ParsedSimulationData;
  /** Raw VCD string is no longer sent to the main thread. */
  vcdOutput: string;   // kept for backward-compat; always '' after F2.5
  logs: string[];
}
