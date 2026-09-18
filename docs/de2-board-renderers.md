# DE2 board renderers

How the DE2 Simulator draws the board, and the rules a future renderer has to
follow.

## Architecture

```
Verilog / SystemVerilog source
        │
        ▼
simulation core            src/core/simulator/**
        │
        ▼
board state                src/store/boardStore.ts        ← single source of truth
        │
        ├── granular selectors   src/board/useBoardSelectors.ts
        │
        ▼
canonical layout           src/board/de2Layout.ts         ← single source of geometry
        │
        ├── 2D renderer          src/components/Board/DE2Board2D.tsx
        ├── 2.5D renderer        src/components/Board/DE2Board25D.tsx
        └── 3D renderer          not implemented (placeholder only)
```

Two invariants hold the design together:

1. **`boardStore` is the only simulation state.** No renderer keeps its own copy
   of a switch, LED or segment value, and no renderer derives board state from
   anything else. Changing the view mode is a presentation change: the engine,
   `simState`, pin mappings and every I/O value survive untouched. This is
   asserted by the regression suite.
2. **`de2Layout.ts` is the only geometry.** Component positions live there once,
   in real millimetres, and every renderer places from it. A renderer that
   hardcodes a coordinate has introduced a second source of truth.

## Coordinate system

The layout is authored in **real millimetres** with the origin at the top-left
corner of the PCB. The official original DE2 outline is **203 mm × 153 mm**, and
the 2D SVG `viewBox` is literally `0 0 203 153` — so a value in the layout file
is a physical measurement, not an arbitrary unit.

Positions were derived by scaling the supplied top-view photograph of the
original Terasic DE2 against that outline (~5.95 px/mm) and are accurate to
roughly ±1.5 mm. They are faithful in ordering, proportion and grouping, which
is what a teaching illustration needs; they are not a substitute for the DE2
mechanical drawing.

### Board identity

The target is the **original Terasic / Altera DE2** with a
**Cyclone II EP2C35F672C6** — not the DE2-70, DE2-115 or DE1. The DE2-115
annotation diagram in the project's reference images is used only for connector
*naming*; its placement is different (Cyclone IV E, two Ethernet ports, an HSMC
connector) and is never used as DE2 layout.

## Signal conventions

These are locked. They come from `boardStore` and must not be re-derived in a
renderer.

| Bank | Count | Convention |
| --- | --- | --- |
| `SW[17:0]` | 18 | Active-high. `1` = lever up. |
| `KEY[3:0]` | 4 | **Active-low.** `keys[i] === 0` means pressed. |
| `LEDR[17:0]` | 18 | Active-high. `1` = lit. |
| `LEDG[8:0]` | 9 | Active-high. `1` = lit. |
| `HEX0..HEX7` | 8 × 7 | **Active-low.** `hex[i][s] === 0` lights segment `s`. |
| `CLOCK_50` | 1 | Toggled by the toolbar clock controls. |

Segment order is `0..6` = `A, B, C, D, E, F, G`.

Use `isSegmentLit()` from `src/board/useBoardSelectors.ts` rather than writing
the comparison again. Each HEX display publishes the raw, unmodified segment
array on `data-segments`, which the browser-driven DE2 regressions read.

The **LCD is not simulated**. It is drawn as an unlit module and never shows
sample text. **VHDL is not supported.**

## View modes

`src/board/boardViewMode.ts` defines `BoardViewMode = '2d' | '2.5d' | '3d'` and
the selector metadata. 2D and 2.5D are enabled; **3D is deliberately declared
but disabled** — the architecture is ready, the renderer is not, and no fake 3D
is offered.

The user's choice persists to `localStorage` under
`engineering-lab-de2-view-mode`. That key holds a *view preference only*; it is
never a source of simulation state. A missing, malformed or currently-disabled
stored value falls back to `2d`, so a stale `3d` preference cannot strand the
workspace on an unavailable renderer.

## The 2D renderer

A flat SVG technical illustration: navy solder mask, ground-pour mesh, a few
routed trace hints, gold-plated mounting holes, white silkscreen, and package
geometry per connector family (USB shells, 3.5 mm jacks, RCA, D-sub for VGA and
RS-232, RJ45 for Ethernet, 2×20 gold-pin GPIO headers, SD card shield).

SVG was chosen over canvas or DOM because it stays sharp at every zoom level,
hit-tests for free, updates one component at a time, and takes accessibility
attributes directly on the shapes.

## The 2.5D renderer

Not a second DE2 implementation. It consumes the same layout and the same
selectors, and the board surface plus every static package top is *literally the
2D artwork* placed onto a projected plane.

