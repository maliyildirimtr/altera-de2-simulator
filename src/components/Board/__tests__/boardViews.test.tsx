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
import fs from 'node:fs';
import path from 'node:path';
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
  LCD_ART,
  LED_GREEN_8,
  LED_GREEN_BANK_CX,
  LED_RED_CX,
  SWITCH_CX,
} from '../../../board/de2ArtworkLayout';
import {
  LCD_COLS,
  LCD_ROW_BASE,
  createLcdState,
  lcdLines,
  lcdStep,
  type LcdBusSignals,
} from '../../../core/peripherals/lcdController';
import { collectLcdBus, normaliseLcdSignal } from '../../../core/peripherals/lcdSignals';
import { autoMapPort, parseQsf } from '../../../utils/parser/pinParser';
import type { ParsedPort } from '../../../utils/parser/pinParser';
import { NamedConstantError, buildConstantTable } from '../../../core/simulator/namedConstants';
import { parseBitRef, readSignal, readVector, writeSignal } from '../../../core/simulator/vectorSignals';
import { expandTarget, parseVirtualComponent } from '../../../board/virtualComponents';
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
  // LEDG8 is calibrated on its own, so the bank is EIGHT wide, not nine.
  ['LED_GREEN_BANK_CX', LED_GREEN_BANK_CX, 8],
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
assert.ok(
  LED_GREEN_8.cx > 0 && LED_GREEN_8.cx < 1 && LED_GREEN_8.cy > 0 && LED_GREEN_8.cy < 1,
  'LEDG8 is calibrated inside the artwork',
);
assert.ok(
  LED_GREEN_8.cx < LED_GREEN_BANK_CX[0],
  'LEDG8 sits to the LEFT of the green bank, between it and the HEX row',
);
assert.ok(
  LCD_ART.glassWidth > 0 && LCD_ART.glassHeight > 0 && LCD_ART.insetX > 0,
  'the LCD glass and its character inset are calibrated',
);
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

/* ────────────────────────────────────────────────────────────────────────
 * 8. Exact DE2 I/O population in the artwork renderer
 *
 * The board has a fixed complement of I/O. These are counted in the RENDERED
 * DOM rather than in the calibration arrays, so a wiring mistake in the
 * renderer (a duplicated bank, a tenth green LED) fails here even if the
 * calibration is right.
 * ──────────────────────────────────────────────────────────────────────── */

const populated = render2d('artwork');
const exact: Array<[string, number]> = [
  ['data-testid="de2-switch-', 18],
  ['data-testid="de2-key-', 4],
  ['data-testid="de2-ledr-', 18],
  ['data-testid="de2-ledg-', 9],
  ['data-testid="de2-hex-', 8],
  ['data-testid="de2-lcd"', 1],
];
for (const [hook, count] of exact) {
  assert.strictEqual(occurrences(populated, hook), count, `${hook} appears ${count}x`);
}
// Every index present exactly once — catches an off-by-one that still totals right.
for (let i = 0; i < 18; i += 1) {
  assert.strictEqual(occurrences(populated, `"de2-switch-${i}"`), 1, `SW${i} rendered once`);
  assert.strictEqual(occurrences(populated, `"de2-ledr-${i}"`), 1, `LEDR${i} rendered once`);
}
for (let i = 0; i < 9; i += 1) {
  assert.strictEqual(occurrences(populated, `"de2-ledg-${i}"`), 1, `LEDG${i} rendered once`);
}
assert.strictEqual(occurrences(populated, '"de2-ledg-9"'), 0, 'there is no tenth green LED');
for (let i = 0; i < 8; i += 1) {
  assert.strictEqual(occurrences(populated, `"de2-hex-${i}"`), 1, `HEX${i} rendered once`);
}
for (let i = 0; i < 4; i += 1) {
  assert.strictEqual(occurrences(populated, `"de2-key-${i}"`), 1, `KEY${i} rendered once`);
}
pass('artwork board renders exactly 18 SW, 4 KEY, 18 LEDR, 9 LEDG, 8 HEX and 1 LCD');

/*
 * Each red LED stands above its own switch. The artwork's two rows are very
 * slightly not co-linear — measurement found up to 0.5% of the board width of
 * drift — so this asserts correspondence within that tolerance rather than
 * equality. A mis-ordered or off-by-one bank blows straight past it.
 */
const ALIGN_TOLERANCE = 0.01;
for (let i = 0; i < 18; i += 1) {
  const delta = Math.abs(SWITCH_CX[i] - LED_RED_CX[i]);
  assert.ok(
    delta < ALIGN_TOLERANCE,
    `LEDR and SW at bank position ${i} correspond (drift ${delta.toFixed(4)})`,
  );
}
pass('every red LED is calibrated above its own switch');

/* ────────────────────────────────────────────────────────────────────────
 * 9. LCD peripheral — the HD44780 decoder, in isolation
 *
 * Driven through bus transactions rather than through a Verilog design, which
 * is the point of keeping the controller a pure module.
 * ──────────────────────────────────────────────────────────────────────── */

const IDLE: LcdBusSignals = { rs: 0, rw: 0, en: 0, data: 0, on: 1, blon: 1 };

/** One write: EN high, then low. The controller latches on the falling edge. */
function bus(state: ReturnType<typeof createLcdState>, rs: number, data: number) {
  const high = lcdStep(state, { ...IDLE, rs, data, en: 1 });
  return lcdStep(high, { ...IDLE, rs, data, en: 0 });
}
function cmd(state: ReturnType<typeof createLcdState>, byte: number) {
  return bus(state, 0, byte);
}
function chr(state: ReturnType<typeof createLcdState>, ch: string) {
  return bus(state, 1, ch.charCodeAt(0));
}

// Nothing latches while EN is merely held high.
let lcd = createLcdState();
const held = lcdStep(lcd, { ...IDLE, rs: 1, data: 0x41, en: 1 });
assert.strictEqual(
  held.ddram[0],
  0x20,
  'a write does not latch on the rising edge or while EN is held',
);
assert.strictEqual(lcdStep(held, { ...IDLE, rs: 1, data: 0x41, en: 1 }), held, 'a steady bus is a no-op');
pass('LCD transactions latch on the enable falling edge only');

