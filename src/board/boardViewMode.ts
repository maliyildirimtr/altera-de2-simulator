/**
 * Board view mode — which renderer draws the DE2 board.
 *
 * This is a *presentation* concern only. The simulation state lives in
 * `boardStore` and is shared by every renderer; switching view mode must never
 * touch, reset or re-initialise the simulator.
 *
 * localStorage holds the user's view preference and nothing else. It is never
 * a source of simulation state.
 */

export type BoardViewMode = '2d' | '2.5d' | '3d';

export const BOARD_VIEW_STORAGE_KEY = 'engineering-lab-de2-view-mode';

export const DEFAULT_BOARD_VIEW_MODE: BoardViewMode = '2d';

export interface BoardViewModeOption {
  mode: BoardViewMode;
  /** Short label for the selector. */
  label: string;
  /** Tooltip / accessible description. */
  description: string;
  /** Disabled modes render a placeholder and cannot be selected. */
  enabled: boolean;
  /** Shown as a badge next to disabled modes. */
  badge?: string;
}

/**
 * 3D is deliberately present but disabled: the renderer architecture is ready
 * for it, the implementation is not. No fake 3D functionality is offered.
 */
export const BOARD_VIEW_MODES: BoardViewModeOption[] = [
  {
    mode: '2d',
    label: '2D',
    description: 'Flat technical top view of the DE2 board',
    enabled: true,
  },
  {
    mode: '2.5d',
    label: '2.5D',
    description: 'Elevated view with component depth and package height',
    enabled: true,
  },
  {
    mode: '3d',
    label: '3D',
    description: 'Full 3D board model — not available yet',
    enabled: false,
    badge: 'Soon',
  },
];

export function isBoardViewMode(value: unknown): value is BoardViewMode {
  return value === '2d' || value === '2.5d' || value === '3d';
}

export function isBoardViewModeEnabled(mode: BoardViewMode): boolean {
  return BOARD_VIEW_MODES.some((o) => o.mode === mode && o.enabled);
}

/**
 * Reads the persisted view preference. Falls back to the default for missing,
 * malformed or currently-disabled values, so a stale `3d` preference can never
 * leave the workspace stuck on an unavailable renderer.
 */
export function loadBoardViewMode(): BoardViewMode {
  try {
    const raw = localStorage.getItem(BOARD_VIEW_STORAGE_KEY);
    if (isBoardViewMode(raw) && isBoardViewModeEnabled(raw)) return raw;
  } catch {
    // Storage unavailable (private mode, blocked cookies) — use the default.
  }
  return DEFAULT_BOARD_VIEW_MODE;
}

export function saveBoardViewMode(mode: BoardViewMode): void {
  try {
    localStorage.setItem(BOARD_VIEW_STORAGE_KEY, mode);
  } catch {
    // Persisting the preference is best-effort and never blocks the UI.
  }
}
