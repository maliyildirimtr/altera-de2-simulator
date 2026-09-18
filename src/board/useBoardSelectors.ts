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
import { useBoardStore } from '../store/boardStore';

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
