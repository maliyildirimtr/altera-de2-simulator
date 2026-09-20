import { BOARD_MM } from './de2Layout';
import {
  ARTWORK_SILHOUETTE,
  PCB_BODY,
  RAISED_PARTS_25D,
  ax,
  ay,
} from './de2ArtworkLayout';

/**
 * The 2.5D scene: one projection, shared by everything the renderer draws.
 *
 * ── Why an SVG affine projection and not CSS 3D ───────────────────────────
 * CSS `perspective` / `rotateX` / `preserve-3d` is the obvious first choice
 * and it is the wrong one HERE, for a reason specific to this app rather than
 * to CSS.
 *
 * The board viewport already owns zoom: it applies `transform: scale()` to the
 * element that wraps the renderer, and the renderer fills that box with a
 * `viewBox`. CSS perspective is specified as a distance in SCREEN PIXELS from
 * the viewer to the z=0 plane, and it is not scaled by an ancestor transform
 * in the way the content is. So a scene built with `perspective(900px)` gets
 * progressively more or less distorted as the user zooms — the board would
 * change its apparent camera angle while being zoomed, which is exactly the
 * "fixed screen-pixel depth" failure to avoid. Pinning perspective to the
 * live zoom scale would mean recomputing it on every wheel event and handing
 * the compositor a new 3D context each frame.
 *
 * An affine projection inside the SVG has none of that. Depth is expressed in
 * board-space units, so it is carried by the same `viewBox` mapping as every
 * other coordinate and therefore scales with the board for free, through zoom,
 * fit and window resize. The property the brief asked for — "prefer scene-space
 * depth" — is structural here rather than maintained.
 *
 * What is given up is true perspective convergence. At the tilt this view uses
 * that is a rounding error: across a 203 mm board seen from a typical viewing
 * distance the far edge is a few percent narrower than the near one, and the
 * brief asks for "very small perspective distortion" anyway. Hit testing also
 * stays native — an SVG transform is honoured by the browser's pointer
 * testing, so the switches and keys need no inverse projection.
 *
 * ── The projection ───────────────────────────────────────────────────────
 * The board is rotated about its own horizontal axis by `tiltDeg`, seen from
 * slightly in front and very slightly to one side:
 *
 *     x' = x + h * shear
 *     y' = pivot + (y - pivot) * depth - h * lift
 *
 * `depth` = cos(tilt) foreshortens the board plane; `lift` = sin(tilt) is how
 * much of a component's height projects upward. Both come from the one angle,
 * so they cannot drift out of agreement with each other.
 *
 * At h = 0 the whole thing collapses to a vertical scale about the pivot,
 * which is why the approved 2D board can be placed on the board plane as-is:
 * the artwork and every live overlay go inside one `<g>` carrying that
 * transform, in their existing coordinates, and stay aligned by construction.
 */

/**
 * Apparent tilt from top-down.
 *
 * 14° sits in the middle of the shallow product-view band. Below about 8° the
 * front edge stops reading as an edge at all; above about 15° the board starts
 * to look like an isometric object rather than a board on a desk.
 */
export const SCENE_TILT_DEG = 14;

const TILT_RAD = (SCENE_TILT_DEG * Math.PI) / 180;

export const SCENE = {
  tiltDeg: SCENE_TILT_DEG,
  /** Vertical foreshortening of the board plane, cos(tilt). */
  depth: Math.cos(TILT_RAD),
  /** Upward projection of component height, sin(tilt). */
  lift: Math.sin(TILT_RAD),
  /**
   * Lateral slip per unit of height. Deliberately zero: this is a straight-on
   * tilt, not an oblique one.
   *
   * A small shear is tempting — it reveals a sliver of each part's side and
   * reads as a camera a few degrees off centre. It also uncovers a strip down
   * the full height of every raised part, and for the top connectors that
   * strip includes the portion standing ABOVE the board, where the artwork is
   * transparent. Hiding it there means masking every raised group with the
   * artwork's own alpha channel: eight more sampled copies of a 2560 px image,
   * to earn nine units of reveal. Without shear the only uncovered band is the
   * one below each part, which always lies over the board and is covered by
   * the part's own extruded face.
   *
   * Kept as a named term rather than dropped from the maths, so reintroducing
   * it is one edit — and so the reason it is zero has somewhere to live.
   */
  shear: 0,
} as const;

/**
 * Board-space units per millimetre, taken from the artwork's own substrate
 * width against the official 203 mm.
 *
 * The artwork's board is about 1% taller in proportion than 203 x 153 mm — it
 * is a render, not a mechanical drawing, and this module's neighbour documents
 * that drift. Height is a third axis with no artwork to measure against, so it
 * uses the width scale. A 1% disagreement on a quantity whose largest value
 * projects to about 90 units on a 2950-unit board is nine hundredths of a
 * unit, and is not the reason anything looks wrong.
 */
export const UNITS_PER_MM = ax(PCB_BODY.width) / BOARD_MM.width;