// Function set, display on, clear — the standard init a teaching design sends.
lcd = cmd(lcd, 0x38); // 8-bit, 2 line
lcd = cmd(lcd, 0x0c); // display on, cursor off
lcd = cmd(lcd, 0x06); // entry mode: increment
lcd = cmd(lcd, 0x01); // clear
assert.deepStrictEqual(
  lcdLines(lcd),
  [' '.repeat(LCD_COLS), ' '.repeat(LCD_COLS)],
  'clear display leaves both lines blank',
);
assert.strictEqual(lcd.address, 0, 'clear display also returns the cursor home');
pass('LCD clear display blanks DDRAM and homes the cursor');

// Character writes advance the address counter.
for (const ch of 'HI') lcd = chr(lcd, ch);
assert.strictEqual(lcdLines(lcd)[0], 'HI' + ' '.repeat(LCD_COLS - 2), 'characters land from column 0');
assert.strictEqual(lcd.address, 2, 'the address counter advanced twice');
pass('LCD character writes land in DDRAM and advance the cursor');

// Explicit DDRAM address, first line.
lcd = cmd(lcd, 0x80 | 0x05);
assert.strictEqual(lcd.address, 0x05, 'set DDRAM address moves the cursor');
lcd = chr(lcd, 'X');
assert.strictEqual(lcdLines(lcd)[0][5], 'X', 'the character landed at the addressed column');
pass('LCD set DDRAM address positions the next write');

// Second line lives at 0x40, NOT at 0x10 — the classic 16x2 trap.
lcd = cmd(lcd, 0x80 | LCD_ROW_BASE[1]);
for (const ch of 'ROW2') lcd = chr(lcd, ch);
assert.strictEqual(lcdLines(lcd)[1], 'ROW2' + ' '.repeat(LCD_COLS - 4), 'row 2 starts at DDRAM 0x40');
assert.ok(!lcdLines(lcd)[0].includes('ROW2'), 'row 2 text did not bleed into row 1');
pass('LCD row 2 addressing follows the 16x2 DDRAM map');

// Display off blanks the panel but keeps the contents.
const stored = lcdLines(lcd);
const blanked = cmd(lcd, 0x08);
assert.deepStrictEqual(
  lcdLines(blanked),
  [' '.repeat(LCD_COLS), ' '.repeat(LCD_COLS)],
  'display off blanks the panel',
);
assert.deepStrictEqual(lcdLines(cmd(blanked, 0x0c)), stored, 'display on restores the same contents');
pass('LCD display on/off hides characters without losing DDRAM');

// Reads are refused rather than faked.
const readAttempt = lcdStep(lcdStep(lcd, { ...IDLE, rw: 1, en: 1 }), { ...IDLE, rw: 1, en: 0 });
assert.strictEqual(readAttempt.unsupportedReads, 1, 'an RW=1 transaction is counted, not guessed at');
assert.deepStrictEqual(lcdLines(readAttempt), stored, 'a refused read changes nothing');
pass('LCD reads are declined explicitly instead of fabricated');

/* ────────────────────────────────────────────────────────────────────────
 * 10. LCD signal plumbing and store integration
 * ──────────────────────────────────────────────────────────────────────── */

assert.strictEqual(normaliseLcdSignal('LCD_DATA[3]'), 'LCD_DATA[3]', 'bus-indexed name');
assert.strictEqual(normaliseLcdSignal('lcd_data3'), 'LCD_DATA[3]', 'flattened scalar name');
assert.strictEqual(normaliseLcdSignal('LCD_EN'), 'LCD_EN', 'control name');
assert.strictEqual(normaliseLcdSignal('LEDR3'), null, 'an LED is not an LCD signal');
assert.strictEqual(autoMapPort('LCD_DATA3'), 'LCD_DATA[3]', 'the pin parser maps LCD data bits');
assert.strictEqual(autoMapPort('LCD_EN'), 'LCD_EN', 'the pin parser maps LCD control lines');
assert.strictEqual(
  autoMapPort('LEDR3'),
  'LEDR[3]',
  'adding LCD did not steal port names from the LED mapper',
);
assert.strictEqual(collectLcdBus({ LEDR0: 1 }, []), null, 'a design with no LCD signals drives no bus');
const collected = collectLcdBus({ LCD_DATA0: 1, LCD_DATA6: 1, LCD_EN: 1, LCD_RS: 1 }, []);
assert.ok(collected, 'an LCD design produces a bus');
assert.strictEqual(collected!.data, 0x41, 'data bits assemble into a byte, LSB first');
assert.strictEqual(collected!.on, 1, 'LCD_ON defaults high when the design does not drive it');
pass('LCD signals resolve from both naming styles without disturbing other banks');

// Through the store: a blank panel renders blank, and reset clears a used one.
store().resetBoard();
assert.deepStrictEqual(
  lcdLines(store().lcd),
  [' '.repeat(LCD_COLS), ' '.repeat(LCD_COLS)],
  'a reset board has a blank LCD',
);
const blankBoard = render2d('artwork');
assert.ok(
  blankBoard.includes('data-lcd-visible="false"'),
  'an undriven LCD renders as off — no demo text is ever invented',
);

let live = createLcdState();
live = cmd(live, 0x38);
live = cmd(live, 0x0c);
live = cmd(live, 0x01);
for (const ch of 'ENGINEERING LAB') live = chr(live, ch);
live = cmd(live, 0x80 | LCD_ROW_BASE[1]);
for (const ch of 'HELLO FPGA') live = chr(live, ch);
useBoardStore.setState({ lcd: live });

const shown = render2d('artwork');
assert.ok(shown.includes('data-lcd-visible="true"'), 'a driven LCD renders as on');
assert.ok(shown.includes('ENGINEERING LAB'), 'line 1 reaches the panel');
assert.ok(shown.includes('HELLO FPGA'), 'line 2 reaches the panel');

