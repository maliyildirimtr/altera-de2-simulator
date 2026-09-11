# Simulation Engine Documentation

> **EELab — Phase 1 Architecture Reference**
> Status: current as of Phase 1. Update this file when engines change.

---

## Overview

EELab uses **three separate, independent simulation/synthesis engines**. They serve different tools and are deliberately kept isolated — they are not wrappers of each other, and they should not be merged.

```
┌──────────────────────────────────────────────────────────────┐
│                       Browser Tab                            │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────── │
│  │  DE2 Simulator  │  │    Waveform     │  │   Schematic  │ │
│  │  /de2-simulator │  │    /waveform    │  │  /schematic  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬─────── │
│           │                    │                   │        │
│  ┌────────▼────────┐  ┌────────▼────────┐  ┌──────▼─────── │
│  │  JS Verilog     │  │  Icarus Verilog │  │  Yosys Wasm  │ │
│  │  Evaluator      │  │  (Wasm Worker)  │  │ + DigitalJS  │ │
│  │  (Main thread)  │  │  (Web Worker)   │  │ (Main thread)│ │
│  └─────────────────┘  └─────────────────┘  └────────────── │
└──────────────────────────────────────────────────────────────┘
```

---

## Engine 1 — JS Verilog Evaluator

**Used by:** DE2 Simulator (`/de2-simulator`)  
**Files:** `src/core/simulator/verilogEngine.ts`, `src/core/simulator/graphEvaluator.ts`  
**Thread:** Main thread (synchronous)

### How it works

1. `verilogEngine.ts` parses Verilog source text into an internal AST-like module graph: wires, registers, `assign` statements, `always` blocks, and sub-module instantiations.
2. For combinational logic, it generates a JavaScript function string and compiles it with `new Function()` for fast repeated evaluation.
3. For sequential logic (`always @(posedge clk)`), it captures register state between clock ticks.
4. `graphEvaluator.ts` provides a port-connection graph that the DE2 board state (boardStore) uses to route signal values between the HDL module outputs and the physical board UI (switches → inputs, outputs → LEDs/7-seg).

### Supported subset

| Construct | Supported |
|---|---|
| `wire`, `reg`, `logic` | ✅ |
| `assign` (combinational) | ✅ |
| `always @(posedge clk)` | ✅ |
| `always @(*)` / `always_comb` | ✅ |
| `if/else` in always | ✅ |
| `case` / `casez` | ✅ |
| Multi-bit vectors `[N:0]` | ✅ |
| Module instantiation | ✅ |
| `parameter` | ⚠️ Partial |
| `generate` | ❌ |
| Tri-state (`z` / `bz`) | ❌ |
| `x` propagation | ❌ |
| `task` / `function` | ❌ |
| Multi-dimensional arrays | ❌ |
| `interface` / `package` | ❌ |

### Known issues / limitations

- `new Function()` usage is a **security concern** (tracked as SEC-001). Should be sandboxed inside a dedicated Worker in a future phase.
- Does not model timing — all evaluation is zero-delay combinational.
- Does not detect race conditions.
- Maximum practical design complexity: ~50 gates / 5 sub-modules before performance degrades.

---

## Engine 2 — Icarus Verilog (WebAssembly)

**Used by:** Waveform (`/waveform`)  
**Files:** `src/workers/compiler.worker.ts`, `src/services/hardwareSimulator.ts`  
**Thread:** Dedicated Web Worker (persistent singleton)

### How it works

1. User writes HDL + testbench in the Monaco editor.
2. `hardwareSimulator.ts` sends files to the persistent Web Worker via `postMessage`.
3. Inside the Worker (`compiler.worker.ts`):
   a. `ivlpp.wasm` preprocesses source files (macro expansion, `include`).
   b. `ivl.wasm` compiles the preprocessed Verilog into an `.vvp` intermediate format.
   c. `vvp.wasm` simulates the compiled design and writes a VCD (Value Change Dump) file.
   d. The VCD is parsed inside the Worker into a `SimulationData` structure.
