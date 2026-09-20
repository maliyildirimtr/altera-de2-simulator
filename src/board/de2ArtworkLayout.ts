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

/* ────────────────────────────────────────────────────────────────────────
 * Silkscreen corrections
 *
 * The final artwork has a handful of mistakes printed into it: several LED
 * designators are misspelt ("LED05" for LEDR5, "LED2" for LEDR2), the green
 * bank's labels are shifted by one so LEDG6 is missing entirely and one lens
 * reads "LED62", the HEX labels sit up to 38 px right of the digits they
 * name, and a placeholder reading "Text" was left on top of two capacitors
 * beside the LCD.
 *
 * None of that is fixable in the renderer by moving a live overlay, because
 * the mistakes are pixels. So the renderer masks each wrong region with the
 * board colour measured underneath it and prints the correct text as SVG on
 * top — the same approach the live overlays already use for the artwork's
 * baked-in LED and display state.
 *
 * Every band was measured from the artwork rather than estimated: the glyph
 * rows were found by thresholding the white silkscreen ink, and the fill
 * colour is the artwork's own board colour sampled inside each band with the
 * glyph pixels excluded.
 *
 * These are PRESENTATION corrections. No live position moves: the labels are
 * centred on the very same calibrated coordinates the LED and digit overlays
 * use, so a label and its part cannot disagree.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Board colour under the masked label rows. Sampled at the top and bottom of
 * each band, which agreed to within two levels, so one flat fill is enough —
 * the artwork has no texture or trace detail in these rows to reproduce.
 */
export const SILK_MASK_FILL = '#02375A';

export interface SilkMaskRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The regions repainted before the corrected text is drawn.
 *
 * Each is bounded tightly to the glyph row it covers: the LED rows stop short
 * of the thin silkscreen boundary line above them and of the lenses below,
 * and the HEX row stops above the display modules. Nothing here overlaps a
 * component, a pad or a trace.
 */
export const SILK_MASKS: readonly SilkMaskRect[] = [
  // Red LED designators, above the LEDR row.
  { id: 'ledr-labels', x: 0.025977, y: 0.825034, width: 0.630144, height: 0.016151 },
  // Green bank designators, above the LEDG row.
  { id: 'ledg-labels', x: 0.658693, y: 0.825034, width: 0.294496, height: 0.016151 },
  // LEDG8's own designator, which sits up by the HEX row.
  { id: 'ledg8-label', x: 0.242027, y: 0.746972, width: 0.033436, height: 0.015478 },
  // HEX designators, above the display modules.
  { id: 'hex-labels', x: 0.034979, y: 0.715343, width: 0.401235, height: 0.016824 },
];

/**
 * Type and placement for the replacement silkscreen.
 *
 * `charWidth` exists so each label is drawn with an explicit `textLength`.
 * That makes the result deterministic across machines and fonts — a label
 * occupies exactly the width calibrated for it, so it can never overflow into
 * its neighbour on a system whose condensed face is missing. The value is the
 * per-character width measured from the artwork's own labels.
 */
export const SILK_TEXT = {
  /** Cap height 29 px in the artwork; 40 gives the same cap height. */
  fontSize: 0.013459,
  charWidth: 0.004244,
  /** Matches the artwork's remaining silkscreen, a hair warmer. */
  fill: '#F4F2F0',
  /** Baselines, measured from the bottom of the artwork's own glyph rows. */
  ledBaseline: 0.83782,
  ledG8Baseline: 0.759758,
  hexBaseline: 0.730821,
} as const;

/**
 * The "Text" placeholder is the one correction a flat patch cannot make: it
 * lies across two electrolytic capacitors, an IC and a silver part, so
 * painting board colour over it would destroy more than it fixed.
 *
 * Instead a small artwork-derived patch image covers just that rectangle. It
 * was built from the artwork itself — the two capacitors are the same part, so
 * the heavily obscured right-hand one was rebuilt by copying its clean twin,
 * the left one from its own mirror, and only the remaining board and IC
 * pixels were reconstructed by inpainting. Pixels the placeholder did not
 * cover are unchanged.
 */