// Re-rendering must not disturb peripheral state: the controller lives in the
// store, so repeated renders are pure reads.
const again = render2d('artwork');
assert.strictEqual(again, shown, 'rendering the board twice produces identical output');
assert.deepStrictEqual(lcdLines(store().lcd), lcdLines(live), 'rendering did not mutate LCD state');
render('2.5d');
render2d('vector');
assert.deepStrictEqual(
  lcdLines(store().lcd),
  lcdLines(live),
  'LCD state survives switching presentation and view mode',
);
pass('LCD renders live text on the artwork glass and survives re-renders');

store().resetBoard();
assert.deepStrictEqual(
  lcdLines(store().lcd),
  [' '.repeat(LCD_COLS), ' '.repeat(LCD_COLS)],
  'board reset blanks the LCD',
);
assert.strictEqual(store().lcd.address, 0, 'board reset homes the LCD cursor');
assert.strictEqual(store().lcd.displayOn, false, 'board reset returns the LCD to its power-on state');
pass('board reset clears the LCD');

/* ────────────────────────────────────────────────────────────────────────
 * 11. The bundled LCD example actually writes what it claims
 *
 * The byte sequence is read out of the SHIPPED SystemVerilog rather than
 * duplicated here, so the example and this expectation cannot drift apart:
 * edit the .sv and this check follows it.
 *
 * What this does NOT prove is that the design compiles and runs under Icarus
 * in the browser — that needs the full DE2 suite. It proves the sequence the
 * example encodes is a correct HD44780 conversation that produces the
 * advertised screen.
 * ──────────────────────────────────────────────────────────────────────── */

const examplePath = path.join(process.cwd(), 'src/examples/source/de2_lcd_hello.sv');
const exampleSource = fs.readFileSync(examplePath, 'utf8');

const sequence: Array<{ rs: number; data: number }> = [];
const stepRe = /6'd(\d+):\s*begin\s+rs = 1'b([01]);\s*data = 8'h([0-9A-Fa-f]{2});/g;
for (let m = stepRe.exec(exampleSource); m; m = stepRe.exec(exampleSource)) {
  sequence[Number(m[1])] = { rs: Number(m[2]), data: parseInt(m[3], 16) };
}
assert.ok(sequence.length >= 31, `parsed the example's byte sequence (${sequence.length} bytes)`);
assert.ok(
  sequence.every((entry) => entry !== undefined),
  'the example numbers its steps contiguously from 0',
);

let demo = createLcdState();
for (const { rs, data } of sequence) demo = bus(demo, rs, data);

const [demoLine1, demoLine2] = lcdLines(demo);
assert.strictEqual(demoLine1, 'ENGINEERING LAB'.padEnd(LCD_COLS), 'the example writes line 1');
assert.strictEqual(demoLine2, 'HELLO FPGA'.padEnd(LCD_COLS), 'the example writes line 2');
assert.strictEqual(demo.unsupportedReads, 0, 'the example never attempts an LCD read');
assert.ok(demo.displayOn, 'the example turns the display on, so its text is actually visible');

// And the interactive demo keeps the DE2 contract it teaches.
const ioSource = fs.readFileSync(
  path.join(process.cwd(), 'src/examples/source/de2_interactive_io.sv'),
  'utf8',
);
assert.ok(/assign LEDG0 = ~KEY0;/.test(ioSource), 'the I/O demo inverts active-low KEY0');
assert.ok(/HEX0_6/.test(ioSource), 'the I/O demo drives all seven segments of HEX0');
assert.ok(!/vhdl/i.test(ioSource) && !/vhdl/i.test(exampleSource), 'no example claims VHDL support');
pass('the bundled LCD example writes ENGINEERING LAB / HELLO FPGA');

/* ────────────────────────────────────────────────────────────────────────
 * 12. Silkscreen corrections
 *
 * The artwork prints several designators wrong. The renderer masks those rows
 * and reprints them, which is only safe if the replacement text is centred on
 * the SAME coordinate the live part uses — otherwise a label and the thing it
 * names could drift apart, which is worse than a typo.
 * ──────────────────────────────────────────────────────────────────────── */

const silk = render2d('artwork');

const labelText = (name: string): number =>
  occurrences(silk, `>${name}</text>`);

for (let i = 0; i < 18; i += 1) {
  assert.strictEqual(labelText(`LEDR${i}`), 1, `LEDR${i} is printed exactly once`);
}
for (let i = 0; i < 9; i += 1) {
  assert.strictEqual(labelText(`LEDG${i}`), 1, `LEDG${i} is printed exactly once`);
}
for (let i = 0; i < 8; i += 1) {
  assert.strictEqual(labelText(`HEX${i}`), 1, `HEX${i} is printed exactly once`);
}
assert.strictEqual(
  occurrences(silk, 'data-silk-labels="ledr"'),
  1,
  'the red designators are one group',
);
// The artwork's misprints must not survive as replacement text.
for (const wrong of ['LED62', 'LED05', 'LEDG9', 'LEDR18']) {
  assert.strictEqual(labelText(wrong), 0, `${wrong} is not printed`);
}
pass('silkscreen prints exactly 18 LEDR, 9 LEDG and 8 HEX designators');

// LEDG8 keeps its own baseline: it is the separate LED up by the HEX row, not
// a ninth member of the bank, and its label must not join the row below.
const textAt = (name: string): { x: number; y: number } => {
  const m = new RegExp(`<text x="([\\d.]+)" y="([\\d.]+)"[^>]*>${name}</text>`).exec(silk);
  assert.ok(m, `${name} is rendered as positioned text`);
  return { x: Number(m![1]), y: Number(m![2]) };
};
const g8 = textAt('LEDG8');
const g7 = textAt('LEDG7');
const g0 = textAt('LEDG0');
assert.strictEqual(g7.y, g0.y, 'the green bank shares one baseline');
assert.ok(g8.y < g7.y - 100, 'LEDG8 is printed on its own row, well above the bank');
assert.ok(g8.x < g7.x, 'LEDG8 is printed to the left of the bank');
pass('LEDG8 silkscreen stays separate from the green bank');

/*
 * Exact centring. Each label's x must equal the centre of its own part's
 * rendered footprint — not approximately, exactly, because both read the same
 * calibrated coordinate. Any drift here means the label layer stopped sharing
 * the calibration with the live layer.
 */