4. The Worker sends `SimulationData` back to the UI thread.
5. `WaveformSimulator.tsx` renders the signals as timing diagrams on a canvas.

### Worker lifecycle

```
First request  → Worker created, Wasm modules loaded (~2-5 s)
All subsequent → Same Worker instance, Wasm already in memory (~instant)
Worker crash   → All pending requests rejected; Worker reset to null; next request spawns fresh Worker
```

### Supported subset

Icarus Verilog 12.x WebAssembly — same language support as iverilog on the command line, minus:

| Feature | Status |
|---|---|
| Full IEEE 1364-2005 Verilog | ✅ |
| SystemVerilog (IEEE 1800-2012) subset | ✅ |
| `$dumpfile` / `$dumpvars` auto-inject | ✅ (compiler.worker does this automatically) |
| OOP (`class`, `interface`, `package`) | ❌ |
| PLI / VPI plugins | ❌ |
| File I/O (`$fopen`, `$readmemh`) | ❌ |
| Multithreaded simulation | ❌ (single-threaded Wasm) |

### Known issues / limitations

- First compile is slow (Wasm cold start). Tracked as PERF-001 in the improvement plan.
- VCD parser logic is currently duplicated: once in `compiler.worker.ts` and once in `src/services/vcdParser.ts`. Tracked as BUG-002.
---

## Engine 3 — Yosys (WebAssembly) + DigitalJS

**Used by:** Schematic (`/schematic`)  
**Files:** `src/services/synthesizer.ts`, `src/pages/SchematicPage.tsx`, `src/components/SchematicWorkspace/SchematicViewport.tsx`  
**Thread:** Main thread (Yosys is async/Promise; DigitalJS is synchronous DOM manipulation)

### How it works

1. User writes Verilog/SystemVerilog in the Monaco editor.
2. `synthesizer.ts` calls `@yowasp/yosys` (`runYosys`) with a virtual in-memory file system.
3. Yosys runs the following synthesis script: `read_verilog → hierarchy → proc → opt_clean → clean → write_json`
4. The JSON netlist is passed to `yosys2digitaljs` which converts it to DigitalJS circuit format.
5. `SchematicViewport.tsx` mounts a DigitalJS `Circuit` object into a DOM div, which jQuery + DigitalJS use to render an interactive SVG schematic.
6. CSS overrides in `index.css` (DigitalJS Overrides section) re-theme the SVG elements for the dark mode.

### Supported subset

Yosys synthesis, not simulation:

| Feature | Status |
|---|---|
| Combinational logic | ✅ |
| Sequential (flip-flops via `proc`) | ✅ |
| Optional optimization (`opt`, `memory`) | ✅ (toggle in UI) |
| Memory inference | ⚠️ Partial (with `-nomap`) |
| Large designs (>200 gates) | ⚠️ May be slow |
| Full simulation with stimulus | ❌ (synthesis only) |

### Known issues / limitations

- **jQuery dependency:** DigitalJS requires jQuery and jQuery UI, loaded from CDN in `index.html`. This is ~200 KB of additional payload on every page load, not just the Schematic page. Code-splitting (lazy loading DigitalJS + jQuery) is tracked as PERF-003.
- `@ts-ignore` is used on the `yosys2digitaljs` import (SEC-002) due to missing type definitions.
- `synthesizer.ts:23` previously mutated the input `file.name` directly (BUG-003 — fixed: now uses a local `fileName` variable).

---

## Inter-Engine Isolation Rules

These rules apply for all future development:

1. **No shared state** between engines. Each engine owns its own data lifecycle.
2. **No engine merging.** The JS evaluator and Icarus Wasm serve different tools with fundamentally different requirements.
3. **The DE2 Simulator stays JS-engine-only.** Adding Icarus Wasm to the DE2 tool would add cold-start latency that is unacceptable for interactive board simulation.
4. **The Waveform tool stays Icarus-engine-only.** The JS evaluator cannot produce VCD output or handle full testbenches.
5. **New tools may introduce new engines** (e.g., SPICE, VHDL). Each engine should live in `src/core/<engine-name>/` with a clear README.
