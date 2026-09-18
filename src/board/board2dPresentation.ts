/**
 * Which 2D presentation the DE2 board uses.
 *
 * There are two renderers for the SAME view mode, both fed by the same store:
 *
 *   'artwork'  the premium raster render with live SVG overlays (default)
 *   'vector'   the all-SVG technical illustration
 *
 * This is NOT a new `BoardViewMode`. The view-mode enum, its selector and its
 * persisted preference are part of the board's public contract and are left
 * alone; mode '2d' simply has two ways of being drawn. Keeping the distinction
 * here means the artwork renderer can be swapped in, or fallen back out of,
 * without touching view switching, persistence or anything the DE2 regression
 * suite asserts on.
 *
 * The vector renderer stays fully wired, not commented out: it is the safety
 * net while the artwork renderer is still being calibrated, and it is the only
 * presentation whose geometry is measured directly against the canonical
 * millimetre layout.
 */

export type Board2DPresentation = 'artwork' | 'vector';

export const BOARD_2D_PRESENTATIONS: readonly Board2DPresentation[] = ['artwork', 'vector'];

/**
 * What ships. Change this one line to make the vector board the default again.
 */
export const DEFAULT_BOARD_2D_PRESENTATION: Board2DPresentation = 'artwork';

/**
 * Development override, so the fallback is reachable without a rebuild:
 *
 *   localStorage.setItem('engineering-lab-de2-2d-presentation', 'vector')
 *
 * Presentation only. Nothing about simulation state is read from or written to
 * storage — the board's values always come from the engine through boardStore.
 */
export const BOARD_2D_PRESENTATION_STORAGE_KEY = 'engineering-lab-de2-2d-presentation';

export function isBoard2DPresentation(value: unknown): value is Board2DPresentation {
  return typeof value === 'string' && BOARD_2D_PRESENTATIONS.includes(value as Board2DPresentation);
}

/**
 * Resolves the presentation, falling back to the default for anything missing,
 * malformed or unrecognised. Storage access is wrapped because it throws in
 * private-mode and sandboxed contexts.
 */
export function loadBoard2DPresentation(): Board2DPresentation {
  try {
    const stored = globalThis.localStorage?.getItem(BOARD_2D_PRESENTATION_STORAGE_KEY);
    if (isBoard2DPresentation(stored)) return stored;
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return DEFAULT_BOARD_2D_PRESENTATION;
}

/**
 * Resolved once per page load rather than per render: the override exists for
 * development, so it does not need to react to storage changing mid-session,
 * and reading storage inside a render path would cost on every board update.
 */
export const ACTIVE_BOARD_2D_PRESENTATION: Board2DPresentation = loadBoard2DPresentation();