const partCentre = (testid: string): number => {
  const block = new RegExp(
    `data-testid="${testid}"([\\s\\S]*?)(?=data-testid="de2-|</svg>)`,
  ).exec(silk);
  assert.ok(block, `${testid} is rendered`);
  const rect = /<rect x="(-?[\d.]+)" y="-?[\d.]+" width="([\d.]+)"/.exec(block![1]);
  assert.ok(rect, `${testid} has a footprint rect`);
  return Number(rect![1]) + Number(rect![2]) / 2;
};
for (let i = 0; i < 18; i += 1) {
  assert.ok(
    Math.abs(textAt(`LEDR${i}`).x - partCentre(`de2-ledr-${i}`)) < 0.01,
    `LEDR${i}'s label is centred on its own lens`,
  );
}
for (let i = 0; i < 9; i += 1) {
  assert.ok(
    Math.abs(textAt(`LEDG${i}`).x - partCentre(`de2-ledg-${i}`)) < 0.01,
    `LEDG${i}'s label is centred on its own lens`,
  );
}
for (let i = 0; i < 8; i += 1) {
  assert.ok(
    Math.abs(textAt(`HEX${i}`).x - partCentre(`de2-hex-${i}`)) < 0.01,
    `HEX${i}'s label is centred on its own digit window`,
  );
}
pass('every replacement designator is centred on the part it names');

// The masks and the placeholder patch are present, and the layer stays inert.
for (const id of ['ledr-labels', 'ledg-labels', 'ledg8-label', 'hex-labels']) {
  assert.strictEqual(occurrences(silk, `data-silk-mask="${id}"`), 1, `${id} mask is drawn`);
}
assert.strictEqual(
  occurrences(silk, 'data-silk-patch="text-placeholder"'),
  1,
  'the "Text" placeholder is covered by its patch',
);
const layer = /<g data-testid="de2-silk-corrections"([^>]*)>/.exec(silk);
assert.ok(layer, 'the correction layer is rendered');
assert.ok(/pointer-events="none"/.test(layer![1]), 'corrections never intercept input');
assert.ok(/aria-hidden="true"/.test(layer![1]), 'corrections are board printing, not content');
pass('silkscreen masks and the placeholder patch are applied and inert');

/* ────────────────────────────────────────────────────────────────────────
 * 13. Vector output propagation to DE2 pins
 *
 * The engine stores a vector under its BARE name as a packed integer:
 * `output [6:0] HEX0; assign HEX0 = 7'b1000000;` produces state.HEX0 === 64
 * and no `HEX0[n]` keys at all. Pin mappings are per-pin, so a .qsf assigning
 * seven pins with seven `-to HEX0[0]`..`-to HEX0[6]` lines asks for keys that
 * do not exist.
 *
 * Reading those as 0 is not a harmless default: HEX segments are ACTIVE-LOW,
 * so 0 lights the segment and every vector-driven display reads "8" whatever
 * the design computed. Seven independent scalar outputs on the same pins work,
 * because their names are in the state map verbatim — which is exactly why the
 * scalar diagnostic passed while the vector version did not.
 *
 * These checks run the REAL path: real Verilog through `compileVerilog`, real
 * pin mappings through `parseQsf`, real `runSimulationCycle`. No mocked store.
 * ──────────────────────────────────────────────────────────────────────── */

// The resolver, on its own.
assert.deepStrictEqual(parseBitRef('HEX0[3]'), { base: 'HEX0', bit: 3 }, 'bit select parses');
assert.deepStrictEqual(parseBitRef(' LCD_DATA [ 7 ] '), { base: 'LCD_DATA', bit: 7 }, 'whitespace tolerated');
assert.strictEqual(parseBitRef('HEX0'), null, 'a plain name is not a bit reference');
assert.strictEqual(parseBitRef('BUS[7:4]'), null, 'a RANGE select is not read as one bit');

// 7'b1000000 === 64: bit 0 (segment A) is 0, bit 6 (segment G) is 1.
const packed = { HEX0: 0b1000000 };
assert.strictEqual(readSignal(packed, 'HEX0[0]'), 0, 'bit 0 comes from the packed vector');
assert.strictEqual(readSignal(packed, 'HEX0[6]'), 1, 'bit 6 comes from the packed vector');
assert.deepStrictEqual(
  readVector(packed, 'HEX0', 7),
  [0, 0, 0, 0, 0, 0, 1],
  'the whole vector resolves LSB-first, so index 0 is segment A and index 6 is G',
);
assert.strictEqual(readSignal({ 'HEX0[0]': 1, HEX0: 0 }, 'HEX0[0]'), 1, 'an exact key wins');
assert.strictEqual(readSignal({ HEX0_3: 1, HEX0: 0 }, 'HEX0[3]'), 1, 'the underscore spelling resolves');
assert.strictEqual(readSignal({}, 'HEX0[0]'), undefined, 'an absent signal is undefined, NOT 0');
assert.strictEqual(readSignal({ HEX0: NaN }, 'HEX0[0]'), undefined, 'NaN is not coerced to 0');
assert.strictEqual(readSignal(undefined, 'HEX0[0]'), undefined, 'a missing state is undefined');
pass('vector bits resolve from packed or flattened state, and absence is not zero');

// Writing: a bit must be packed into the vector the engine actually declares.
const vecIn: Record<string, number> = {};
writeSignal(vecIn, new Set(['SW']), 'SW[0]', 1);
writeSignal(vecIn, new Set(['SW']), 'SW[3]', 1);
assert.strictEqual(vecIn.SW, 0b1001, 'bits pack into the declared vector input');
assert.strictEqual(vecIn['SW[0]'], undefined, 'no phantom per-bit input is created');
const seeded: Record<string, number> = {};
writeSignal(seeded, new Set(['KEY']), 'KEY[0]', 0, { KEY: 0b1111 });
assert.strictEqual(
  seeded.KEY,
  0b1110,
  'packing seeds from the previous value, so unmapped ACTIVE-LOW bits stay released',
);
const flatIn: Record<string, number> = {};
writeSignal(flatIn, new Set(['SW0']), 'SW0', 1);
assert.strictEqual(flatIn.SW0, 1, 'a declared scalar is written directly');
const underIn: Record<string, number> = {};
writeSignal(underIn, new Set(['HEX0_2']), 'HEX0[2]', 1);
assert.strictEqual(underIn.HEX0_2, 1, 'the underscore spelling is written when declared');
pass('vector inputs pack into the port the engine declares');

