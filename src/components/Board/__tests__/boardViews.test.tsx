/**
 * DE2 board renderer regression tests.
 *
 * Verifies the shared-architecture contract: the 2D and 2.5D renderers consume
 * the same layout and the same simulation state, expose the same interaction
 * hooks, and switching between them never disturbs the simulator.
 *
 * Run via `npm run test:de2-views`, which compiles this file with the project's
 * TypeScript and executes it on Node — the same pattern as the existing
 * security regression runner. No browser required.
 */

/// <reference types="node" />
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  BOARD_MM,
  DE2_HEX_DISPLAYS,
  DE2_KEYS,
  DE2_LAYOUT,
  DE2_LEDS_GREEN,
  DE2_LEDS_RED,
  DE2_SWITCHES,
  componentCentre,
  detailForScale,
  hasDetail,
  keyCentreX,
  ledGreenCentreX,
  sortByDepth,
  userIoCentreX,
} from '../../../board/de2Layout';
import {
  BOARD_VIEW_MODES,
  BOARD_VIEW_STORAGE_KEY,
  isBoardViewMode,
  isBoardViewModeEnabled,
  loadBoardViewMode,
  saveBoardViewMode,
} from '../../../board/boardViewMode';
import type { BoardViewMode } from '../../../board/boardViewMode';
import { isSegmentLit } from '../../../board/useBoardSelectors';
import { useBoardStore } from '../../../store/boardStore';
import { compileVerilog } from '../../../core/simulator/verilogEngine';
import { DE2BoardRenderer, boardRenderSize } from '../DE2BoardRenderer';
import {
  ACTIVE_BOARD_2D_PRESENTATION,
  BOARD_2D_PRESENTATIONS,
  DEFAULT_BOARD_2D_PRESENTATION,
  isBoard2DPresentation,
  loadBoard2DPresentation,
} from '../../../board/board2dPresentation';
import type { Board2DPresentation } from '../../../board/board2dPresentation';
import {
  DE2_ARTWORK,
  DE2_ARTWORK_SRC,
  HEX_CX,
  KEY_CX,
  LED_GREEN_CX,
  LED_RED_CX,
  SWITCH_CX,
} from '../../../board/de2ArtworkLayout';
import { ISO, project, faceTransform, sevenSegmentShapes } from '../boardGeometry';

/* ────────────────────────────────────────────────────────────────────────
 * Harness
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * zustand subscribes through `useSyncExternalStore`, whose *server* snapshot is
 * the store's creation-time state — so a plain static render would show the
 * initial board no matter what the simulator has done. Swapping in the live
 * snapshot makes static rendering observe current state, which is exactly what
 * these tests need to verify. It affects this test process only.
 */
function liveSnapshot<T>(_subscribe: (onChange: () => void) => () => void, getSnapshot: () => T): T {
  return getSnapshot();
}
(React as unknown as { useSyncExternalStore: unknown }).useSyncExternalStore = liveSnapshot;

/** Minimal in-memory localStorage so view-preference persistence is testable. */
function installLocalStorageStub(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  return store;
}

function render(mode: BoardViewMode): string {
  return renderToStaticMarkup(
    React.createElement(DE2BoardRenderer, { mode, detail: 'high' as const }),
  );
}

/** Renders 2D with an explicit presentation, so both are covered. */
function render2d(presentation: Board2DPresentation): string {
  return renderToStaticMarkup(
    React.createElement(DE2BoardRenderer, {
      mode: '2d' as const,
      detail: 'high' as const,
      presentation,
    }),
  );
}

function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

const checks: string[] = [];
function pass(name: string): void {
  checks.push(name);
  console.log(`  ok  ${name}`);
}

console.log('--- DE2 Board Renderer Regression ---');

/* ────────────────────────────────────────────────────────────────────────
 * 1. Canonical layout
 * ──────────────────────────────────────────────────────────────────────── */

assert.strictEqual(BOARD_MM.width, 203, 'DE2 PCB width must be 203 mm');
assert.strictEqual(BOARD_MM.height, 153, 'DE2 PCB height must be 153 mm');
pass('board envelope is the official 203 x 153 mm DE2 outline');

