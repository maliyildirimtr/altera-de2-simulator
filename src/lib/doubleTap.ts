/**
 * Double tap for touch screens, where `dblclick` is not reliably fired.
 * `doubleTap(e, key)` returns true on the second touch tap on the same target
 * key within 350 ms and 24 px. A double tap marks the next `dblclick` as
 * already handled, so `handledByTap()` stops it running twice.
 */
let last: { key: string; t: number; x: number; y: number } | null = null;
let handledAt = 0;

export function doubleTap(e: { pointerType: string; clientX: number; clientY: number; timeStamp: number }, key: string): boolean {
  if (e.pointerType !== 'touch') return false;
  const now = e.timeStamp;
  const hit = last && last.key === key && now - last.t < 350 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 24;
  if (hit) {
    last = null;
    handledAt = performance.now();
    return true;
  }
  last = { key, t: now, x: e.clientX, y: e.clientY };
  return false;
}

/** True while a `dblclick` that follows a handled double tap should be ignored. */
export function handledByTap(): boolean {
  return performance.now() - handledAt < 600;
}