/**
 * How much the real heights are exaggerated.
 *
 * At true scale the PCB's own 1.6 mm projects to 7 units on a 2950-unit board
 * — a third of a pixel at normal zoom — and the FPGA to 10. The board would be
 * geometrically honest and visually flat, which is not a useful trade for a
 * view whose entire job is to show depth. So heights are exaggerated by a
 * single factor, applied to everything, which preserves the board's real
 * hierarchy while making it visible: the LCD is still 3.6x the FPGA.
 *
 * One number, so "make it shallower" is one edit and nothing can get out of
 * proportion with anything else.
 *
 * 1.5 was settled by rendering the scene and looking at it. At 1.8 the top
 * connectors showed a side about a quarter as deep as their own footprint,
 * which is the point where a row of ports starts to read as a row of blocks.
 */
export const DEPTH_SCALE = 1.5;

/** Height above the substrate, in millimetres, of each part the scene lifts. */
export const PART_HEIGHT_MM = {
  pcb: 1.6,
} as const;

/** Board-space height for a part, exaggeration included. */
export function heightUnits(millimetres: number): number {
  return millimetres * UNITS_PER_MM * DEPTH_SCALE;
}

/** Projected height of the PCB's own extruded edge, in board-space units. */
export const PCB_EDGE_UNITS = heightUnits(PART_HEIGHT_MM.pcb);

/**
 * The axis the board rotates about: its own centre line, so the board stays
 * where it is instead of sliding up the viewport as the tilt changes.
 */
export const SCENE_PIVOT_Y = ay(PCB_BODY.y + PCB_BODY.height / 2);

export interface ScenePoint {
  x: number;
  y: number;
}

/** Projects a board-space point at height `h` into scene space. */
export function project25d(x: number, y: number, h = 0): ScenePoint {
  return {
    x: x + h * SCENE.shear,
    y: SCENE_PIVOT_Y + (y - SCENE_PIVOT_Y) * SCENE.depth - h * SCENE.lift,
  };
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * The SVG transform for an entire plane at height `h`.
 *
 * This is the same mapping as `project25d`, expressed once for a whole group
 * rather than per point — which is what lets the 2D artwork and every live
 * overlay be reused verbatim. Nothing inside needs to know it is projected.
 */
export function planeTransform25d(h = 0): string {
  const tx = round(h * SCENE.shear);
  const ty = round(SCENE_PIVOT_Y * (1 - SCENE.depth) - h * SCENE.lift);
  return `translate(${tx} ${ty}) scale(1 ${round(SCENE.depth)})`;
}

/* ────────────────────────────────────────────────────────────────────────
 * Scene extent
 *
 * Derived from the geometry rather than dialled in by hand: the hardware
 * silhouette at board level, every raised group at its own height, and the
 * substrate's extruded edge below. Change a height and the frame follows it,
 * so a taller part can never quietly end up clipped.
 * ──────────────────────────────────────────────────────────────────────── */

/** Room for the board shadow, which spreads sideways as well as down. */
const SHADOW_MARGIN_X = 110;
const SHADOW_MARGIN_BOTTOM = 44;
const HEADROOM_TOP = 24;

function sceneBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs: number[] = [];
  const ys: number[] = [];

  const add = (x: number, y: number, h: number): void => {
    const p = project25d(x, y, h);
    xs.push(p.x);
    ys.push(p.y);
  };

  // The whole assembly, on the board plane.
  const s = ARTWORK_SILHOUETTE;
  add(ax(s.x), ay(s.y), 0);
  add(ax(s.x + s.width), ay(s.y + s.height), 0);

  // The substrate's extruded edge, below the plane.
  add(ax(PCB_BODY.x), ay(PCB_BODY.y), -PCB_EDGE_UNITS);
  add(ax(PCB_BODY.x + PCB_BODY.width), ay(PCB_BODY.y + PCB_BODY.height), -PCB_EDGE_UNITS);

  // Every raised group, at its own height.
  for (const group of RAISED_PARTS_25D) {
    const h = heightUnits(group.heightMm);
    for (const part of group.parts) {
      add(ax(part.x), ay(part.y), h);
      add(ax(part.x + part.width), ay(part.y + part.height), h);
    }
  }

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

const BOUNDS = sceneBounds();

export const SCENE_VIEWBOX = {
  x: Math.floor(BOUNDS.minX - SHADOW_MARGIN_X),
  y: Math.floor(BOUNDS.minY - HEADROOM_TOP),
  width: Math.ceil(BOUNDS.maxX - BOUNDS.minX + 2 * SHADOW_MARGIN_X),
  height: Math.ceil(BOUNDS.maxY - BOUNDS.minY + HEADROOM_TOP + SHADOW_MARGIN_BOTTOM),
} as const;

export const SCENE_VIEWBOX_ATTR =
  `${SCENE_VIEWBOX.x} ${SCENE_VIEWBOX.y} ${SCENE_VIEWBOX.width} ${SCENE_VIEWBOX.height}`;

export const SCENE_ASPECT = SCENE_VIEWBOX.width / SCENE_VIEWBOX.height;