assert.strictEqual(DE2_SWITCHES.length, 18, 'DE2 has 18 slide switches');
assert.strictEqual(DE2_KEYS.length, 4, 'DE2 has 4 push-buttons');
assert.strictEqual(DE2_LEDS_RED.length, 18, 'DE2 has 18 red LEDs');
assert.strictEqual(DE2_LEDS_GREEN.length, 9, 'DE2 has 9 green LEDs');
assert.strictEqual(DE2_HEX_DISPLAYS.length, 8, 'DE2 has 8 seven-segment displays');
pass('bank sizes match the supported DE2 I/O');

const ids = DE2_LAYOUT.map((c) => c.id);
assert.strictEqual(new Set(ids).size, ids.length, 'component ids must be unique');
pass('every layout component id is unique');

for (const c of DE2_LAYOUT) {
  assert.ok(c.x >= -0.01, `${c.id} starts inside the board (x=${c.x})`);
  assert.ok(c.y >= -0.01, `${c.id} starts inside the board (y=${c.y})`);
  assert.ok(
    c.x + c.width <= BOARD_MM.width + 0.01,
    `${c.id} fits within the board width (right=${c.x + c.width})`,
  );
  assert.ok(
    c.y + c.height <= BOARD_MM.height + 0.01,
    `${c.id} fits within the board height (bottom=${c.y + c.height})`,
  );
}
pass('all components lie inside the PCB outline');

for (const sw of DE2_SWITCHES) {
  const led = DE2_LEDS_RED.find((l) => l.index === sw.index);
  assert.ok(led, `LEDR${sw.index} exists`);
  assert.ok(
    Math.abs(componentCentre(sw).cx - componentCentre(led!).cx) < 0.01,
    `SW${sw.index} is aligned under LEDR${sw.index}`,
  );
}
pass('each switch sits beneath its red LED, as on the real board');

for (const key of DE2_KEYS) {
  const expected = ledGreenCentreX((key.index ?? 0) * 2);
  assert.ok(
    Math.abs(keyCentreX(key.index ?? 0) - expected) < 0.01,
    `KEY${key.index} aligns with LEDG${(key.index ?? 0) * 2}`,
  );
}
pass('each KEY aligns with LEDG(2n), matching the DE2 silkscreen');

// SW17 is left-most and SW0 right-most, as printed on the board.
assert.ok(userIoCentreX(17) < userIoCentreX(0), 'SW17 is left of SW0');
const hexOrder = DE2_HEX_DISPLAYS.map((c) => c.index!);
assert.deepStrictEqual(hexOrder, [7, 6, 5, 4, 3, 2, 1, 0], 'HEX7..HEX0 left to right');
pass('bank ordering runs high index to low index, left to right');

const sorted = sortByDepth(DE2_LAYOUT);
for (let i = 1; i < sorted.length; i += 1) {
  const prev = sorted[i - 1].y + sorted[i - 1].height;
  const cur = sorted[i].y + sorted[i].height;
  assert.ok(cur >= prev - 1e-9, 'depth sort is monotonic in board y');
}
pass('2.5D painter ordering is monotonic front-to-back');

/* ────────────────────────────────────────────────────────────────────────
 * 2. Geometry helpers
 * ──────────────────────────────────────────────────────────────────────── */

const flat = project(10, 20, 0);
const lifted = project(10, 20, 5);
assert.ok(lifted.y < flat.y, 'height lifts a point upward on screen');
assert.ok(lifted.x > flat.x, 'height shears a point sideways, exposing side faces');
assert.ok(project(0, 0, 0).y < project(0, BOARD_MM.height, 0).y, 'depth increases downward');
pass('2.5D projection lifts, shears and foreshortens as intended');

assert.strictEqual(faceTransform(0), faceTransform(0), 'face transform is deterministic');
assert.ok(
  faceTransform(0).includes(`scale(1 ${ISO.tilt})`),
  'board plane uses the tilt factor',
);
assert.ok(ISO.tilt > 0.5 && ISO.tilt <= 1, 'tilt keeps the board close to top-down');
assert.ok(ISO.lift > 0 && ISO.lift < ISO.tilt, 'height lifts less than depth foreshortens');
pass('face transform places flat artwork on a projected plane');