// Virtual-component parsing: every spelling, and no theft from other families.
assert.deepStrictEqual(parseVirtualComponent('HEX0[6]'), { family: 'HEX', display: 0, segment: 6 }, 'HEX segment');
assert.deepStrictEqual(parseVirtualComponent('HEX3_2'), { family: 'HEX', display: 3, segment: 2 }, 'HEX underscore');
assert.deepStrictEqual(parseVirtualComponent('HEX7'), { family: 'HEX', display: 7, segment: null }, 'HEX bus');
assert.deepStrictEqual(parseVirtualComponent('SW[17]'), { family: 'SW', index: 17 }, 'SW member');
assert.deepStrictEqual(parseVirtualComponent('LEDR12'), { family: 'LEDR', index: 12 }, 'LEDR member');
assert.deepStrictEqual(parseVirtualComponent('LEDG'), { family: 'LEDG', index: null }, 'LEDG bus');
assert.deepStrictEqual(parseVirtualComponent('CLOCK_50'), { family: 'CLOCK_50' }, 'clock');
assert.strictEqual(parseVirtualComponent('LCD_DATA[3]'), null, 'LCD signals are not read as board banks');
assert.strictEqual(parseVirtualComponent('LCD_EN'), null, 'LCD control is not read as a board bank');
assert.strictEqual(parseVirtualComponent(null), null, 'an unmapped port is not a target');
// A bus name expands by declared width; a scalar of the same name does not.
assert.strictEqual(expandTarget({ family: 'HEX', display: 0, segment: null }, 'HEX0', 7).length, 7, 'a 7-bit HEX bus expands to 7 segments');
assert.deepStrictEqual(
  expandTarget({ family: 'HEX', display: 0, segment: null }, 'HEX0', 7)[6],
  { signal: 'HEX0[6]', index: 6 },
  'segment 6 reads bit 6',
);
assert.strictEqual(expandTarget({ family: 'SW', index: null }, 'SW', 1).length, 1, 'a scalar named SW is one switch, not eighteen');
pass('virtual component names parse in every spelling without cross-family theft');

/*
 * The reported failure, end to end: one vector HEX output, mapped by a real
 * .qsf, must put [0,0,0,0,0,0,1] on the board — digit "0".
 */
store().resetBoard();
const hexVecEngine = compileVerilog(`module de2_hex_vector_diag (
  output [6:0] HEX0
);
  assign HEX0 = 7'b1000000;
endmodule
`);
assert.ok(hexVecEngine, 'the vector HEX design compiles');
const hexVecQsf = parseQsf(`
set_location_assignment PIN_AF10 -to HEX0[0]
set_location_assignment PIN_AB12 -to HEX0[1]
set_location_assignment PIN_AC12 -to HEX0[2]
set_location_assignment PIN_AD11 -to HEX0[3]
set_location_assignment PIN_AE11 -to HEX0[4]
set_location_assignment PIN_V14  -to HEX0[5]
set_location_assignment PIN_V13  -to HEX0[6]
`);
assert.strictEqual(hexVecQsf.length, 7, 'the .qsf yields seven pins');
assert.deepStrictEqual(
  hexVecQsf.map((m) => m.portName),
  ['HEX0[0]', 'HEX0[1]', 'HEX0[2]', 'HEX0[3]', 'HEX0[4]', 'HEX0[5]', 'HEX0[6]'],
  'bracketed .qsf target names survive parsing exactly',
);
useBoardStore.setState({ engine: hexVecEngine, pinMappings: hexVecQsf, simState: {} });
store().runSimulationCycle();
assert.strictEqual(store().simState.HEX0, 0b1000000, 'the engine stores the vector packed, under its bare name');
assert.deepStrictEqual(
  [...store().hex[0]],
  [0, 0, 0, 0, 0, 0, 1],
  'HEX0 receives A..F lit and G off — the digit "0"',
);
assert.ok(
  store().hex.slice(1).every((h) => h.every((v) => v === 1)),
  'the undriven displays stay blank rather than defaulting to lit',
);
pass('a packed vector HEX output reaches the board through the real qsf path');

/*
 * Eight vector displays at once, reading 7 6 5 4 3 2 1 0 left to right.
 * hex[0] is HEX0, the right-most display, so the expected values are listed
 * right to left.
 */
