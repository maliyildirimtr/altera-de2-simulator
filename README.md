# Logic Lab

Production URL: [https://lab.maliyildirimtr.com](https://lab.maliyildirimtr.com)

Browser-based learning tools for digital logic and Electrical & Electronics Engineering. Write HDL, run testbenches, inspect waveforms, synthesize RTL schematics, and interact with a virtual Altera DE2 board without installing a desktop EDA suite.

## Tools

| Route | Tool | Current behavior |
|---|---|---|
| `#/de2-simulator` | DE2 Simulator | Runs a supported Verilog/SystemVerilog subset in a safe TypeScript evaluator. Switches and buttons drive HDL inputs; LEDs, seven-segment displays and the 16×2 character LCD (HD44780 interface) show mapped outputs. The board is drawn from the original Terasic DE2 in a 2D or 2.5D view. |
| `#/waveform` | Waveform | Compiles source and a testbench with local Icarus Verilog WebAssembly in a worker, parses VCD output, and renders interactive timing diagrams. |
| `#/schematic` | Schematic | Synthesizes HDL with local Yosys WebAssembly and renders an interactive DigitalJS circuit in `SchematicViewport`. |
| `#/examples` | Examples | Provides 16 curated examples, from single gates to board-level I/O and the LCD. |
| `#/exercises` | Exercises | 16 auto-graded exercises: 11 combinational (checked against every input combination) and 5 clocked (flip-flop, counter, shift register, edge detector, FSM; checked cycle by cycle). The student's module and a hidden reference both run on the DE2 engine; mismatching rows are highlighted and failed checks show line-level hints. Progress and code are saved locally. |
| `#/` | Home | Platform overview and tool entry points. |

The application is a hash-routed SPA. `#/projects` remains as a compatibility alias for `#/examples`; unknown routes show a 404 page.

### Workspace persistence and sharing

- Each tool autosaves its HDL project to `localStorage` (`logiclab_<tool>_workspace_v1`), so a refresh or closed tab does not lose work. Only source text is stored, never simulation or synthesis output.
- **Share links:** each tool's *Share* button copies a link that carries the project itself (deflate-compressed JSON in the `?p=` parameter; nothing is uploaded). *Schematic* buttons in DE2 and Waveform open the current HDL in the Schematic tool the same way.
- **Logic analyzer (DE2):** a *Logic Analyzer* tab in the DE2 console records every top-level port each time the design is evaluated (256-sample ring), drawn as square waves and hex-labelled buses. A trigger (rising/falling edge, any change, or value match) stops the capture 128 samples after the event; captures download as VCD or open directly in the Waveform tool.
- **FSM diagram (DE2):** an *FSM* tab draws the state machine found in the compiled design (`case (state)` with localparam, enum or literal states) and highlights the live state and last transition.
- **Diagnostics:** on Compile the source is checked for common mistakes (missing `;`, undeclared or misspelled names, `=` vs `<=`, missing `endmodule`, constructs the built-in engine cannot run) and each finding is reported with its line number and a suggested fix, in the console and as editor squiggles.
- **Real board export:** the DE2 *Quartus* button downloads a ready-to-compile Quartus II 13.0 SP1 project (`.qpf`, `.qsf` with every mapped pin incl. HEX, LCD and CLOCK_50, `.sdc`, source, TR/EN programming steps) for the original DE2 (Cyclone II EP2C35F672C6).
- **Gate designer (`#/gates`):** draw circuits from a component menu — gates (2–4 inputs, buffer), outputs, LEDs (green LEDs on the DE2), inputs, a clock, push buttons, constants and a 7-segment display; 2:1/4:1 multiplexers, 1:2/1:4 demultiplexers, 2-to-4 and 3-to-8 decoders, an 8-to-1 bit selector and a 4-to-2 priority encoder; half/full adders and multi-bit (1–4 bit) arithmetic blocks — adder, subtractor, multiplier, divider, barrel shifter, comparator, negation, sign extender and bit counter — and D, T, JK and SR flip-flops — and simulate them live. Clocked circuits get clock pulse / run / reset controls and a step-by-step timing diagram; combinational ones a truth table. The design exports to Verilog, runs on the DE2 (SW, KEY, CLOCK_50, LEDR, HEX) or opens in Schematic. A gate-delay mode replays input changes with per-gate delays and marks glitches. Presets include a full adder from two half adders, a 4:1 mux, a 7-segment display and a 4-bit ripple counter.
- **Gate designer editing:** undo/redo (Ctrl+Z / Ctrl+Shift+Z), box selection and Shift-click, copy/paste/duplicate (Ctrl+C/V/D), draggable wire segments, save/open as a `.logiclab.json` file and share links (`#/gates?g=…`, nothing uploaded). **Tunnels** join signals by name without a wire. **My blocks** saves a circuit as a reusable block (sub-circuit); blocks can contain blocks and travel inside saved files and links. A **Test** panel runs a truth/step table (inputs 0/1 or C for a clock pulse, outputs 0/1/X) and marks failing rows.
- **Number systems (`#/numbers`):** binary, octal, decimal and hexadecimal conversions for 4–32 bits, unsigned and two's complement values, clickable bits, and the working step by step (division by 2, place values, 4-bit groups, invert and add 1).
- **Karnaugh map (`#/kmap`):** type a Boolean expression or click a truth table (0/1/don't care) for 2–4 variables; the K-map shows the minimal sum-of-products groups (Quine–McCluskey with don't cares), with Verilog output and buttons to open the result in the gate designer or run it on the DE2.
- **Lab report (DE2):** the *Report* button creates a printable report of the current design — summary, pin assignments, design checks, truth table (combinational, up to 6 input bits) or state-machine table, a drawing of the board state, the logic analyzer timing diagram and the numbered source — which the browser saves as PDF. Self-contained HTML, no upload.
- **Stimulus editor (Waveform):** *Stimulus* reads the active module's ports and lets you draw the inputs step by step (click or drag 1-bit cells, type hex for buses, free-running clock, automatic reset pulse, "all combinations"). It writes a regular SystemVerilog testbench (`$dumpfile`/`$dumpvars`/`$finish`) into the testbench slot and can run it at once.
- **Lessons (`#/lessons`):** seven guided lessons (gates → Boolean algebra → adders → mux/decoders → sequential logic → FSMs → timing and glitches) with hands-on links and quizzes.
- **Classroom (`#/classroom`):** serverless teacher mode. An assignment (selected exercises) travels in a link; students download a result file (SHA-256 checksummed) that the teacher loads into a class table with CSV export. Nothing is uploaded.
- **Turkish UI:** all tools (DE2, Waveform, Schematic) follow the TR/EN switch (`src/i18n/toolText.ts`).
- **Editing examples locally:** with `npm run dev`, *Examples → Edit sources (local)* (`#/dev/examples`) opens every file in `src/examples/source` in an editor with live checks. *Save* (or Cmd/Ctrl+S) writes the file through a dev-server-only API (`vite/exampleEditorPlugin.ts`) and Vite reloads it; commit and push to publish. The *Examples* tab of the same page edits titles, descriptions, difficulty, category, topics and objectives, and adds new examples from files in `src/examples/source`; these are stored in `src/examples/metadata.json` (validated on load), so `registry.ts` never has to be edited by hand. The API and page do not exist in production builds.
- **Touch:** the DE2 board supports pinch-to-zoom, two-finger pan and double-tap zoom.
- **Language:** every page and tool is available in English and Turkish (`src/i18n/`).
- **Exports:** Schematic → SVG/PNG, Waveform → VCD (opens in GTKWave), DE2 → `.qsf` pin assignments for Quartus.
- Tool pages are lazy-loaded route chunks. Monaco is loaded only by pages with an editor and is limited to the Verilog/SystemVerilog grammar (`src/lib/monacoSetup.ts`); jQuery and DigitalJS are loaded only by the Schematic viewport.

## Simulation architecture

- **DE2:** `src/core/simulator/verilogEngine.ts` and `graphEvaluator.ts` parse and evaluate a deliberately limited HDL subset. Expressions use a closed AST evaluator; dynamic JavaScript execution is not used.
- **Waveform:** `src/services/hardwareSimulator.ts` talks to the active `src/workers/compiler.worker.ts`. The worker loads Icarus assets from `public/`, compiles and simulates the current Monaco editor contents, and returns parsed VCD data. There is no approximate `testbenchParser` fallback.
- **Schematic:** `src/services/synthesizer.ts` runs `@yowasp/yosys` in a Web Worker (`src/workers/yosys.worker.ts`, main-thread fallback), converts the netlist with `yosys2digitaljs`, and `src/components/SchematicWorkspace/SchematicViewport.tsx` hosts the DigitalJS circuit.

### DE2 board rendering

`src/store/boardStore.ts` is the single source of simulation state and
`src/board/de2Layout.ts` is the single source of board geometry, authored in real
millimetres against the official 203 x 153 mm DE2 outline. The 2D and 2.5D
renderers both read from those two modules; a 3D view is architected for but
deliberately disabled rather than faked. See
[`docs/de2-board-renderers.md`](docs/de2-board-renderers.md) for the signal
conventions, the 2.5D projection and what adding the 3D renderer involves.

Monaco, jQuery, jQuery UI, DigitalJS, Yosys, and the Icarus assets are bundled or served locally. Runtime CDN access is not required.

### Current limitations

- The DE2 evaluator supports educational combinational and sequential examples, not the full IEEE 1364/1800 language. Unsupported constructs fail closed.
- The DE2 LCD is simulated functionally (commands and characters), not with real HD44780 timing.
- The 3D board view is not implemented. It appears in the view selector as disabled.
- VHDL is not supported.
- Icarus WebAssembly has a cold-start cost on the first waveform compile and does not provide every SystemVerilog feature.
- Yosys is used for synthesis, not testbench simulation. Large schematics may be slow in the browser.

## Getting started

Node.js 20 or newer is recommended. The repository includes a `.node-version` file.

```bash
npm ci
npm run dev
```

The development server defaults to `http://localhost:5173`. Vite serves the application from the root `/` to match custom domain production deployment at `https://lab.maliyildirimtr.com`.

## Release checks

Deterministic checks used by CI:

```bash
npm run typecheck
npm run test:security
npm run build
```

Equivalent direct typecheck command:

```bash
npx tsc -b --noEmit
```

Browser lock checks are intentionally local/manual because they launch headless Chrome and expect the Vite development server to be running:

```bash
npm run dev -- --host 127.0.0.1
# In another terminal:
npm run test:waveform
npm run test:dirty-state
npm run test:dependencies
```

Set `CHROME_BIN` if Chrome/Chromium is not in a standard macOS or Linux location. Set `APP_BASE_URL` to test another local origin or base path.

The browser regressions cover current-editor compilation and bridge removal (Phase 8), the dirty-state matrix (Phase 9), and local dependency/CDN behavior plus DigitalJS rendering (Phase 10). Debug screenshots, if a check fails, are written to the operating system temporary directory unless `REGRESSION_ARTIFACT_DIR` is set.

## WebAssembly assets

The six Icarus files in `public/` (`ivlpp.js`, `ivlpp.wasm`, `ivl.js`, `ivl.wasm`, `vvp.js`, and `vvp.wasm`) total about **2.7 MiB on disk** in the current release. They are served locally and reused by the persistent compiler worker.

## Deployment

The platform is deployed to GitHub Pages at the custom domain:

- **Canonical URL:** [https://lab.maliyildirimtr.com](https://lab.maliyildirimtr.com)
- **Build Output:** Vite builds production assets into `dist/` with root base path (`base: '/'`).
- **Continuous Deployment:** `.github/workflows/deploy.yml` builds and deploys `dist/` directly to GitHub Pages using official GitHub Actions (`actions/deploy-pages@v4`).
- **Domain Configuration:** The custom domain `lab.maliyildirimtr.com` is configured through GitHub Repository Settings → Pages.
- **DNS:** Managed separately via DNS provider CNAME record pointing `lab.maliyildirimtr.com` to `maliyildirimtr.github.io`.

## Project structure

```text
altera-de2-simulator/
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── docs/simulation-engines.md
├── public/                         # favicon, icons, local Icarus assets
├── scripts/regression/             # maintained local browser lock checks
├── src/
│   ├── components/
│   │   ├── DE2Workspace/
│   │   ├── Examples/
│   │   ├── Layout/
│   │   ├── SchematicWorkspace/
│   │   ├── Waveform/
│   │   └── landing/
│   ├── core/simulator/             # safe DE2 parser/evaluator + security test
│   ├── examples/                   # canonical 14-example registry and HDL files
│   ├── pages/                      # route-level tool and hub workspaces
│   ├── services/                   # compiler, synthesis, VCD and handoff services
│   └── workers/compiler.worker.ts  # active Icarus WebAssembly worker
├── LICENSE
├── package.json
└── vite.config.ts
```

## Release status

- Phase 7: safe DE2 expression evaluation and security regression — locked
- Phase 8: waveform editor freshness, failure recovery, and debug-bridge removal — locked
- Phase 9: example handoff dirty-state behavior — locked
- Phase 10: local dependency migration and zero external runtime requests — locked
- Phase 11: public-release cleanup, reproducibility, and repository hardening — locked
- Phase 12: Logic Lab platform foundation — locked
- Phase 12.1: custom domain production deployment (`lab.maliyildirimtr.com`) — current release gate

## License

[MIT](LICENSE) © 2026 Mehmet Ali Yıldırım.