const segs = sevenSegmentShapes(9, 9);
assert.strictEqual(segs.length, 7, 'a digit has exactly 7 segments');
assert.deepStrictEqual(
  segs.map((s) => s.index),
  [0, 1, 2, 3, 4, 5, 6],
  'segments are emitted in simulator order A..G',
);
pass('seven-segment geometry is shared and ordered A..G');

assert.strictEqual(detailForScale(0.3), 'low');
assert.strictEqual(detailForScale(0.8), 'normal');
assert.strictEqual(detailForScale(1.6), 'high');
assert.strictEqual(hasDetail('low', 'high'), false);
assert.strictEqual(hasDetail('high', 'normal'), true);
pass('level of detail escalates with zoom scale');

/* ────────────────────────────────────────────────────────────────────────
 * 3. View mode + persistence
 * ──────────────────────────────────────────────────────────────────────── */

const storage = installLocalStorageStub();

assert.strictEqual(isBoardViewMode('2d'), true);
assert.strictEqual(isBoardViewMode('2.5d'), true);
assert.strictEqual(isBoardViewMode('3d'), true);
assert.strictEqual(isBoardViewMode('4d'), false);

assert.strictEqual(isBoardViewModeEnabled('2d'), true, '2D is enabled');
assert.strictEqual(isBoardViewModeEnabled('2.5d'), true, '2.5D is enabled');
assert.strictEqual(isBoardViewModeEnabled('3d'), false, '3D must stay disabled');
pass('3D is declared but not enabled — no fake 3D is offered');

saveBoardViewMode('2.5d');
assert.strictEqual(storage.get(BOARD_VIEW_STORAGE_KEY), '2.5d', 'preference is persisted');
assert.strictEqual(loadBoardViewMode(), '2.5d', 'preference is restored');

storage.set(BOARD_VIEW_STORAGE_KEY, '3d');
assert.strictEqual(loadBoardViewMode(), '2d', 'a disabled stored mode falls back to 2D');

storage.set(BOARD_VIEW_STORAGE_KEY, 'not-a-mode');
assert.strictEqual(loadBoardViewMode(), '2d', 'a malformed stored mode falls back to 2D');

storage.clear();
assert.strictEqual(loadBoardViewMode(), '2d', 'no stored mode falls back to 2D');
pass('view preference persists and degrades safely');

const modes = BOARD_VIEW_MODES.map((m) => m.mode);
assert.deepStrictEqual(modes, ['2d', '2.5d', '3d'], 'selector offers 2D, 2.5D and 3D');
pass('view selector exposes all three modes');

const size2d = boardRenderSize('2d');
const size25d = boardRenderSize('2.5d');
assert.ok(size2d.width > 0 && size2d.height > 0, '2D render box is sized');
assert.ok(size25d.width > 0 && size25d.height > 0, '2.5D render box is sized');
assert.strictEqual(size25d.width, size2d.width, 'both views share a render width');
assert.ok(size25d.height < size2d.height, 'the projected board is shorter than the flat board');
pass('each renderer reports its own DOM box');

/* ────────────────────────────────────────────────────────────────────────
 * 4. Renderer parity — the same interaction hooks in both views
 * ──────────────────────────────────────────────────────────────────────── */

const views: BoardViewMode[] = ['2d', '2.5d'];
const markup: Record<string, string> = {};
for (const mode of views) markup[mode] = render(mode);

for (const mode of views) {
  const html = markup[mode];
  for (let i = 0; i < 18; i += 1) {
    assert.strictEqual(
      occurrences(html, `data-testid="de2-switch-${i}"`),
      1,
      `${mode}: SW${i} rendered exactly once`,
    );
    assert.strictEqual(
      occurrences(html, `data-testid="de2-ledr-${i}"`),
      1,
      `${mode}: LEDR${i} rendered exactly once`,
    );
  }
  for (let i = 0; i < 9; i += 1) {
    assert.strictEqual(
      occurrences(html, `data-testid="de2-ledg-${i}"`),
      1,
      `${mode}: LEDG${i} rendered exactly once`,
    );
  }
  for (let i = 0; i < 4; i += 1) {
    assert.strictEqual(
      occurrences(html, `data-testid="de2-key-${i}"`),
      1,
      `${mode}: KEY${i} rendered exactly once`,
    );
  }
  for (let i = 0; i < 8; i += 1) {
    assert.strictEqual(
      occurrences(html, `data-testid="de2-hex-${i}"`),
      1,
      `${mode}: HEX${i} rendered exactly once`,
    );
  }
}
pass('both views expose all 18 SW, 4 KEY, 18 LEDR, 9 LEDG and 8 HEX hooks');

