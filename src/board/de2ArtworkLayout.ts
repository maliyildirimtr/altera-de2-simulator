/**
 * Calibration between the canonical DE2 layout and the premium raster artwork.
 *
 * ── What this module is for ───────────────────────────────────────────────
 * `src/board/de2Layout.ts` is HARDWARE TRUTH: real millimetres on a real
 * 203 x 153 mm board, and it is what the vector renderers and the regression
 * suite measure against. This module is PRESENTATION ONLY: it says where each
 * live component happens to sit inside one particular piece of artwork.
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
 * Measured, not eyeballed. The component bodies were located in the source
 * render by colour segmentation (the ivory switch housings, the amber and
 * green LED lenses, the red seven-segment glyphs, the grey tact-switch
 * bodies) and their bounding-box centres normalised against the cropped
 * artwork. Source render 4096 x 3277, cropped to (104, 150) + 3892 x 2979
 * to trim the backdrop, then resampled for delivery.
 */

/**
 * Delivered artwork, served from `public/`.
 *
 * A plain absolute path rather than `import.meta.env.BASE_URL`: the app is
 * served from the root (`vite.config.ts` sets `base: '/'`), the rest of the
 * codebase already references public assets this way, and the headless
 * renderer tests compile this module with tsc rather than Vite, where
 * `import.meta.env` does not exist. If the app ever moves to a sub-path, this
 * is the one line to change.
 */
export const DE2_ARTWORK_SRC = '/boards/de2/de2-board-master.webp';

/**
 * Intrinsic size of the delivered artwork, and therefore the aspect ratio the
 * hybrid renderer's viewBox uses. Overlay coordinates are normalised, so this
 * only sets the shape of the drawing surface.
 */
export const DE2_ARTWORK = { width: 3892, height: 2979 } as const;

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
 * `SWITCH_CX` is SW17 and the last entry is SW0. The renderer pairs these
 * with the canonical component list rather than re-deriving the order.
 * ──────────────────────────────────────────────────────────────────────── */

/** Centre x of SW17..SW0. */
export const SWITCH_CX: readonly number[] = [
  0.042009, 0.076824, 0.110226, 0.144913, 0.179856, 0.214286, 0.25, 0.284558, 0.31963,
  0.355601, 0.39093, 0.426259, 0.461845, 0.497816, 0.532374, 0.567318, 0.602261, 0.637205,
];

/** Centre x of KEY3..KEY0. */
export const KEY_CX: readonly number[] = [
  0.695786, 0.766444, 0.836331, 0.907503,
];

/** Centre x of LEDR17..LEDR0. */
export const LED_RED_CX: readonly number[] = [
  0.020298, 0.053186, 0.086973, 0.120761, 0.154548, 0.188977, 0.223022, 0.257451, 0.291881,
  0.326567, 0.361254, 0.396069, 0.431012, 0.46557, 0.500257, 0.534943, 0.570015, 0.604445,
];

/** Centre x of LEDG8..LEDG0. */
export const LED_GREEN_CX: readonly number[] = [
  0.675231, 0.710689, 0.74666, 0.782374, 0.817831, 0.85406, 0.889774, 0.925231, 0.960432,
];

/** Centre x of the HEX7..HEX0 digit windows. */
export const HEX_CX: readonly number[] = [
  0.051259, 0.087616, 0.162384, 0.198741, 0.298047, 0.336331, 0.37333, 0.410072,
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
  bodyWidth: 0.024666,
  bodyHeight: 0.083249,
  bodyTop: 0.889225,
  /** Recessed channel the lever travels in — this is what gets masked. */
  slotWidth: 0.016958,
  slotTop: 0.90668,
  slotHeight: 0.054045,
  /** The lever nub, slightly wider than its channel, as moulded. */
  leverWidth: 0.018243,
  leverHeight: 0.026183,
} as const;

/** Travel available to the lever, in normalised units. */
export const SWITCH_TRAVEL = SWITCH_ART.slotHeight - SWITCH_ART.leverHeight;

/**
 * Tact switch. The artwork supplies the whole stainless body; the overlay
 * owns only the plunger, which drops slightly when pressed.
 */
export const KEY_ART = {
  bodyWidth: 0.049589,
  bodyHeight: 0.068815,
  centreY: 0.937563,
  plungerRadius: 0.011305,
  /** How far the plunger sinks when held down. */
  plungerTravel: 0.003021,
} as const;

/**
 * Indicator LEDs. The artwork's lenses are drawn lit, so the overlay always
 * paints an unlit lens over them first and only then adds the emitter — see
 * the note on baked-in state in the hybrid renderer.
 */
export const LED_RED_ART = {
  width: 0.00925,
  height: 0.012756,
  centreY: 0.854985,
} as const;

export const LED_GREEN_ART = {
  width: 0.008222,
  height: 0.016113,
  centreY: 0.859349,
} as const;

/**
 * Seven-segment digit window. The artwork shows every display reading "8", so
 * the overlay repaints the window in the module's own face colour before
 * drawing live segments.
 */
export const HEX_ART = {
  /** The area repainted to erase the artwork's digit. */
  windowWidth: 0.0352,
  windowHeight: 0.065794,
  centreY: 0.769721,
  /** The live digit itself, inset inside that window. */
  digitWidth: 0.030576,
  digitHeight: 0.059752,
} as const;
