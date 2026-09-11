# Engineering Lab

Production URL: [https://lab.maliyildirimtr.com](https://lab.maliyildirimtr.com)

Browser-based learning tools for digital logic and Electrical & Electronics Engineering. Write HDL, run testbenches, inspect waveforms, synthesize RTL schematics, and interact with a virtual Altera DE2 board without installing a desktop EDA suite.

## Tools

| Route | Tool | Current behavior |
|---|---|---|
| `#/de2-simulator` | DE2 Simulator | Runs a supported Verilog/SystemVerilog subset in a safe TypeScript evaluator. Switches and buttons drive HDL inputs; LEDs and seven-segment displays show mapped outputs. The LCD is currently visual-only. |
| `#/waveform` | Waveform | Compiles source and a testbench with local Icarus Verilog WebAssembly in a worker, parses VCD output, and renders interactive timing diagrams. |
| `#/schematic` | Schematic | Synthesizes HDL with local Yosys WebAssembly and renders an interactive DigitalJS circuit in `SchematicViewport`. |
| `#/examples` | Examples | Provides 14 curated examples. All open in Schematic and Waveform; 7 also include DE2 mappings. |
| `#/` | Home | Platform overview and tool entry points. |

The application is a hash-routed SPA. `#/projects` remains as a compatibility alias for `#/examples`.

## Simulation architecture

- **DE2:** `src/core/simulator/verilogEngine.ts` and `graphEvaluator.ts` parse and evaluate a deliberately limited HDL subset. Expressions use a closed AST evaluator; dynamic JavaScript execution is not used.
- **Waveform:** `src/services/hardwareSimulator.ts` talks to the active `src/workers/compiler.worker.ts`. The worker loads Icarus assets from `public/`, compiles and simulates the current Monaco editor contents, and returns parsed VCD data. There is no approximate `testbenchParser` fallback.
- **Schematic:** `src/services/synthesizer.ts` runs `@yowasp/yosys`, converts the netlist with `yosys2digitaljs`, and `src/components/SchematicWorkspace/SchematicViewport.tsx` hosts the DigitalJS circuit.

Monaco, jQuery, jQuery UI, DigitalJS, Yosys, and the Icarus assets are bundled or served locally. Runtime CDN access is not required.

### Current limitations

- The DE2 evaluator supports educational combinational and sequential examples, not the full IEEE 1364/1800 language. Unsupported constructs fail closed.
- The DE2 LCD is a board mock-up and is not connected to HDL output state.
- Icarus WebAssembly has a cold-start cost on the first waveform compile and does not provide every SystemVerilog feature.
- Yosys is used for synthesis, not testbench simulation. Large schematics may be slow in the browser.
- Route-level lazy splitting and additional strict-mode cleanup are future improvements, not release blockers.

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
- Phase 12: Engineering Lab platform foundation — locked
- Phase 12.1: custom domain production deployment (`lab.maliyildirimtr.com`) — current release gate

## License

[MIT](LICENSE) © 2026 Mehmet Ali Yıldırım.