for (const mode of views) {
  const html = markup[mode];
  assert.strictEqual(occurrences(html, 'role="switch"'), 18, `${mode}: 18 switch roles`);
  assert.strictEqual(occurrences(html, 'aria-label="Press KEY'), 4, `${mode}: 4 labelled keys`);
  assert.strictEqual(
    occurrences(html, 'aria-label="Toggle switch SW'),
    18,
    `${mode}: 18 labelled switches`,
  );
  assert.strictEqual(occurrences(html, 'tabindex="0"'), 22, `${mode}: 22 focusable controls`);
  assert.ok(html.includes('class="de2-focus-ring"'), `${mode}: focus indicator present`);
}
pass('interactive parts are semantic, labelled and keyboard focusable in both views');

assert.ok(markup['2d'].includes('data-board-view="2d"'), '2D renderer is tagged');
assert.ok(markup['2.5d'].includes('data-board-view="2.5d"'), '2.5D renderer is tagged');
assert.notStrictEqual(markup['2d'], markup['2.5d'], '2.5D is visually distinct from 2D');
pass('the two views are distinct renderers, not the same output');

const placeholder = render('3d');
assert.ok(
  placeholder.includes('data-testid="de2-board-3d-placeholder"'),
  'disabled 3D renders a placeholder',
);
assert.ok(!placeholder.includes('de2-switch-0'), '3D placeholder draws no board controls');
pass('disabled 3D renders a safe placeholder and cannot break the workspace');

/* ────────────────────────────────────────────────────────────────────────
 * 5. Shared simulation state
 * ──────────────────────────────────────────────────────────────────────── */

const store = useBoardStore.getState;

store().resetBoard();
assert.deepStrictEqual(store().switches, Array(18).fill(0), 'switches reset low');
assert.deepStrictEqual(store().keys, Array(4).fill(1), 'keys reset released (active-low high)');
assert.deepStrictEqual(store().hex[0], [1, 1, 1, 1, 1, 1, 1], 'HEX resets blank (active-low)');
pass('reset restores documented initial board state');

// Switch interaction still drives input state.
store().toggleSwitch(5);
assert.strictEqual(store().switches[5], 1, 'toggleSwitch raises SW5');
store().toggleSwitch(5);
assert.strictEqual(store().switches[5], 0, 'toggleSwitch lowers SW5');
store().toggleSwitch(17);
assert.strictEqual(store().switches[17], 1, 'SW17 toggles independently');
pass('SW interaction still updates input state');

// KEY inputs are active-low.
store().setKey(2, true);
assert.strictEqual(store().keys[2], 0, 'pressing KEY2 drives it low');
let html = render('2d');
assert.ok(
  /data-testid="de2-key-2"[^>]*data-active="true"/.test(html),
  '2D shows KEY2 pressed',
);
html = render('2.5d');
assert.ok(
  /data-testid="de2-key-2"[^>]*data-active="true"/.test(html),
  '2.5D shows KEY2 pressed',
);
store().setKey(2, false);
assert.strictEqual(store().keys[2], 1, 'releasing KEY2 drives it high');
pass('KEY active-low press/release works and is reflected in both views');

// LED outputs are active-high and appear in both views.
store().setLedR(3, 1);
store().setLedG(6, 1);
for (const mode of views) {
  const out = render(mode);
  assert.ok(
    /data-testid="de2-ledr-3"[^>]*data-active="true"/.test(out),
    `${mode}: LEDR3 lit`,
  );
  assert.ok(
    /data-testid="de2-ledg-6"[^>]*data-active="true"/.test(out),
    `${mode}: LEDG6 lit`,
  );
  assert.ok(
    /data-testid="de2-ledr-4"[^>]*data-active="false"/.test(out),
    `${mode}: LEDR4 dark`,
  );
}
pass('LED outputs update in both views');

