/**
 * Calibration between the canonical DE2 layout and the final board artwork.
 *
 * ── What this module is for ───────────────────────────────────────────────
 * `src/board/de2Layout.ts` is HARDWARE TRUTH: real millimetres on a real
 * 203 x 153 mm board, and it is what the vector renderers and the regression
 * suite measure against. This module is PRESENTATION ONLY: it says where each
 * live component sits inside one particular piece of artwork.
 *
 * The two disagree slightly, because the artwork is a render rather than a
 * mechanical drawing. That is fine and expected. The rule is one-directional:
 *
 *   de2Layout.ts is NEVER edited to make the artwork line up.
 *
 * If a future artwork revision shifts, only the numbers in this file change,
 * and nothing that the simulator or the tests depend on moves.
 *
 * ── Coordinate system ─────────────────────────────────────────────────────
 * Everything here is NORMALISED to the artwork: 0..1 across the image width
 * and 0..1 down its height, so the values are resolution-independent and
 * survive re-exporting the artwork at a different size. The hybrid renderer
 * draws into an SVG whose viewBox is the artwork's own aspect ratio, and
 * multiplies these fractions by the viewBox extent — so overlays scale with
 * the board automatically, through zoom, fit-to-view and window resize, with
 * no pixel arithmetic anywhere.
 *
 * ── How these numbers were produced ───────────────────────────────────────
 * Measured, not eyeballed, and measured PER BANK rather than assumed to be an
 * even pitch — the artwork's rows are very slightly not co-linear and the
 * calibration follows the artwork rather than correcting it. Each family was
 * located in the source render by colour segmentation (ivory switch housings
 * and tact-switch bodies, red and green LED lenses, red seven-segment glyphs,
 * the sage LCD panel) and its bounding-box centres normalised against the
 * cropped artwork.
 *
 * Source render 4096 x 3277, cropped to (104, 152) + 3888 x 2972 to trim
 * the backdrop, then resampled to 2432 x 1859 for delivery.
 *
 * The largest disagreement the measurement found: LEDR centres sit up to
 * 20 source pixels (0.5% of the board width) to the right of
 * the switch they stand above, worst around the middle of the bank. That is
 * the artwork's own drift, not a calibration error, which is exactly why the
 * two banks get their own arrays instead of sharing one pitch.
 */

/**
 * Runtime artwork, served from `public/`. WebP for delivery; the PNG master
 * ships alongside it at `de2-board-final.png` and is the source of record.
 *
 * A plain absolute path rather than `import.meta.env.BASE_URL`: the app is
 * served from the root (`vite.config.ts` sets `base: '/'`), the rest of the
 * codebase already references public assets this way, and the headless
 * renderer tests compile this module with tsc rather than Vite, where
 * `import.meta.env` does not exist. If the app ever moves to a sub-path, this
 * is the one line to change.
 */
export const DE2_ARTWORK_SRC = '/boards/de2/de2-board-final.webp';

/** The PNG master, kept for re-export and re-calibration. Not loaded at runtime. */
export const DE2_ARTWORK_MASTER = '/boards/de2/de2-board-final.png';

/**
 * Intrinsic size of the delivered artwork, and therefore the aspect ratio the
 * hybrid renderer's viewBox uses. Overlay coordinates are normalised, so this
 * only sets the shape of the drawing surface.
 */
export const DE2_ARTWORK = { width: 3888, height: 2972 } as const;

export const DE2_ARTWORK_ASPECT = DE2_ARTWORK.width / DE2_ARTWORK.height;

/**
 * The hybrid renderer's viewBox. Authored in the artwork's own pixel space so
 * the calibration fractions read as recognisable numbers when debugging, and
 * so `preserveAspectRatio` has nothing to correct.
 */
export const ARTWORK_VIEWBOX = `0 0 ${DE2_ARTWORK.width} ${DE2_ARTWORK.height}`;

/** Normalised fraction -> viewBox units. */
export const ax = (fx: number): number => fx * DE2_ARTWORK.width;
export const ay = (fy: number): number => fy * DE2_ARTWORK.height;

/* ────────────────────────────────────────────────────────────────────────
 * Banked component positions
 *
 * Each array is ordered HIGH INDEX FIRST, left to right across the board,
 * matching both the DE2 silkscreen and `de2Layout.ts`: index 0 of
 * `SWITCH_CX` is SW17 and the last entry is SW0.
 * ──────────────────────────────────────────────────────────────────────── */

/** Centre x of SW17..SW0. */
export const SWITCH_CX: readonly number[] = [
  0.041409, 0.075746, 0.109954, 0.14519, 0.18017, 0.214378, 0.25, 0.284851, 0.320087,
  0.355838, 0.391075, 0.426569, 0.461934, 0.497942, 0.532536, 0.567515, 0.602495, 0.638117,
];

/** Centre x of KEY3..KEY0. */
export const KEY_CX: readonly number[] = [
  0.695602, 0.766461, 0.83642, 0.908179,
];

