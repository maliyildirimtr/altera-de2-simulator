/**
 * localStorage keys for per-browser preferences.
 *
 * The product was renamed from "Engineering Lab" to "Logic Lab". Old keys are
 * copied to the new names once so nobody loses their theme or board view.
 */
export const THEME_STORAGE_KEY = 'logiclab_theme_v1';
export const BOARD_VIEW_STORAGE_KEY = 'logiclab-de2-view-mode';
export const BOARD_2D_PRESENTATION_STORAGE_KEY = 'logiclab-de2-2d-presentation';
export const BOARD_25D_PRESENTATION_STORAGE_KEY = 'logiclab-de2-25d-presentation';

const LEGACY_KEYS: ReadonlyArray<[legacy: string, current: string]> = [
  ['engineering_lab_theme_v1', THEME_STORAGE_KEY],
  ['engineering-lab-de2-view-mode', BOARD_VIEW_STORAGE_KEY],
  ['engineering-lab-de2-2d-presentation', BOARD_2D_PRESENTATION_STORAGE_KEY],
  ['engineering-lab-de2-25d-presentation', BOARD_25D_PRESENTATION_STORAGE_KEY],
];

export function migrateLegacyStorageKeys(): void {
  try {
    for (const [legacy, current] of LEGACY_KEYS) {
      const value = localStorage.getItem(legacy);
      if (value === null) continue;
      if (localStorage.getItem(current) === null) localStorage.setItem(current, value);
      localStorage.removeItem(legacy);
    }
  } catch {
    /* storage unavailable: nothing to migrate */
  }
}