// HEX segments are active-low and published raw.
assert.strictEqual(isSegmentLit(0), true, 'segment value 0 is lit');
assert.strictEqual(isSegmentLit(1), false, 'segment value 1 is dark');
store().setHex(0, [0, 1, 0, 0, 0, 0, 1]); // digit "1" is [1,0,0,1,1,1,1]; this is arbitrary
for (const mode of views) {
  const out = render(mode);
  assert.ok(
    out.includes('data-segments="[0,1,0,0,0,0,1]"'),
    `${mode}: raw segment array is published for the regression suite`,
  );
  const hex0 = out.slice(out.indexOf('data-testid="de2-hex-0"'));
  const seg0 = /data-segment="0" data-lit="(true|false)"/.exec(hex0);
  const seg1 = /data-segment="1" data-lit="(true|false)"/.exec(hex0);
  assert.strictEqual(seg0?.[1], 'true', `${mode}: segment A lit for value 0`);
  assert.strictEqual(seg1?.[1], 'false', `${mode}: segment B dark for value 1`);
}
pass('HEX outputs honour active-low semantics in both views');

/* ────────────────────────────────────────────────────────────────────────
 * 6. Switching renderer must not disturb the simulator
 * ──────────────────────────────────────────────────────────────────────── */

const engine = compileVerilog(`module top (
  input  logic SW0,
  input  logic SW1,
  output logic LEDR0,
  output logic LEDG0
);
  assign LEDR0 = SW0 & SW1;
  assign LEDG0 = SW0 | SW1;
endmodule
`);
useBoardStore.setState({ engine });
useBoardStore.setState({
  pinMappings: [
    { portName: 'SW0', physicalPin: null, virtualComponent: 'SW0' },
    { portName: 'SW1', physicalPin: null, virtualComponent: 'SW1' },
    { portName: 'LEDR0', physicalPin: null, virtualComponent: 'LEDR0' },
    { portName: 'LEDG0', physicalPin: null, virtualComponent: 'LEDG0' },
  ],
});

useBoardStore.setState({ switches: (() => {
  const next = [...store().switches];
  next[0] = 1;
  next[1] = 1;
  return next;
})() });
store().runSimulationCycle();

const before = {
  engine: store().engine,
  switches: [...store().switches],
  keys: [...store().keys],
  ledR: [...store().ledR],
  ledG: [...store().ledG],
  hex: store().hex.map((h) => [...h]),
  simState: store().simState,
  pinMappings: store().pinMappings,
};

assert.strictEqual(before.ledR[0], 1, 'engine drove LEDR0 high for SW0 & SW1');

// Render every renderer, in every order, exactly as a user flipping views.
render('2d');
render('2.5d');
render('3d');
render('2.5d');
render('2d');

const after = store();
assert.strictEqual(after.engine, before.engine, 'renderer change does not reinitialise the engine');
assert.strictEqual(after.simState, before.simState, 'renderer change does not clear simState');
assert.strictEqual(
  after.pinMappings,
  before.pinMappings,
  'renderer change does not clear pin mappings',
);
assert.deepStrictEqual(after.switches, before.switches, 'switch state survives a view change');
assert.deepStrictEqual(after.keys, before.keys, 'key state survives a view change');
assert.deepStrictEqual(after.ledR, before.ledR, 'red LED state survives a view change');
assert.deepStrictEqual(after.ledG, before.ledG, 'green LED state survives a view change');
assert.deepStrictEqual(
  after.hex.map((h) => [...h]),
  before.hex,
  'HEX state survives a view change',
);
pass('switching 2D / 2.5D / 3D does not reset simulation state');

// And the live values are visible in whichever view is mounted.
for (const mode of views) {
  const out = render(mode);
  assert.ok(
    /data-testid="de2-ledr-0"[^>]*data-active="true"/.test(out),
    `${mode}: engine-driven LEDR0 is lit`,
  );
  assert.ok(
    /data-testid="de2-switch-0"[^>]*data-active="true"/.test(out),
    `${mode}: SW0 reads as raised`,
  );
}
pass('both renderers display the same engine-driven state');

store().resetBoard();
useBoardStore.setState({ engine: null, pinMappings: [] });

