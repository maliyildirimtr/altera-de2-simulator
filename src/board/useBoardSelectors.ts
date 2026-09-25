/**
 * Granular board-state selectors shared by every DE2 renderer.
 *
 * The simulation core and `boardStore` remain the single source of truth.
 * These hooks exist so a renderer can subscribe to exactly one indicator:
 * a change to LEDR0 re-renders LEDR0 and nothing else.
 *
 * `runSimulationCycle` rebuilds `ledR`, `ledG` and `hex` on every tick, so the
 * arrays always have fresh identities. Scalar selectors sidestep that; the HEX
 * selector uses a shallow comparison so an unchanged 7-element segment array
 * does not re-render the display.
 */

import { useShallow } from 'zustand/react/shallow';
import { lcdCursor, lcdIsVisible, lcdLines } from '../core/peripherals/lcdController';
import { useBoardStore } from '../store/boardStore';
import type { LcdDebug } from '../store/boardStore';

/** `1` when SW`index` is up. */
export function useSwitchValue(index: number): number {
  return useBoardStore((s) => s.switches[index] ?? 0);
}

/**
 * KEY inputs are ACTIVE-LOW in the store: `0` means pressed, `1` released.
 * This hook returns the pressed *state*, not the electrical level.
 */
export function useKeyPressed(index: number): boolean {
  return useBoardStore((s) => (s.keys[index] ?? 1) === 0);
}

/** `1` when LEDR`index` is lit (active-high). */
export function useLedRedValue(index: number): number {
  return useBoardStore((s) => s.ledR[index] ?? 0);
}

/** `1` when LEDG`index` is lit (active-high). */
export function useLedGreenValue(index: number): number {
  return useBoardStore((s) => s.ledG[index] ?? 0);
}

/** Presentation-only power/status lamps shown once a design is compiled. */
export function useBoardCompiledReady(): boolean {
  return useBoardStore((s) => s.compileState === 'ready' && s.engine !== null);
}

/**
 * Raw 7-segment values for HEX`index`, exactly as the simulator produced them.
 *
 * DE2 seven-segment outputs are ACTIVE-LOW: a segment is lit when its value is
 * `0`. Renderers must use `isSegmentLit` rather than re-deriving this, and must
 * publish the raw array unmodified on `data-segments` for the regression suite.
 */
export function useHexSegments(index: number): number[] {
  return useBoardStore(useShallow((s) => s.hex[index] ?? EMPTY_SEGMENTS));
}

const EMPTY_SEGMENTS: number[] = [1, 1, 1, 1, 1, 1, 1];

/**
 * Seven-segment activity test. ACTIVE-LOW — do not change this without
 * re-checking `boardStore.runSimulationCycle` and the DE2 HEX regressions.
 */
export function isSegmentLit(value: number | undefined): boolean {
  return value === 0;
}

/** Board actions. Stable references — safe to use without memoisation. */
export function useToggleSwitch() {
  return useBoardStore((s) => s.toggleSwitch);
}

export function useSetKey() {
  return useBoardStore((s) => s.setKey);
}

/* ────────────────────────────────────────────────────────────────────────
 * 16 x 2 character LCD
 * ──────────────────────────────────────────────────────────────────────── */

export interface LcdView {
  /**
   * True once the design has performed any LCD write. Distinguishes a panel
   * nothing is driving from one a design has deliberately blanked.
   */
  initialised: boolean;
  /** Exactly LCD_COLS characters. */
  line1: string;
  line2: string;
  /** Powered AND display-on: whether the panel shows anything at all. */
  visible: boolean;
  backlight: boolean;
  /** Block cursor position, or null when the design did not enable one. */
  cursor: { row: number; col: number } | null;
}

/**
 * Everything a renderer needs to draw the LCD, derived from the store's
 * controller state.
 *
 * The derivation lives here rather than in the component so that both the
 * shape of the data and the rule for "is this panel showing anything" have one
 * definition. The renderer receives two strings of exactly `LCD_COLS`
 * characters and never sees DDRAM, an address counter or a command byte.
 *
 * The selector returns only primitives so the shallow comparison actually
 * bites: `lcdLines` builds new strings and `lcdCursor` a new object on every
 * call, so returning them directly would report a change on every simulation
 * tick even while the panel sits idle. The cursor is reassembled afterwards.
 */
export function useLcdView(): LcdView {
  const flat = useBoardStore(
    useShallow((s) => {
      const [line1, line2] = lcdLines(s.lcd);
      const cursor = lcdCursor(s.lcd);
      return {
        line1,
        line2,
        visible: lcdIsVisible(s.lcd),
        backlight: s.lcd.backlight,
        initialised: s.lcd.initialised,
        cursorRow: cursor?.row ?? -1,
        cursorCol: cursor?.col ?? -1,
      };
    }),
  );

  return {
    line1: flat.line1,
    line2: flat.line2,
    visible: flat.visible,
    backlight: flat.backlight,
    initialised: flat.initialised,
    cursor: flat.cursorRow >= 0 ? { row: flat.cursorRow, col: flat.cursorCol } : null,
  };
}

/**
 * What the LCD signal chain has done, for the attributes the panel publishes.
 *
 * A single object read straight from the store, deliberately NOT merged into
 * `useLcdView`: the panel's appearance must never depend on diagnostic data,
 * and keeping the two subscriptions apart is what guarantees it cannot start
 * to. The object is replaced every evaluation by design, so there is nothing
 * here to memoise.
 */
export function useLcdDebug(): LcdDebug {
  return useBoardStore((s) => s.lcdDebug);
}
