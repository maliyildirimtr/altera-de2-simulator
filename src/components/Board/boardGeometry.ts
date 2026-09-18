/**
 * Geometry helpers shared by the DE2 2D and 2.5D renderers.
 *
 * Nothing here touches simulation state — these are pure functions over the
 * canonical layout in `src/board/de2Layout.ts`. Keeping segment shapes and the
 * 2.5D projection in one place is what lets the two renderers stay visually
 * consistent without duplicating board logic.
 */

import { BOARD_MM, BOARD_RENDER_WIDTH } from '../../board/de2Layout';

/* ────────────────────────────────────────────────────────────────────────
 * Seven-segment geometry (shared by both renderers)
 * ──────────────────────────────────────────────────────────────────────── */

export interface SegmentShape {
  /** Segment index: 0=A 1=B 2=C 3=D 4=E 5=F 6=G. */
  index: number;
  /** SVG polygon point list. */
  points: string;
}

function horizontalSegment(cx: number, cy: number, length: number, t: number): string {
  const h = length / 2;
  const q = t / 2;
  return [
    `${cx - h},${cy}`,
    `${cx - h + q},${cy - q}`,
    `${cx + h - q},${cy - q}`,
    `${cx + h},${cy}`,
    `${cx + h - q},${cy + q}`,
    `${cx - h + q},${cy + q}`,
  ].join(' ');
}

function verticalSegment(cx: number, cy: number, length: number, t: number): string {
  const h = length / 2;
  const q = t / 2;
  return [
    `${cx},${cy - h}`,
    `${cx + q},${cy - h + q}`,
    `${cx + q},${cy + h - q}`,
    `${cx},${cy + h}`,
    `${cx - q},${cy + h - q}`,
    `${cx - q},${cy - h + q}`,
  ].join(' ');
}

/**
 * Builds the seven segment polygons for a digit of the given glass size.
 * Returned in simulator order (A, B, C, D, E, F, G), which matches
 * `boardStore.hex[index][segment]`.
 */
export function sevenSegmentShapes(width: number, height: number): SegmentShape[] {
  const t = Math.min(width, height) * 0.155;
  const pad = t * 0.55;
  const hLen = width - t - pad * 2;
  const vLen = (height - t * 1.5 - pad * 2) / 2;

  const left = t / 2 + pad;
  const right = width - t / 2 - pad;
  const midX = width / 2;
  const top = t / 2 + pad;
  const midY = height / 2;
  const bottom = height - t / 2 - pad;
  const upperCy = (top + midY) / 2;
  const lowerCy = (midY + bottom) / 2;

  return [
    { index: 0, points: horizontalSegment(midX, top, hLen, t) },
    { index: 1, points: verticalSegment(right, upperCy, vLen, t) },
    { index: 2, points: verticalSegment(right, lowerCy, vLen, t) },
    { index: 3, points: horizontalSegment(midX, bottom, hLen, t) },
    { index: 4, points: verticalSegment(left, lowerCy, vLen, t) },
    { index: 5, points: verticalSegment(left, upperCy, vLen, t) },
    { index: 6, points: horizontalSegment(midX, midY, hLen, t) },
  ];
}

/** Italic slant of a real seven-segment package, in degrees. */
export const SEGMENT_SLANT_DEG = 6;

/* ────────────────────────────────────────────────────────────────────────
 * 2.5D projection
 *
 * An oblique projection: depth foreshortens vertically, package height lifts
 * upward and shears slightly to the right so left-hand side faces stay
 * visible. There is no camera, no perspective divide and no Three.js — this is
 * a handful of multiplications per point.
 * ──────────────────────────────────────────────────────────────────────── */

export const ISO = {
  /** Vertical foreshortening applied to board depth. */
  tilt: 0.74,
  /** Screen units of lift per millimetre of package height. */
  lift: 0.95,
  /** Horizontal shear per millimetre of height — exposes left side faces. */
  shear: 0.3,
} as const;

export const BOARD_CY = BOARD_MM.height / 2;

export interface ProjectedPoint {
  x: number;
  y: number;
}

/**
 * Projects a board point into 2.5D screen space.
 *
 * This is a cabinet-style oblique projection, deliberately AFFINE: depth
 * foreshortens vertically and height lifts and shears. Because it is affine,
 * any flat drawing authored in board millimetres can be placed onto any face
 * with a single SVG transform (see `faceTransform`) — which is what lets the
 * 2.5D renderer reuse the 2D package artwork instead of redrawing it.
 *
 * @param x board x, millimetres
 * @param y board y, millimetres
 * @param h height above the PCB surface, millimetres (negative for the
 *          substrate underside)
 */
export function project(x: number, y: number, h = 0): ProjectedPoint {
  return {
    x: x + h * ISO.shear,
    y: BOARD_CY + (y - BOARD_CY) * ISO.tilt - h * ISO.lift,
  };
}

