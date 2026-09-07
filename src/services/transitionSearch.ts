// ============================================================
// transitionSearch.ts — Edge Navigation Service (F1.2 / F2.1)
// Pure functions for finding prev/next signal transitions.
// Extracted from WaveformSimulator.tsx (F2.1 refactor).
// ============================================================

import type { VCDSignal } from './vcdParser';

/**
 * Find the time of the next or previous signal edge from a given time.
 * Returns null if no transition exists in that direction.
 *
 * @param signal      - The VCDSignal to search.
 * @param currentTime - The cursor position (ps).
 * @param direction   - 'next' or 'prev'.
 * @param epsilon     - Small offset to avoid matching current position (default: 0.5 ps).
 */
export function findEdge(
  signal: VCDSignal,
  currentTime: number,
  direction: 'prev' | 'next',
  epsilon = 0.5,
): number | null {
  const trans = signal.transitions;
  if (direction === 'next') {
    const found = trans.find(t => t.time > currentTime + epsilon);
    return found ? found.time : null;
  }
  // Reverse linear search for 'prev'
  for (let i = trans.length - 1; i >= 0; i--) {
    if (trans[i].time < currentTime - epsilon) return trans[i].time;
  }
  return null;
}