/* ────────────────────────────────────────────────────────────────────────
 * 7. Artwork-based 2D presentation
 *
 * Mode '2d' has two renderers behind it: the raster artwork with live SVG
 * overlays, and the all-SVG vector board. These checks hold the contract that
 * makes that safe — both must exist, both must expose the same hooks, and the
 * artwork must not bake simulator state into the picture.
 * ──────────────────────────────────────────────────────────────────────── */

assert.deepStrictEqual(
  [...BOARD_2D_PRESENTATIONS],
  ['artwork', 'vector'],
  'both 2D presentations are declared',
);
assert.ok(isBoard2DPresentation('artwork') && isBoard2DPresentation('vector'), 'guard accepts both');
assert.ok(!isBoard2DPresentation('3d') && !isBoard2DPresentation(null), 'guard rejects junk');

const presentationStore = installLocalStorageStub();
assert.strictEqual(
  loadBoard2DPresentation(),
  DEFAULT_BOARD_2D_PRESENTATION,
  'missing preference falls back to the shipped default',
);
presentationStore.set('engineering-lab-de2-2d-presentation', 'nonsense');
assert.strictEqual(
  loadBoard2DPresentation(),
  DEFAULT_BOARD_2D_PRESENTATION,
  'malformed preference falls back to the shipped default',
);
presentationStore.set('engineering-lab-de2-2d-presentation', 'vector');
assert.strictEqual(loadBoard2DPresentation(), 'vector', 'the vector fallback is reachable');
presentationStore.clear();
pass('2D offers an artwork presentation and a vector fallback');

const artwork2d = render2d('artwork');
const vector2d = render2d('vector');

assert.ok(artwork2d.includes('data-board-presentation="artwork"'), 'artwork board identifies itself');
assert.ok(!vector2d.includes('data-board-presentation="artwork"'), 'vector board does not');
assert.ok(artwork2d.includes(DE2_ARTWORK_SRC), 'artwork board references the board image');
assert.ok(!vector2d.includes(DE2_ARTWORK_SRC), 'vector board references no raster asset');
assert.notStrictEqual(artwork2d, vector2d, 'the two presentations are genuinely different output');
assert.ok(
  vector2d.includes('de2-board-svg') && artwork2d.includes('de2-board-svg'),
  'both presentations remain SVG roots the viewport can transform',
);
pass('both 2D presentations render and stay distinguishable');

// The artwork image must never swallow a click meant for a control, and must
// not be draggable — a slow drag on an SVG image lifts a ghost thumbnail
// instead of panning the board.
const imageTag = /<image\b[^>]*>/.exec(artwork2d);
assert.ok(imageTag, 'artwork board contains an image element');
assert.ok(/pointer-events="none"/.test(imageTag![0]), 'artwork does not intercept pointer input');
assert.ok(/user-select:\s*none/.test(imageTag![0]), 'artwork is not selectable');
assert.ok(
  /width="\d+"/.test(imageTag![0]) && !/width="\d+px"/.test(imageTag![0]),
  'artwork is sized in viewBox units, not screen pixels',
);
pass('artwork layer is inert and scales with the board');

// Calibration completeness. One entry per real DE2 I/O, all inside the image.
const banks: Array<[string, readonly number[], number]> = [
  ['SWITCH_CX', SWITCH_CX, 18],
  ['KEY_CX', KEY_CX, 4],
  ['LED_RED_CX', LED_RED_CX, 18],
  ['LED_GREEN_CX', LED_GREEN_CX, 9],
  ['HEX_CX', HEX_CX, 8],
];
for (const [name, values, expected] of banks) {
  assert.strictEqual(values.length, expected, `${name} calibrates ${expected} parts`);
  for (const v of values) {
    assert.ok(v > 0 && v < 1, `${name}: ${v} is a normalised fraction inside the artwork`);
  }
  const ascending = values.every((v, i) => i === 0 || v > values[i - 1]);
  assert.ok(ascending, `${name} runs left to right, high index first`);
}
assert.ok(DE2_ARTWORK.width > 0 && DE2_ARTWORK.height > 0, 'artwork has an intrinsic size');
pass('artwork calibration covers every live part in normalised coordinates');