/**
 * SVG transform that maps flat board-millimetre drawings onto the horizontal
 * plane at height `h`. Composing this with the 2D artwork is exactly
 * equivalent to running every point through `project(x, y, h)`.
 */
export function faceTransform(h = 0): string {
  const tx = round(h * ISO.shear);
  const ty = round(BOARD_CY * (1 - ISO.tilt) - h * ISO.lift);
  return `translate(${tx} ${ty}) scale(1 ${ISO.tilt})`;
}

/** The board's own top surface. */
export const FLAT_TRANSFORM = faceTransform(0);

/** Projects a point and formats it for an SVG `points` attribute. */
export function projectPoint(x: number, y: number, h = 0): string {
  const p = project(x, y, h);
  return `${round(p.x)},${round(p.y)}`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function polygon(points: ProjectedPoint[]): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
}

export interface ExtrudedBox {
  /** Upper surface of the package. */
  top: string;
  /** Face pointing toward the viewer (the +y edge). */
  front: string;
  /** Left-hand face, exposed by the shear. */
  side: string;
}

/**
 * Projects an axis-aligned footprint extruded to `height` millimetres.
 * Draw `side` and `front` first, then `top`.
 */
export function extrudeBox(
  x: number,
  y: number,
  w: number,
  h: number,
  height: number,
  baseHeight = 0,
): ExtrudedBox {
  const x1 = x + w;
  const y1 = y + h;
  const hi = baseHeight + height;

  return {
    top: polygon([
      project(x, y, hi),
      project(x1, y, hi),
      project(x1, y1, hi),
      project(x, y1, hi),
    ]),
    front: polygon([
      project(x, y1, baseHeight),
      project(x1, y1, baseHeight),
      project(x1, y1, hi),
      project(x, y1, hi),
    ]),
    side: polygon([
      project(x, y, baseHeight),
      project(x, y1, baseHeight),
      project(x, y1, hi),
      project(x, y, hi),
    ]),
  };
}

/**
 * Projected outline of the whole PCB at a given height, as an SVG path.
 * Used for the board surface, the substrate underside and the drop shadow.
 */
export function boardOutlinePath(height = 0): string {
  const w = BOARD_MM.width;
  const h = BOARD_MM.height;
  const pts = [
    project(0, 0, height),
    project(w, 0, height),
    project(w, h, height),
    project(0, h, height),
  ];
  return `M ${pts.map((p) => `${round(p.x)} ${round(p.y)}`).join(' L ')} Z`;
}

/** viewBox covering the fully projected board plus package height and shadow. */
export const ISO_VIEWBOX = { x: -9, y: 4, width: 222, height: 140 } as const;

export const ISO_VIEWBOX_ATTR = `${ISO_VIEWBOX.x} ${ISO_VIEWBOX.y} ${ISO_VIEWBOX.width} ${ISO_VIEWBOX.height}`;

/**
 * DOM box for the 2.5D renderer. It shares the 2D width so switching modes
 * does not change the horizontal fit, but is shorter because the projected
 * board is wide and flat.
 */
export const ISO_RENDER_WIDTH = BOARD_RENDER_WIDTH;
export const ISO_RENDER_HEIGHT = Math.round(
  (BOARD_RENDER_WIDTH * ISO_VIEWBOX.height) / ISO_VIEWBOX.width,
);

/* ────────────────────────────────────────────────────────────────────────
 * Shared helpers
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * A board-plane circle projected to 2.5D: it becomes an ellipse foreshortened
 * by the tilt. Used for push-button caps and round jacks.
 */
export function projectedEllipse(
  cx: number,
  cy: number,
  r: number,
  h = 0,
): { cx: number; cy: number; rx: number; ry: number } {
  const p = project(cx, cy, h);
  return { cx: round(p.x), cy: round(p.y), rx: round(r), ry: round(r * ISO.tilt) };
}

/**
 * Side wall of an extruded cylinder, from `baseHeight` to `baseHeight+height`.
 * Drawn behind the top ellipse.
 */
export function cylinderSkirt(
  cx: number,
  cy: number,
  r: number,
  height: number,
  baseHeight = 0,
): string {
  const bottom = projectedEllipse(cx, cy, r, baseHeight);
  const top = projectedEllipse(cx, cy, r, baseHeight + height);
  return [
    `M ${bottom.cx - bottom.rx} ${bottom.cy}`,
    `A ${bottom.rx} ${bottom.ry} 0 0 0 ${bottom.cx + bottom.rx} ${bottom.cy}`,
    `L ${top.cx + top.rx} ${top.cy}`,
    `A ${top.rx} ${top.ry} 0 0 1 ${top.cx - top.rx} ${top.cy}`,
    'Z',
  ].join(' ');
}

/** Evenly spaced pin positions along a run, for headers and connectors. */
export function pinPositions(start: number, end: number, count: number): number[] {
  if (count <= 1) return [(start + end) / 2];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => +(start + i * step).toFixed(3));
}