store().resetBoard();
const multiEngine = compileVerilog(`module de2_hex_vector_all (
  output [6:0] HEX0,
  output [6:0] HEX1,
  output [6:0] HEX2,
  output [6:0] HEX3,
  output [6:0] HEX4,
  output [6:0] HEX5,
  output [6:0] HEX6,
  output [6:0] HEX7
);
  assign HEX7 = 7'b1111000;
  assign HEX6 = 7'b0000010;
  assign HEX5 = 7'b0010010;
  assign HEX4 = 7'b0011001;
  assign HEX3 = 7'b0110000;
  assign HEX2 = 7'b0100100;
  assign HEX1 = 7'b1111001;
  assign HEX0 = 7'b1000000;
endmodule
`);
const HEX_PINS = [
  ['PIN_AF10', 'PIN_AB12', 'PIN_AC12', 'PIN_AD11', 'PIN_AE11', 'PIN_V14', 'PIN_V13'],
  ['PIN_V20', 'PIN_V21', 'PIN_W21', 'PIN_Y22', 'PIN_AA24', 'PIN_AA23', 'PIN_AB24'],
  ['PIN_AB23', 'PIN_V22', 'PIN_AC25', 'PIN_AC26', 'PIN_AB26', 'PIN_AB25', 'PIN_Y24'],
  ['PIN_Y23', 'PIN_AA25', 'PIN_AA26', 'PIN_Y26', 'PIN_Y25', 'PIN_U22', 'PIN_W24'],
  ['PIN_U9', 'PIN_U1', 'PIN_U2', 'PIN_T4', 'PIN_R7', 'PIN_R6', 'PIN_T3'],
  ['PIN_T2', 'PIN_P6', 'PIN_P7', 'PIN_T9', 'PIN_R5', 'PIN_R4', 'PIN_R3'],
  ['PIN_R2', 'PIN_P4', 'PIN_P3', 'PIN_M2', 'PIN_M3', 'PIN_M5', 'PIN_M4'],
  ['PIN_L3', 'PIN_L2', 'PIN_L9', 'PIN_L6', 'PIN_L7', 'PIN_P9', 'PIN_N9'],
];
const multiQsf = parseQsf(
  HEX_PINS.flatMap((pins, display) =>
    pins.map((pin, bit) => `set_location_assignment ${pin} -to HEX${display}[${bit}]`),
  ).join('\n'),
);
assert.strictEqual(multiQsf.length, 56, 'the .qsf yields 8 x 7 pins');
useBoardStore.setState({ engine: multiEngine, pinMappings: multiQsf, simState: {} });
store().runSimulationCycle();
const DIGIT_BITS = [
  0b1000000, // HEX0 -> 0
  0b1111001, // HEX1 -> 1
  0b0100100, // HEX2 -> 2
  0b0110000, // HEX3 -> 3
  0b0011001, // HEX4 -> 4
  0b0010010, // HEX5 -> 5
  0b0000010, // HEX6 -> 6
  0b1111000, // HEX7 -> 7
];
for (let display = 0; display < 8; display += 1) {
  const expected = Array.from({ length: 7 }, (_, bit) => (DIGIT_BITS[display] >> bit) & 1);
  assert.deepStrictEqual(
    [...store().hex[display]],
    expected,
    `HEX${display} shows the digit ${display} its vector encodes`,
  );
}
pass('eight packed vector HEX outputs display 7 6 5 4 3 2 1 0');

/*
 * The same fix must hold for every other family, in both directions, and the
 * scalar path that already worked must keep working.
 */
store().resetBoard();
const busEngine = compileVerilog(`module de2_bus_io (
  input  [17:0] SW,
  input  [3:0]  KEY,
  output [17:0] LEDR,
  output [8:0]  LEDG
);
  assign LEDR = SW;
  assign LEDG = {5'b0, KEY};
endmodule
`);
const busQsf = parseQsf(
  [
    'set_location_assignment PIN_N25 -to SW[0]',
    'set_location_assignment PIN_N26 -to SW[1]',
    'set_location_assignment PIN_V2  -to SW[17]',
    'set_location_assignment PIN_G26 -to KEY[0]',
    'set_location_assignment PIN_AE23 -to LEDR[0]',
    'set_location_assignment PIN_AF23 -to LEDR[1]',
    'set_location_assignment PIN_AD12 -to LEDR[17]',
    'set_location_assignment PIN_AE22 -to LEDG[0]',
  ].join('\n'),
);
useBoardStore.setState({ engine: busEngine, pinMappings: busQsf, simState: {} });
store().toggleSwitch(0);
store().toggleSwitch(17);
store().runSimulationCycle();
assert.strictEqual(store().simState.SW, 0b100000000000000001, 'switch bits packed into the vector input');
assert.strictEqual(store().ledR[0], 1, 'a vector LEDR output drives bit 0');
assert.strictEqual(store().ledR[17], 1, 'a vector LEDR output drives bit 17');
assert.strictEqual(store().ledR[1], 0, 'an undriven vector bit stays low');
// KEY is ACTIVE-LOW and only KEY0 is mapped: the other three must read released.
assert.strictEqual(store().simState.KEY, 0b1111, 'unmapped active-low KEY bits stay released');
assert.strictEqual(store().ledG[0], 1, 'KEY0 released reads 1 through the vector input');
store().setKey(0, true);
store().runSimulationCycle();
assert.strictEqual(store().simState.KEY, 0b1110, 'pressing KEY0 clears only its own bit');
assert.strictEqual(store().ledG[0], 0, 'KEY0 pressed reads 0 through the vector input');
pass('vector SW, KEY, LEDR and LEDG all propagate in both directions');

/*
 * A bare vector port with NO .qsf at all. `autoMapPort` now recognises a bus
 * name, and the mapping layer expands it by the port's declared width, so
 * `output [6:0] HEX0` populates all seven segments on its own.
 */
assert.strictEqual(autoMapPort('HEX0'), 'HEX0', 'a bare HEX bus name auto-maps');
assert.strictEqual(autoMapPort('LEDR'), 'LEDR', 'a bare LEDR bus name auto-maps');
assert.strictEqual(autoMapPort('LEDR3'), 'LEDR[3]', 'the bus rule does not shadow an indexed name');
assert.strictEqual(autoMapPort('HEX0_5'), 'HEX0[5]', 'the bus rule does not shadow a segment name');
store().resetBoard();
useBoardStore.setState({
  engine: hexVecEngine,
  simState: {},
  pinMappings: [{ portName: 'HEX0', physicalPin: null, virtualComponent: autoMapPort('HEX0') }],
});
store().runSimulationCycle();
assert.deepStrictEqual(
  [...store().hex[0]],
  [0, 0, 0, 0, 0, 0, 1],
  'a bare vector port with no qsf still drives all seven segments',
);
pass('a bare vector port maps and expands without a qsf');

// The scalar diagnostic from the bug report must still work unchanged.
store().resetBoard();
const scalarEngine = compileVerilog(`module de2_hex_scalar_diag (
  output SEG_A, output SEG_B, output SEG_C, output SEG_D,
  output SEG_E, output SEG_F, output SEG_G
);
  assign SEG_A = 1'b0;
  assign SEG_B = 1'b0;
  assign SEG_C = 1'b0;
  assign SEG_D = 1'b0;
  assign SEG_E = 1'b0;
  assign SEG_F = 1'b0;
  assign SEG_G = 1'b1;
endmodule
`);
useBoardStore.setState({
  engine: scalarEngine,
  simState: {},
  pinMappings: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((seg, bit) => ({
    portName: `SEG_${seg}`,
    physicalPin: null,
    virtualComponent: `HEX0[${bit}]`,
  })),
});
store().runSimulationCycle();
assert.deepStrictEqual(
  [...store().hex[0]],
  [0, 0, 0, 0, 0, 0, 1],
  'seven scalar outputs on the same pins still display "0"',
);
pass('the scalar HEX path is unchanged by the vector fix');