// The artwork renderer gets its own DOM box, because the render is not a
// mechanical drawing and its board is fractionally taller in proportion.
const artSize = boardRenderSize('2d', 'artwork');
const vecSize = boardRenderSize('2d', 'vector');
assert.strictEqual(artSize.width, vecSize.width, 'both presentations share a render width');
assert.ok(artSize.height > 0, 'artwork render box is sized');
assert.notStrictEqual(artSize.height, vecSize.height, 'artwork keeps its own aspect ratio');
assert.ok(
  Math.abs(artSize.width / artSize.height - DE2_ARTWORK.width / DE2_ARTWORK.height) < 0.01,
  'artwork render box matches the artwork aspect ratio, so nothing is distorted',
);
pass('artwork presentation reports an undistorted DOM box');

/*
 * Baked-in state. The source render shows a POWERED board: LEDs lit, all eight
 * displays reading "8". If the overlays ever stopped masking that, the board
 * would silently report state the simulator is not in — so assert that an
 * all-off board renders as all-off.
 */
store().resetBoard();
useBoardStore.setState({
  ledR: Array(18).fill(0),
  ledG: Array(9).fill(0),
  hex: Array.from({ length: 8 }, () => Array(7).fill(1)),
});
const dark = render2d('artwork');
assert.strictEqual(
  occurrences(dark, 'data-active="true"'),
  0,
  'with nothing driven, no overlay reports itself active',
);
assert.strictEqual(
  occurrences(dark, 'data-lit="true"'),
  0,
  'with HEX undriven (active-low 1s), no segment is lit',
);
assert.strictEqual(occurrences(dark, 'data-lit="false"'), 56, 'all 8 x 7 segments are drawn unlit');

// Now drive it and confirm the same DOM reports the change.
useBoardStore.setState({
  ledR: Array.from({ length: 18 }, (_, i) => (i === 17 ? 1 : 0)),
  ledG: Array.from({ length: 9 }, (_, i) => (i === 8 ? 1 : 0)),
  hex: Array.from({ length: 8 }, (_, i) => (i === 7 ? Array(7).fill(0) : Array(7).fill(1))),
});
const driven = render2d('artwork');
assert.ok(
  /data-testid="de2-ledr-17"[^>]*data-active="true"/.test(driven),
  'LEDR17 lights when driven',
);
assert.ok(
  /data-testid="de2-ledg-8"[^>]*data-active="true"/.test(driven),
  'LEDG8 lights when driven',
);
assert.ok(
  /data-testid="de2-ledr-0"[^>]*data-active="false"/.test(driven),
  'LEDR0 stays dark when undriven',
);
assert.strictEqual(occurrences(driven, 'data-lit="true"'), 7, 'exactly HEX7 shows all seven segments');
assert.ok(
  driven.includes('data-segments="[0,0,0,0,0,0,0]"'),
  'the raw active-low segment array is still published verbatim',
);
pass('artwork overlays mask baked-in state and follow the simulator');

// Interaction through the artwork overlays, including KEY's active-low write.
store().resetBoard();
store().toggleSwitch(17);
assert.strictEqual(store().switches[17], 1, 'SW17 toggles through the artwork overlay path');
const swOn = render2d('artwork');
assert.ok(
  /data-testid="de2-switch-17"[^>]*data-active="true"/.test(swOn),
  'the artwork switch overlay reflects the toggle',
);
store().toggleSwitch(17);
assert.strictEqual(store().switches[17], 0, 'SW17 toggles back');

store().setKey(0, true);
assert.strictEqual(store().keys[0], 0, 'pressing KEY0 writes the ACTIVE-LOW value 0');
const keyDown = render2d('artwork');
assert.ok(
  /data-testid="de2-key-0"[^>]*data-active="true"/.test(keyDown),
  'the artwork key overlay reports pressed',
);
assert.ok(keyDown.includes('aria-pressed="true"'), 'pressed state is exposed to assistive tech');
store().setKey(0, false);
assert.strictEqual(store().keys[0], 1, 'releasing KEY0 restores the active-low idle value 1');
pass('artwork overlays drive SW and KEY with unchanged active-low semantics');

// Whichever presentation ships, it must be a declared one.
assert.ok(
  isBoard2DPresentation(ACTIVE_BOARD_2D_PRESENTATION),
  'the active presentation is one of the declared presentations',
);
pass('the shipped 2D presentation is valid');

store().resetBoard();

console.log(`--- DE2 Board Renderer Regression: PASS (${checks.length} checks) ---`);