/** Centre x of LEDR17..LEDR0. */
export const LED_RED_CX: readonly number[] = [
  0.041795, 0.075103, 0.110468, 0.146091, 0.181456, 0.216178, 0.251672, 0.287551, 0.324331,
  0.359825, 0.395962, 0.431584, 0.466692, 0.500386, 0.534208, 0.56803, 0.601723, 0.637346,
];

/**
 * Centre x of LEDG7..LEDG0 — the horizontal bank above the KEY buttons.
 *
 * LEDG8 is NOT in this array. On the real DE2 it is a single green LED sitting
 * on its own between the HEX bank and the green bank, and the artwork draws it
 * there, so it is calibrated separately below. Keeping it out of the bank is
 * what stops a tenth green LED appearing.
 */
export const LED_GREEN_BANK_CX: readonly number[] = [
  0.675412, 0.711677, 0.748843, 0.786908, 0.825489, 0.86304, 0.901878, 0.937114,
];

/** LEDG8, the odd one out: its own position, not part of the bank. */
export const LED_GREEN_8 = { cx: 0.259002, cy: 0.778264 } as const;

/** Centre x of the HEX7..HEX0 digit windows. */
export const HEX_CX: readonly number[] = [
  0.050669, 0.08732, 0.161908, 0.19856, 0.311214, 0.345036, 0.378729, 0.411523,
];

/* ────────────────────────────────────────────────────────────────────────
 * Per-family geometry
 *
 * The artwork draws every member of a bank identically, so each family needs
 * one size and one row position rather than 18 bounding boxes.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Slide switch. The artwork supplies the ivory housing; the overlay owns only
 * the recessed channel and the moving lever inside it, so there is never a
 * second housing drawn on top of the first.
 */
export const SWITCH_ART = {
  /** Housing, used for the hit area and the focus ring. */
  bodyWidth: 0.024691,
  bodyHeight: 0.085128,
  bodyTop: 0.888291,
  /** Recessed channel the lever travels in — this is what gets masked. */
  slotWidth: 0.016975,
  slotTop: 0.90646,
  slotHeight: 0.055182,
  /** The lever nub, slightly wider than its channel, as moulded. */
  leverWidth: 0.018519,
  leverHeight: 0.026581,
} as const;

/** Travel available to the lever, in normalised units. */
export const SWITCH_TRAVEL = SWITCH_ART.slotHeight - SWITCH_ART.leverHeight;

/**
 * Tact switch. The artwork supplies the whole stainless body; the overlay
 * owns only the plunger, which drops slightly when pressed.
 */
export const KEY_ART = {
  bodyWidth: 0.04964,
  bodyHeight: 0.070323,
  centreY: 0.937752,
  /**
   * The plunger, measured from the artwork (100 x 102 px, so r = 50) rather
   * than guessed. Matching it exactly matters: an oversized overlay swallows
   * the metal bezel the artwork draws around it and the button stops looking
   * like a tact switch.
   */
  plungerRadius: 0.01286,
  /** How far the plunger sinks when held down. */
  plungerTravel: 0.003028,
} as const;

/**
 * Indicator LEDs. The artwork's lenses are drawn LIT, so the overlay always
 * paints an unlit lens over them first and only then adds the emitter — see
 * the note on baked-in state in the hybrid renderer.
 */
export const LED_RED_ART = {
  width: 0.012346,
  height: 0.018843,
  centreY: 0.856157,
} as const;

export const LED_GREEN_ART = {
  width: 0.011317,
  height: 0.017497,
  centreY: 0.855485,
} as const;

/** LEDG8 is drawn a little smaller than the bank in the artwork. */
export const LED_GREEN_8_ART = {
  width: 0.010288,
  height: 0.01817,
} as const;

/**
 * Seven-segment digit window. The artwork shows every display reading "8", so
 * the overlay repaints the window in the module's own face colour before
 * drawing live segments.
 */
export const HEX_ART = {
  /** The area repainted to erase the artwork's digit. */
  windowWidth: 0.034465,
  windowHeight: 0.064603,
  centreY: 0.771366,
  /** The live digit itself, inset inside that window. */
  digitWidth: 0.030093,
  digitHeight: 0.057873,
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * 16 x 2 character LCD
 *
 * The artwork supplies the module, the bezel and the sage glass. The overlay
 * owns only the characters, drawn on the glass itself — never an HTML input
 * or a panel of its own.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The glass panel, measured from the artwork, and the character area inset
 * inside it. The inset is what keeps text off the bezel: a 16 x 2 character
 * area is about 5.3:1, while the glass including its margin is 4.1:1, so the
 * difference is border rather than display.
 */
export const LCD_ART = {
  glassX: 0.071502,
  glassY: 0.526918,
  glassWidth: 0.318673,
  glassHeight: 0.100606,
  /** Character area, as a fraction of the glass. */
  insetX: 0.055,
  insetY: 0.16,
} as const;

/** The DE2's LCD is a 16 x 2 character module. Not configurable. */
export const LCD_COLUMNS = 16;
export const LCD_ROWS = 2;