export const DE2_ARTWORK_PATCH_SRC = '/boards/de2/de2-board-patch.webp';

export const SILK_PATCH = {
  x: 0.436214,
  y: 0.453567,
  width: 0.136317,
  height: 0.094213,
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * Transparent artwork, and the board geometry the 2.5D scene extrudes
 *
 * ── Why a second artwork file ─────────────────────────────────────────────
 * The delivered 2D artwork is a CROP: it was trimmed to the PCB, which cuts
 * off the connectors, jacks and standoffs that overhang the substrate on the
 * real board. Flat, that loss is invisible. Tilted, it is not — a board whose
 * ports stop exactly at the PCB edge reads as a sticker.
 *
 * The transparent master is the same render, uncropped, with everything
 * outside the hardware alpha-zero. So the 2.5D view can show the overhang,
 * and the board can sit on a background instead of inside a rectangle.
 *
 * ── Why it needs no second calibration ───────────────────────────────────
 * Measured rather than assumed: the transparent file is the FULL source
 * render, and the delivered 2D artwork is its crop at (104, 152) sized
 * 3888 x 2972 — which is exactly the viewBox the 2D renderer already uses.
 * So placing the transparent image at (-104, -152) at 4096 x 3277 inside that
 * same viewBox lands its board precisely where the 2D artwork's board sits.
 *
 * Every existing normalised coordinate in this file therefore applies to the
 * transparent artwork unchanged, and the 2.5D renderer introduces no second
 * coordinate system. The mapping was verified end-to-end rather than trusted:
 * segmenting the switch housings and the tact bodies out of the transparent
 * file and normalising them through this placement reproduces `SWITCH_CX` and
 * `KEY_CX` — measured independently, from the cropped artwork — to within
 * 0.0004 of the board width, about 1.6 px in the source render.
 * ──────────────────────────────────────────────────────────────────────── */

/** Runtime transparent artwork. Alpha-preserving WebP; PNG master alongside. */
export const DE2_ARTWORK_TRANSPARENT_SRC = '/boards/de2/de2-board-transparent.webp';

/** The transparent PNG master, kept for re-export and re-measurement. */
export const DE2_ARTWORK_TRANSPARENT_MASTER = '/boards/de2/de2-board-transparent.png';

/**
 * Where the transparent artwork sits in the artwork viewBox, in viewBox units.
 *
 * These four numbers are the entire bridge between the two files. They are the
 * crop documented above, negated: the 2D artwork is the source render cropped
 * at (104, 152), so the uncropped render begins 104 units left and 152 units
 * above the viewBox origin and extends to the full 4096 x 3277.
 */
export const ARTWORK_PLANE = { x: -104, y: -152, width: 4096, height: 3277 } as const;

/**
 * The full hardware silhouette, normalised, including everything that
 * overhangs the substrate. Measured from the master's alpha channel.
 *
 * Used ONLY to size the 2.5D scene so nothing is clipped. It is emphatically
 * NOT the board outline — see `PCB_BODY`.
 */
export const ARTWORK_SILHOUETTE = {
  x: -0.018776,
  y: -0.040377,
  width: 1.034208,
  height: 1.038358,
} as const;

/**
 * The PCB substrate, and nothing else.
 *
 * ── Why this is measured separately from the alpha ───────────────────────
 * The alpha contour is the whole board ASSEMBLY. Extruding it would put PCB
 * thickness around the DC jack, the VGA shield, the SD socket and all four
 * corner standoffs — every one of which overhangs the substrate — and the
 * result is a thick lip tracing the outline of the hardware rather than a
 * board with an edge. The two shapes are genuinely different, and only one of
 * them is fibreglass.
 *
 * So the substrate was segmented by its own solder-mask colour and its four
 * straight edges taken as the mode of the per-scanline extents, which is
 * robust to the parts sitting on top of them: 81% of scanlines agree on the
 * left edge, 72% on the right, 98% on the bottom.
 *
 * The corners are square. That was settled by rendering the detected
 * rectangle back over the artwork and looking at it, after two automated
 * radius probes disagreed — 127 px against 33 px. Both were reading the
 * corner standoffs, which overhang the board on all four corners, rather than
 * the board. A hair of radius is kept so the extruded edge does not come to a
 * hard point.
 */
export const PCB_BODY = {
  x: 0.001783,
  y: 0.004486,
  width: 0.996434,
  height: 0.992732,
  /** ~0.6 mm. Enough to soften the extrusion, too small to read as a fillet. */
  radius: 0.0029,
} as const;

/**
 * Solder-mask colours, sampled from the artwork's own lower edge so the
 * extruded side cannot disagree with the surface above it.
 *
 * One light direction for the whole scene — upper left — so every side face
 * darkens downward.
 */
export const PCB_SUBSTRATE = {
  surface: '#0A3757',
  faceTop: '#072B44',
  faceBottom: '#041622',
} as const;

/**
 * One piece of artwork the 2.5D scene lifts off the board.
 *
 * `x/y/width/height` is the CROP — what gets lifted. `footX/footWidth` is
 * where the part actually meets the board, when that is narrower than the
 * crop, and it is what the extruded face is drawn to. The distinction is not
 * pedantic: the DC jack's crop is 10% wider than the jack, and a face drawn
 * to the crop puts a black bar across the board on either side of it.
 *
 * `faceTop/faceBottom` are sampled from this part's own lower body. A single
 * grey for a whole group paints the ivory switch housings and the pink MIC
 * jack with the same dark shadow, which is the difference between a part with
 * a side and a part with a hole under it.
 */
export interface ArtworkPart {
  x: number;
  y: number;
  width: number;
  height: number;
  footX?: number;
  footWidth?: number;
  faceTop?: string;
  faceBottom?: string;
}

/**
 * A group of artwork lifted to the same height.
 *
 * `parts` is a UNION, not a bounding box, and that distinction is load
 * bearing. The VGA connector is a T — a wide shield above a narrower shell —
 * and its bounding box has two corners of bare PCB in it. Lifting the box
 * would carry two tabs of board into the air with the connector. Two rects
 * that follow the part do not.
 */
export interface RaisedPartGroup {
  id: string;
  /** Height above the PCB in millimetres, from the real part. */
  heightMm: number;
  parts: readonly ArtworkPart[];
  /** Fallback side colours, for groups whose members are identical. */
  faceTop: string;
  faceBottom: string;
}

/**
 * Body of one slide switch, and of one tact switch, as the artwork draws them.
 *
 * Deliberately not `SWITCH_ART.bodyWidth`: that value is the hit area, inset
 * inside the moulding on purpose. A crop must contain the whole housing or it
 * shears the part in half, so these are the measured outer bounds — the widest
 * and tallest found across the bank, so no member is clipped by a size taken
 * from its neighbour.
 */
export const SWITCH_BODY_25D = { width: 0.025789, height: 0.088291, top: 0.884522 } as const;
export const KEY_BODY_25D = { width: 0.054595, height: 0.075729, top: 0.898161 } as const;

/** Per-member parts for a bank, centred on the calibration this file owns. */
function bankParts(
  centres: readonly number[],
  body: { width: number; height: number; top: number },
): readonly ArtworkPart[] {
  return centres.map((cx) => ({
    x: cx - body.width / 2,
    y: body.top,
    width: body.width,
    height: body.height,
  }));
}

/**
 * What gains height, and how much.
 *
 * Heights are the real parts' heights in millimetres, so the hierarchy is the
 * board's own rather than an arranged one. The scene scales them; see
 * `de2Scene25D.ts`.
 *
 * What is NOT here is as considered as what is. The LED lenses stand about
 * 0.9 mm off the board: at this tilt that projects to under a pixel, so
 * lifting them would cost 27 clipped crops and 27 extruded faces to move
 * nothing, while risking a visible seam under every lens. They stay on the
 * board plane, drawn by the same overlay the 2D view uses. So do the
 * resistors, the small capacitors, the crystal cans, the voltage regulators,
 * the memory packages, the silkscreen and the traces. A part that cannot
 * separate from the artwork cleanly is better left in it.
 */
export const RAISED_PARTS_25D: readonly RaisedPartGroup[] = [
  {
    id: 'connectors',
    heightMm: 11,
    /** Tall hardware along the top edge. Several of these overhang the substrate, which is the reason the transparent master exists. */
    faceTop: '#5A6268',
    faceBottom: '#34393C',
    parts: [
      // DC IN
      {
        x: 0.048422, y: -0.040377, width: 0.124554, height: 0.170121,
        footX: 0.055556, footWidth: 0.111385,
        faceTop: '#666464', faceBottom: '#3C3B3A',
      },
      // USB device
      {
        x: 0.175446, y: 0.014177, width: 0.070233, height: 0.109825,
        footX: 0.180384, footWidth: 0.059808,
        faceTop: '#737270', faceBottom: '#434241',
      },
      // USB blaster
      {
        x: 0.247325, y: 0.028174, width: 0.066667, height: 0.100135,
        footX: 0.251440, footWidth: 0.057888,
        faceTop: '#767472', faceBottom: '#454442',
      },
      // MIC
      {
        x: 0.314815, y: -0.005922, width: 0.045816, height: 0.133513,
        footX: 0.318107, footWidth: 0.041975,
        faceTop: '#935267', faceBottom: '#56303C',
      },
      // LINE IN
      {
        x: 0.368587, y: 0.015971, width: 0.042250, height: 0.108031,
        footX: 0.370233, footWidth: 0.040329,
        faceTop: '#0A5E92', faceBottom: '#053755',
      },
      // LINE OUT
      {
        x: 0.422908, y: -0.005563, width: 0.043621, height: 0.130283,
        footX: 0.424280, footWidth: 0.041701,
        faceTop: '#73905B', faceBottom: '#435435',
      },
      // VIDEO IN
      {
        x: 0.473388, y: -0.018484, width: 0.053498, height: 0.120233,
        faceTop: '#6C6967', faceBottom: '#3F3D3C',
      },
      // VGA shield
      {
        x: 0.545267, y: -0.021714, width: 0.145405, height: 0.053477,
        faceTop: '#3A4D5C', faceBottom: '#222D36',
      },
      // VGA shell
      {
        x: 0.582030, y: 0.031763, width: 0.076818, height: 0.088650,
        faceTop: '#033055', faceBottom: '#011C31',
      },
      // ETHERNET
      {
        x: 0.700549, y: -0.015253, width: 0.082305, height: 0.148228,
        footX: 0.700549, footWidth: 0.079835,
        faceTop: '#767473', faceBottom: '#454443',
      },
      // RS-232
      {
        x: 0.787517, y: -0.028892, width: 0.153086, height: 0.142844,
        footX: 0.787517, footWidth: 0.148971,
        faceTop: '#4A4847', faceBottom: '#2B2A2A',
      },
      // USB host
      {
        x: 0.945542, y: 0.085240, width: 0.063923, height: 0.101570,
        footX: 0.955144, footWidth: 0.048834,
        faceTop: '#777675', faceBottom: '#464544',
      },
    ],
  },
  {
    id: 'gpio',
    heightMm: 8.4,
    /** Shrouded 2x20 headers and their socket strips. */
    faceTop: '#353332',
    faceBottom: '#1F1E1D',
    parts: [
      // GPIO 0
      {
        x: 0.842112, y: 0.176402, width: 0.054595, height: 0.413459,
        footX: 0.842661, footWidth: 0.053498,
        faceTop: '#262421', faceBottom: '#161513',
      },
      // GPIO 1
      {
        x: 0.931824, y: 0.197218, width: 0.057339, height: 0.392284,
        faceTop: '#222021', faceBottom: '#141313',
      },
      // socket strip 0
      {
        x: 0.817970, y: 0.229161, width: 0.017284, height: 0.345985,
        footX: 0.818793, footWidth: 0.016187,
        faceTop: '#4D4C4A', faceBottom: '#2D2C2B',
      },
      // socket strip 1
      {
        x: 0.911797, y: 0.229161, width: 0.015364, height: 0.345985,
        faceTop: '#413F3E', faceBottom: '#262524',
      },
    ],
  },
  {
    id: 'lcd',
    heightMm: 9.4,
    /** The 16 x 2 module as ONE assembly: frame, bezel, mounting ears and glass together, because that is how it is bolted to the board. */
    faceTop: '#3B4A3C',
    faceBottom: '#222B23',
    parts: [
      // LCD module
      {
        x: 0.056900, y: 0.488600, width: 0.349300, height: 0.167300,
        // Clamped to the crop: the segmentation that found this footprint
        // works in source pixels, and rounding put its left edge a quarter of
        // a thousandth outside the crop it belongs to. A face drawn wider than
        // the part it stands under is exactly what the footprint exists to
        // prevent, so the measurement is trimmed rather than trusted.
        footX: 0.056900, footWidth: 0.339671,
        faceTop: '#3B4A3C', faceBottom: '#222B23',
      },
    ],
  },
  {
    id: 'hex',
    heightMm: 7.2,
    /** Three housings, eight digits. HEX7-6, HEX5-4 and HEX3-0 share packages on the real DE2, and the artwork draws them that way. */
    faceTop: '#675654',
    faceBottom: '#3C3231',
    parts: [
      // HEX7-6
      {
        x: 0.027800, y: 0.734100, width: 0.089200, height: 0.079000,
        faceTop: '#655755', faceBottom: '#3B3331',
      },
      // HEX5-4
      {
        x: 0.136500, y: 0.733400, width: 0.092200, height: 0.079700,
        faceTop: '#655453', faceBottom: '#3B3130',
      },
      // HEX3-0
      {
        x: 0.286800, y: 0.734100, width: 0.149800, height: 0.078600,
        faceTop: '#6B5856', faceBottom: '#3F3332',
      },
    ],
  },
  {
    id: 'sdcard',
    heightMm: 3.0,
    /** Push-push SD socket. Its shell overhangs the right-hand edge. */
    faceTop: '#727170',
    faceBottom: '#434241',
    parts: [
      // SD CARD
      {
        x: 0.858299, y: 0.600269, width: 0.140466, height: 0.176223,
        footX: 0.859671, footWidth: 0.138272,
        faceTop: '#727170', faceBottom: '#434241',
      },
    ],
  },
  {
    id: 'fpga',
    heightMm: 2.6,
    /** Cyclone II EP2C35F672C6. A BGA sits low; this is the smallest lift in the scene that still reads as a package on a board. */
    faceTop: '#2E3031',
    faceBottom: '#1B1C1C',
    parts: [
      // Cyclone II
      {
        x: 0.608642, y: 0.440556, width: 0.147599, height: 0.185195,
        footX: 0.609191, footWidth: 0.145405,
        faceTop: '#2E3031', faceBottom: '#1B1C1C',
      },
    ],
  },
  {
    id: 'switches',
    heightMm: 4,
    /** SW17..SW0. The housing rises; the lever inside it is the live part. */
    faceTop: '#7B7876',
    faceBottom: '#484644',
    parts: bankParts(SWITCH_CX, SWITCH_BODY_25D),
  },
  {
    id: 'keys',
    heightMm: 3.6,
    /** KEY3..KEY0. Stainless bodies; the plunger is the live part. */
    faceTop: '#767371',
    faceBottom: '#454342',
    parts: bankParts(KEY_CX, KEY_BODY_25D),
  },
];

/** Lookup by id, so a renderer can ask for one group without scanning. */
export function raisedPart(id: string): RaisedPartGroup {
  const found = RAISED_PARTS_25D.find((p) => p.id === id);
  if (!found) throw new Error(`No raised 2.5D part group '${id}'`);
  return found;
}

/** Where a part meets the board: its footprint if it has one, else its crop. */
export function partFootprint(part: ArtworkPart): { x: number; width: number } {
  return {
    x: part.footX ?? part.x,
    width: part.footWidth ?? part.width,
  };
}
