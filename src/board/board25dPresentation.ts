/**
 * Which 2.5D presentation the DE2 board uses.
 *
 * The same arrangement as `board2dPresentation.ts`, for the same reasons:
 * one view mode, two renderers, both fed by the same store.
 *
 *   'artwork'  the transparent board render, given shallow physical depth
 *   'vector'   the all-SVG extruded technical illustration
 *
 * This is NOT a new `BoardViewMode`. The enum, the selector and the persisted
 * preference are part of the board's public contract and are untouched.
 *
 * The vector 2.5D stays fully wired rather than deleted. It is the only 2.5D
 * renderer whose geometry is measured directly against the canonical
 * millimetre layout in `de2Layout.ts`, which makes it the reference the
 * artwork scene is sanity-checked against, and the fallback while the artwork
 * scene's depths are still being judged by eye.
 */

export type Board25DPresentation = 'artwork' | 'vector';

export const BOARD_25D_PRESENTATIONS: readonly Board25DPresentation[] = ['artwork', 'vector'];

/** What ships. Change this one line to make the vector 2.5D the default again. */
export const DEFAULT_BOARD_25D_PRESENTATION: Board25DPresentation = 'artwork';

/**
 * Development override, so the fallback is reachable without a rebuild:
 *
 *   localStorage.setItem('engineering-lab-de2-25d-presentation', 'vector')
 *
 * Presentation only. Nothing about simulation state is read from or written to
 * storage — the board's values always come from the engine through boardStore.
 */
export const BOARD_25D_PRESENTATION_STORAGE_KEY = 'engineering-lab-de2-25d-presentation';

export function isBoard25DPresentation(value: unknown): value is Board25DPresentation {
  return (
    typeof value === 'string' &&
    BOARD_25D_PRESENTATIONS.includes(value as Board25DPresentation)
  );
}

/**
 * Resolves the presentation, falling back to the default for anything
 * missing, malformed or unrecognised. Storage access is wrapped because it
 * throws in private-mode and sandboxed contexts.
 */
export function loadBoard25DPresentation(): Board25DPresentation {
  try {
    const stored = globalThis.localStorage?.getItem(BOARD_25D_PRESENTATION_STORAGE_KEY);
    if (isBoard25DPresentation(stored)) return stored;
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return DEFAULT_BOARD_25D_PRESENTATION;
}

/**
 * Resolved once per page load rather than per render, matching the 2D module:
 * the override exists for development, and reading storage inside a render
 * path would cost on every board update.
 */
export const ACTIVE_BOARD_25D_PRESENTATION: Board25DPresentation = loadBoard25DPresentation();