// LCD signal resolution must survive, in both spellings.
assert.strictEqual(autoMapPort('LCD_DATA[7]'), 'LCD_DATA[7]', 'bracketed LCD data still maps');
assert.strictEqual(autoMapPort('LCD_DATA7'), 'LCD_DATA[7]', 'scalar LCD data still maps');
const lcdVector = collectLcdBus({ LCD_DATA: 0b01000001, LCD_EN: 1, LCD_RS: 1 }, [
  { portName: 'LCD_DATA[0]', physicalPin: null, virtualComponent: 'LCD_DATA[0]' },
  { portName: 'LCD_DATA[6]', physicalPin: null, virtualComponent: 'LCD_DATA[6]' },
  { portName: 'LCD_EN', physicalPin: null, virtualComponent: 'LCD_EN' },
  { portName: 'LCD_RS', physicalPin: null, virtualComponent: 'LCD_RS' },
]);
assert.ok(lcdVector, 'an LCD design with a packed data bus produces a bus');
assert.strictEqual(lcdVector!.en, 1, 'LCD_EN still resolves');
assert.strictEqual(lcdVector!.rs, 1, 'LCD_RS still resolves');
pass('LCD signal resolution is unaffected by the vector fix');

store().resetBoard();
useBoardStore.setState({ engine: null, pinMappings: [], simState: {} });

/* ────────────────────────────────────────────────────────────────────────
 * 14. HDL named constants, and the LCD example on the real path
 *
 * The engine previously had no notion of `localparam` / `parameter`. An
 * unknown identifier resolved to 0, so `if (step < LAST_STEP)` silently became
 * `if (step < 0)` — never true. No compile error, just dead logic. That is
 * what held LCD_EN high forever and blanked the display: the peripheral was
 * fine and was simply never handed a transaction.
 *
 * Constants are now resolved at compile time and seeded into the evaluation
 * state, so identifier resolution finds them the same way it finds a wire. No
 * expression text is rewritten, which is why a constant cannot corrupt a
 * comment, a string, or a longer identifier that contains its name.
 * ──────────────────────────────────────────────────────────────────────── */

/** Runs a design for `posedges` clock edges through the production path. */
function runDesign(source: string, posedges: number, mappings?: ParsedPort[]): void {
  const built = compileVerilog(source);
  assert.ok(built, 'design compiles');
  store().resetBoard();
  useBoardStore.setState({
    engine: built,
    pinMappings: mappings ?? [],
    simState: {},
  });
  // tickClock toggles the clock; two toggles is one full cycle, so a posedge
  // needs two. runSimulationCycle is invoked synchronously here for the same
  // reason the browser defers it — one evaluation per clock transition.
  for (let i = 0; i < posedges * 2; i += 1) {
    store().tickClock();
    store().runSimulationCycle();
  }
}

const CONST_FORMS: Array<[string, string]> = [
  ['localparam without type', 'localparam LAST = 62;'],
  ['localparam int', 'localparam int LAST = 62;'],
  ['parameter without type', 'parameter LAST = 62;'],
  ['parameter int', 'parameter int LAST = 62;'],
  ['localparam with width', "localparam [6:0] LAST = 7'd62;"],
  ['localparam logic with width', "localparam logic [6:0] LAST = 7'd62;"],
];
for (const [label, decl] of CONST_FORMS) {
  runDesign(
    `module p (input CLOCK_50, output [6:0] OUT);
  ${decl}
  logic [6:0] step;
  always_ff @(posedge CLOCK_50) begin
    if (step < LAST) step <= step + 7'd1;
  end
  assign OUT = step;
endmodule
`,
    6,
  );
  assert.strictEqual(store().simState.LAST, 62, `${label}: the constant resolves to 62`);
  assert.strictEqual(store().simState.step, 6, `${label}: the counter advances past the comparison`);
}
pass('localparam and parameter resolve, with and without a type or width');

// Arithmetic, and one constant defined from another.
runDesign(
  `module p (input CLOCK_50, output [7:0] OUT);
  localparam WIDTH = 8;
  localparam MAX = WIDTH - 1;
  logic [7:0] acc;
  always_ff @(posedge CLOCK_50) begin
    if (acc < MAX) acc <= acc + 8'd1;
  end
  assign OUT = acc;
endmodule
`,
  20,
);
assert.strictEqual(store().simState.WIDTH, 8, 'a constant used in arithmetic resolves');
assert.strictEqual(store().simState.MAX, 7, 'a constant defined from another constant resolves');
assert.strictEqual(store().simState.acc, 7, 'the design saturates at the derived constant');
pass('named constants work in arithmetic and may reference each other');

// Case items.
runDesign(
  `module p (input CLOCK_50, output [7:0] OUT);
  localparam STATE_A = 2;
  localparam STATE_B = 4;
  logic [3:0] tick;
  logic [7:0] code;
  always_ff @(posedge CLOCK_50) begin
    if (tick < 6) tick <= tick + 4'd1;
  end
  always_comb begin
    case (tick)
      STATE_A: code = 8'hAA;
      STATE_B: code = 8'hBB;
      default: code = 8'h11;
    endcase
  end
  assign OUT = code;
endmodule
`,
  4,
);
assert.strictEqual(store().simState.tick, 4, 'the counter reached the second labelled state');
assert.strictEqual(store().simState.code, 0xbb, 'a named constant works as a case item');
pass('named constants work as case labels');