The projection (`src/components/Board/boardGeometry.ts`) is a cabinet-style
oblique projection, deliberately **affine**:

```
project(x, y, h) = {
  x: x + h · shear,
  y: cy + (y − cy) · tilt − h · lift,
}
```

Because it is affine, any flat drawing in board millimetres maps onto the plane
at height `h` with one SVG transform — `faceTransform(h)` — which is what makes
the artwork reuse possible instead of maintaining a second set of drawings.
Extruded walls come from `extrudeBox()`; round parts from `cylinderSkirt()` and
`projectedEllipse()`. Components are drawn back-to-front by `sortByDepth()`
(painter's algorithm), since SVG has no depth buffer.

There is **no Three.js and no render loop** — the whole projection is a handful
of multiplications per point.

Renderer-specific level-of-detail decision: the 2.5D view prints no per-LED
silkscreen. On the real board that text is a 1.5 mm line wedged between the LED
row and the switch bank, and from an elevated angle the raised switch and
push-button bodies stand in front of it. The bank headings carry the labelling
there, and the 2D view remains the place to read individual designators.

## Level of detail

`detailForScale()` maps the viewport zoom to `'low' | 'normal' | 'high'`.
Micro silkscreen, reference designators, IC pin rows and LCD character cells
drop out as the board zooms away, so text never dominates the board and a
zoomed-out view stays cheap to draw.

## Performance rules

- Subscribe per component. `useBoardSelectors` returns scalars, so a change to
  LEDR0 re-renders LEDR0 and nothing else. `runSimulationCycle` rebuilds the
  `ledR`, `ledG` and `hex` arrays every tick, so selecting an array directly
  would re-render the whole bank; the HEX selector uses a shallow comparison for
  the same reason.
- Every primitive is `React.memo`'d and takes only its layout component plus the
  detail level.
- **No SVG filters on live indicators.** `feGaussianBlur` on dozens of LEDs is
  the most expensive thing an SVG board can do; glow is a radial-gradient halo
  instead. The only filter-ish element is one static shadow under the 2.5D board.
- Static geometry (the 2.5D substrate walls, the depth ordering) is computed once
  at module scope, not per render.

## Accessibility

Switches are `role="switch"` with `aria-checked`; push-buttons are
`role="button"` with `aria-pressed`. Both are `tabIndex={0}`, respond to Space
and Enter (KEY press/release follows keydown/keyup so the active-low pulse
behaves like the mouse), and draw a focus ring on keyboard focus only. LEDs and
HEX displays are `role="img"` with a live label and are not focusable, because
they are outputs.

The viewport itself is focusable: arrow keys pan, `+`/`-` zoom, `0` or `Home`
fits the board. Those keys are handled only when the viewport has focus, so they
are never swallowed from a focused switch.

All transitions are short and functional (lever ~140 ms, cap ~90 ms, LED and
segment ~60-70 ms) and every one is disabled under `prefers-reduced-motion`.
Nothing animates continuously.

## Adding the 3D renderer

1. Add the renderer under `src/components/Board/`, reading component positions,
   footprints and `elevation` from `de2Layout.ts`. Every package already carries
   a height, so the extrusion data exists.
2. Read live state through `src/board/useBoardSelectors.ts` only. Do not add a
   store, a mirror of board state, or a per-frame poll of `getState()`.
3. Flip `enabled: true` for `3d` in `BOARD_VIEW_MODES` and return the renderer
   from `DE2BoardRenderer`. If the renderer needs a differently proportioned DOM
   box, add it to `boardRenderSize()` — the viewport already reads its
   dimensions from there.
4. Load the 3D library lazily (`React.lazy` / dynamic import) so the 2D and 2.5D
   views do not pay for it.
5. Extend `src/components/Board/__tests__/boardViews.test.tsx`: add `'3d'` to
   the `views` array so the parity, interaction and "view change does not reset
   simulation state" assertions cover it too.

## Tests

```
npm run test:de2-views   # renderer architecture, headless, no browser
npm run test:de2         # the above plus the Chrome-driven DE2 suites
npm run typecheck
npm run build
```

`npm run test:de2-views` compiles the renderer test with the project's own
TypeScript and renders both views with `react-dom/server`, then asserts layout
invariants, renderer parity (all 18 SW, 4 KEY, 18 LEDR, 9 LEDG and 8 HEX hooks
present exactly once in each view), the active-low HEX and KEY conventions,
view-preference persistence and fallback, and that cycling 2D → 2.5D → 3D leaves
the engine, `simState`, pin mappings and every I/O value untouched.

For a visual check without the dev server:

```
node scripts/dev/render-board-preview.mjs
```

which writes both views at all three detail levels to
`dist_test/board-preview/` as standalone SVG.