// Invalid declarations FAIL LOUDLY. Silently defaulting to 0 is the bug.
assert.strictEqual(
  buildConstantTable('localparam GOOD = 4; localparam ALSO = GOOD + 4;').ALSO,
  8,
  'a resolvable table builds',
);
/*
 * A constant expression uses the engine's OWN expression language — there is
 * no second, divergent one — so an operator the engine does not tokenise is
 * not available in a constant either. It now fails loudly and by name instead
 * of silently becoming 0, which is the whole point of this layer.
 */
assert.throws(
  () => buildConstantTable('localparam SCALED = 4 * 2;'),
  (err: unknown) =>
    err instanceof NamedConstantError &&
    err.constantName === 'SCALED' &&
    /cannot evaluate at compile time/.test((err as Error).message),
  'an operator outside the engine expression grammar is a clear error, not a zero',
);
assert.deepStrictEqual(buildConstantTable('wire x;'), {}, 'a design with no constants costs nothing');
assert.throws(
  () => buildConstantTable('localparam A = B + 1;\nlocalparam B = A;'),
  (err: unknown) =>
    err instanceof NamedConstantError && /circular/i.test((err as Error).message),
  'a circular constant is rejected by name, not left to become 0',
);
assert.throws(
  () => buildConstantTable('localparam BAD = ;'),
  (err: unknown) => err instanceof NamedConstantError,
  'a constant with no value is rejected',
);
// And the error escapes compileVerilog rather than producing a dead design.
assert.throws(
  () => compileVerilog('module p (output X);\n localparam A = B + 1;\n localparam B = A;\n assign X = 1\'b1;\nendmodule\n'),
  (err: unknown) => err instanceof NamedConstantError,
  'compiling a design with a circular constant fails loudly',
);
pass('unresolvable and circular constants are compile errors, never silent zeros');

// A constant must not be substituted into a name that merely contains it.
runDesign(
  `module p (input CLOCK_50, output [7:0] OUT);
  localparam LEN = 3;
  logic [7:0] LENGTH;
  always_ff @(posedge CLOCK_50) begin
    LENGTH <= LEN + 8'd10;
  end
  assign OUT = LENGTH;
endmodule
`,
  4,
);
assert.strictEqual(store().simState.LEN, 3, 'the short constant resolves');
assert.strictEqual(
  store().simState.LENGTH,
  13,
  'a signal whose name CONTAINS a constant name is untouched — no text substitution',
);
pass('constant resolution never rewrites a longer identifier that contains its name');

/* ────────────────────────────────────────────────────────────────────────
 * 15. DE2 LCD Hello on the production path
 *
 * The real bundled example, unmodified, through compileVerilog -> simulation
 * cycles -> runSimulationCycle -> the LCD bus -> lcdController -> boardStore.
 * No replayed bytes and no injected text: if the HDL does not perform the
 * transactions, these assertions fail.
 * ──────────────────────────────────────────────────────────────────────── */

const lcdExample = fs.readFileSync(
  path.join(process.cwd(), 'src/examples/source/de2_lcd_hello.sv'),
  'utf8',
);
assert.ok(
  /localparam/.test(lcdExample),
  'the example still uses the localparam it was written with — the engine supports it now',
);

const lcdEngine = compileVerilog(lcdExample);
assert.ok(lcdEngine, 'the LCD example compiles');
const lcdMappings: ParsedPort[] = [...(lcdEngine.inputs ?? []), ...(lcdEngine.outputs ?? [])].map(
  (portName) => ({ portName, physicalPin: null, virtualComponent: autoMapPort(portName) }),
);

function runLcdExample(): void {
  store().resetBoard();
  useBoardStore.setState({ engine: lcdEngine, pinMappings: lcdMappings, simState: {} });
  for (let i = 0; i < 200; i += 1) {
    store().tickClock();
    store().runSimulationCycle();
  }
}

runLcdExample();
const [helloLine1, helloLine2] = lcdLines(store().lcd);
assert.strictEqual(helloLine1.trimEnd(), 'ENGINEERING LAB', 'line 1 comes from simulated HDL writes');
assert.strictEqual(helloLine2.trimEnd(), 'HELLO FPGA', 'line 2 comes from simulated HDL writes');
assert.strictEqual(helloLine1.length, LCD_COLS, 'line 1 is padded to the panel width');
assert.strictEqual(helloLine2.length, LCD_COLS, 'line 2 is padded to the panel width');
assert.ok(store().lcd.displayOn, 'the example turned the display on via 0x0C');
assert.ok(store().lcd.powered, 'LCD_ON is asserted by the example');
assert.strictEqual(store().lcd.unsupportedReads, 0, 'the example never attempts an LCD read');
// The characters really did arrive as DDRAM writes, at the documented addresses.
assert.strictEqual(store().lcd.ddram[0x00], 'E'.charCodeAt(0), 'line 1 starts at DDRAM 0x00');
assert.strictEqual(store().lcd.ddram[0x40], 'H'.charCodeAt(0), 'line 2 starts at DDRAM 0x40');
pass('the bundled LCD example writes ENGINEERING LAB / HELLO FPGA through the real simulator');

// Board reset must blank it, and re-running must write it again.
store().resetBoard();
const [resetLine1, resetLine2] = lcdLines(store().lcd);
assert.strictEqual(resetLine1, ' '.repeat(LCD_COLS), 'board reset blanks line 1');
assert.strictEqual(resetLine2, ' '.repeat(LCD_COLS), 'board reset blanks line 2');
assert.strictEqual(store().lcd.address, 0, 'board reset homes the cursor');
assert.strictEqual(store().lcd.displayOn, false, 'board reset returns the display to power-on state');

runLcdExample();
const [againLine1, againLine2] = lcdLines(store().lcd);
assert.strictEqual(againLine1, 'ENGINEERING LAB '.padEnd(LCD_COLS), 'line 1 is rewritten after a reset');
assert.strictEqual(againLine2, 'HELLO FPGA'.padEnd(LCD_COLS), 'line 2 is rewritten after a reset');
pass('board reset clears the LCD and the example rewrites it afterwards');

store().resetBoard();
useBoardStore.setState({ engine: null, pinMappings: [], simState: {} });

console.log(`--- DE2 Board Renderer Regression: PASS (${checks.length} checks) ---`);
