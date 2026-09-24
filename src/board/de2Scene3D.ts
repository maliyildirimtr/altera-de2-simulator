import { BOARD_MM, BOARD_RENDER_WIDTH } from './de2Layout';
import {
  ARTWORK_PLANE,
  ARTWORK_SILHOUETTE,
  DE2_ARTWORK,
  PCB_BODY,
  RAISED_PARTS,
  ax,
  ay,
} from './de2ArtworkLayout';

/**
 * The 2.5D camera: a real perspective projection, done by the browser.
 *
 * ── What this module is, and is not ──────────────────────────────────────
 * The projection is NOT computed here. It is a CSS 3D transform, so the
 * compositor does it, which is the whole point: component height is a genuine
 * `translateZ` and the browser resolves depth, foreshortening, parallax,
 * occlusion and pointer hit testing from it. This module owns the camera's
 * numbers, converts real millimetres into scene units, and reproduces the
 * projection in TypeScript for two jobs only — sizing the scene so nothing is
 * clipped, and letting tests assert the geometry without reading pixels.
 *
 * ── Why CSS 3D works here, having previously been rejected ───────────────
 * An earlier renderer avoided CSS 3D on the grounds that `perspective` is a
 * distance in screen pixels, so an ancestor's zoom would change the apparent
 * camera angle. That reasoning was wrong for this app's hierarchy, and the
 * difference is where the zoom lives.
 *
 * `BoardViewport` applies its zoom to `de2-board-transform`, an ANCESTOR of
 * the board. A `perspective` element projects its 3D children into its own
 * local coordinate space and flattens the result; an ancestor's 2D `scale`
 * then magnifies that already-flattened picture. So the projection is computed
 * in scene units, once, and zoom cannot reach it. Measured in Chrome on this
 * renderer at 0.6x, 1.0x and 1.5x, every zoom-normalised box is identical to
 * three decimals — the board surface at 999.773 x 740.079, the substrate slab
 * at 940.729 x 666.868, the near edge 13.418 deep, the LCD module, the FPGA,
 * SW17, a standoff barrel and the ground plane. The one rule that keeps it
 * that way: the scene-to-box fit scale must sit OUTSIDE the perspective
 * element, never on or inside it.
 *
 * ── Scene units, and why they are not artwork units ──────────────────────
 * One scene unit is `SCENE_SCALE` of an artwork viewBox unit. The indirection
 * exists for a hard reason, not tidiness.
 *
 * Every element in a `preserve-3d` subtree is rasterised into its own texture,
 * at DEVICE pixels. A layer sized in artwork units is 4096 CSS px wide; on a
 * Retina display that is 8192 device px, which is exactly the texture cap most
 * GPUs and Skia enforce. At that size the compositor stops drawing: the board
 * surface disappears, the substrate paints only a band across the top, and the
 * small component crops — being small — survive. The result looks like a
 * blue slab with parts floating around it.
 *
 * That is not hypothetical. It was reproduced by rendering this scene at
 * `--force-device-scale-factor=2`, which turned a correct board into exactly
 * that picture, and it is why the scale exists. At 0.45 the largest layer is
 * about 1950 CSS px, so roughly 3900 device px on a 2x display and 5900 on a
 * 3x one — comfortably inside the cap on both.
 *
 * Scaling the scene does NOT change the projection: the perspective distance
 * is derived from the stage width, so shrinking both leaves the camera's
 * geometry identical. It is a change of units, nothing more. Artwork
 * coordinates remain the single calibration — `sx`/`sy` convert them, SVG
 * viewBoxes still carry the unscaled values, and no second map exists.
 */

/**
 * Scene units per artwork unit.
 *
 * Chosen so the widest layer stays well under the compositor's texture cap at
 * 2x and 3x device pixel ratios. See the note above; this is the one number
 * standing between a correct board and a blue slab.
 */
export const SCENE_SCALE = 0.45;

/** Normalised artwork coordinate to scene px. */
export const sx = (fraction: number): number => ax(fraction) * SCENE_SCALE;
export const sy = (fraction: number): number => ay(fraction) * SCENE_SCALE;

/** Artwork viewBox units to scene px, for values already in artwork space. */
export const su = (artworkUnits: number): number => artworkUnits * SCENE_SCALE;

/** Stage extent, in scene px. */
export const STAGE = {
  width: DE2_ARTWORK.width * SCENE_SCALE,
  height: DE2_ARTWORK.height * SCENE_SCALE,
} as const;

/** Where the transparent artwork sits on the stage, in scene px. */
export const ARTWORK_BOX = {
  x: su(ARTWORK_PLANE.x),
  y: su(ARTWORK_PLANE.y),
  width: su(ARTWORK_PLANE.width),
  height: su(ARTWORK_PLANE.height),
} as const;

/**
 * The point the board rotates about and the camera looks at: the board's
 * centre, so tilting does not slide the board up the viewport.
 */
export const PIVOT = { x: STAGE.width / 2, y: STAGE.height / 2 } as const;

/**
 * Camera.
 *
 * `rotateX` 18 degrees. A near-frontal board with a mild tilt: enough that the
 * near edge is plainly nearer, the top row of connectors plainly stands up and
 * the far edge plainly recedes, while the full board face stays readable —
 * which is what this view is for. Steeper angles look more dramatic and make
 * the switch row harder to read.
 *
 * `rotateY` -3 degrees: almost nothing, and it earns its place — it turns the
 * board's right-hand edge toward the camera, so the substrate reads as a solid
 * with two visible sides instead of a plane with a lip, and it keeps the four
 * standoffs from being identical silhouettes.
 *
 * `perspective` 2.6x the board width. Small enough for real foreshortening —
 * the near edge of the PCB projects about 10% wider than the far edge — and
 * large enough that the board is not a wide-angle caricature.
 */
export const CAMERA = {
  rotateXDeg: 18,
  rotateYDeg: -3,
  /** Multiples of the board width. */
  perspectiveRatio: 2.6,
} as const;

export const PERSPECTIVE = CAMERA.perspectiveRatio * STAGE.width;

/** Scene px per millimetre, from the measured substrate against 203 mm. */
export const UNITS_PER_MM = sx(PCB_BODY.width) / BOARD_MM.width;

/**
 * How much component heights are amplified above life size.
 *
 * True scale is geometrically honest and visually short. A product render of a
 * board is not lying when its parts read as solid — it has stereo, motion,
 * material response and a real lens, and a single still projection of the same
 * geometry has none of those to carry the volume. 1.4 buys back roughly what
 * the flat medium costs, without touching the proportions BETWEEN parts.
 *
 * It applies to components only. The substrate's thickness and the standoffs
 * are the board's own geometry and are specified directly, so parts can be
 * made legible without the board becoming a plank on stilts.
 */
export const DEPTH_GAIN = 1.4;

/** Height of a component above the board, in scene px. */
export function zUnits(millimetres: number): number {
  return millimetres * UNITS_PER_MM * DEPTH_GAIN;
}

/**
 * Substrate thickness, in scene px.
 *
 * Well above the real 1.6 mm, and deliberately. A vertical face under this
 * camera is foreshortened to `sin(rotateX)` of its height — about 31% at 18deg,
 * and then the fit scale takes another 41% off. So a truthfully thin substrate
 * projects to two or three device pixels at the default zoom: a hairline the
 * eye reads as an artifact of the artwork rather than as fibreglass. This is
 * the one place the scene exaggerates a real dimension on purpose, because the
 * near edge is the strongest single cue that the board is an object.
 *
 * 4.2% of board height is about 6 mm apparent, which projects to roughly ten
 * device pixels at 1x — enough to read as an edge at any zoom.
 */
export const PCB_THICKNESS = 0.042 * STAGE.height;

/**
 * How far the board stands off the surface it rests on.
 *
 * The DE2 ships with four corner standoffs, and they are the reason the board
 * reads as an object placed on a desk rather than a picture pasted onto one.
 * The real part is about 8 mm; 13 gives the shadow room to separate from the
 * board and makes the barrels legible, which is the point of drawing them.
 */
export const STANDOFF_HEIGHT_MM = 13;
/**
 * The drop takes DEPTH_GAIN, exactly like every other height in the scene.
 *
 * It has to: the standoffs are the only thing holding the board off the
 * surface, so if they are measured on a different depth scale than the parts
 * standing on top of the board, the board's height above the desk contradicts
 * the height of everything on it.
 */
export const STANDOFF_DROP = zUnits(STANDOFF_HEIGHT_MM);

/**
 * How far the surface extends past the board, as a fraction of board width.
 *
 * Enough to read as a surface the board sits on, not so much that the board
 * becomes a small object in a large empty room. It fades out rather than
 * ending at an edge — see `GroundPlane3D`.
 */
export const GROUND_MARGIN = 0.15;

export interface Projected {
  /** Offset from the pivot, in scene px. */
  x: number;
  y: number;
  /** Perspective magnification at this depth. 1 at the pivot's plane. */
  scale: number;
}

const RX = (CAMERA.rotateXDeg * Math.PI) / 180;
const RY = (CAMERA.rotateYDeg * Math.PI) / 180;

/**
 * Reproduces what the compositor does, for sizing and for tests.
 *
 * Matches CSS ordering: `rotateX(a) rotateY(b)` composes as Rx * Ry, so a
 * point is rotated about Y first, then about X, then divided through by the
 * perspective. Takes SCENE px. Kept deliberately literal rather than folded
 * into constants — if it ever disagrees with the browser, this is what to read.
 */
export function project3d(x: number, y: number, z = 0): Projected {
  const px = x - PIVOT.x;
  const py = y - PIVOT.y;

  const x1 = px * Math.cos(RY) + z * Math.sin(RY);
  const z1 = -px * Math.sin(RY) + z * Math.cos(RY);

  const y2 = py * Math.cos(RX) - z1 * Math.sin(RX);
  const z2 = py * Math.sin(RX) + z1 * Math.cos(RX);

  const scale = PERSPECTIVE / (PERSPECTIVE - z2);
  return { x: x1 * scale, y: y2 * scale, scale };
}

/* ────────────────────────────────────────────────────────────────────────
 * Scene extent
 *
 * Derived from the geometry, not dialled in: every corner of the hardware
 * silhouette, of the substrate slab top and bottom, of the surface below, and
 * of every raised part at its own height, run through the projection above. A
 * perspective projection maps a rectangle to a quad, so corners suffice.
 *
 * Change a height or the camera and the frame follows, which is what stops a
 * taller part from quietly ending up clipped.
 * ──────────────────────────────────────────────────────────────────────── */

/** A little air around the surface, so its fade is not cut off by the frame. */
const SCENE_MARGIN = 26;

function sceneExtent(): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs: number[] = [];
  const ys: number[] = [];

  const corners = (nx: number, ny: number, nw: number, nh: number, z: number): void => {
    for (const cx of [sx(nx), sx(nx + nw)]) {
      for (const cy of [sy(ny), sy(ny + nh)]) {
        const p = project3d(cx, cy, z);
        xs.push(p.x);
        ys.push(p.y);
      }
    }
  };

  const s = ARTWORK_SILHOUETTE;
  corners(s.x, s.y, s.width, s.height, 0);
  corners(PCB_BODY.x, PCB_BODY.y, PCB_BODY.width, PCB_BODY.height, 0);
  corners(PCB_BODY.x, PCB_BODY.y, PCB_BODY.width, PCB_BODY.height, -PCB_THICKNESS);
  for (const part of RAISED_PARTS) {
    corners(part.x, part.y, part.width, part.height, zUnits(part.heightMm));
  }

  // The surface, at the foot of the standoffs: the widest and lowest thing.
  const gy = (GROUND_MARGIN * STAGE.width) / STAGE.height;
  corners(
    PCB_BODY.x - GROUND_MARGIN,
    PCB_BODY.y - gy,
    PCB_BODY.width + 2 * GROUND_MARGIN,
    PCB_BODY.height + 2 * gy,
    -PCB_THICKNESS - STANDOFF_DROP,
  );

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

const EXTENT = sceneExtent();

/**
 * The perspective container's box, and where the stage sits inside it.
 *
 * `originX/originY` is the pivot's position in scene space. It is both the
 * container's `perspective-origin` and, in stage coordinates, the stage's
 * `transform-origin` — the two must name the same physical point, or the
 * camera looks at somewhere the board is not rotating about.
 */
export const SCENE = {
  width: Math.ceil(EXTENT.maxX - EXTENT.minX + 2 * SCENE_MARGIN),
  height: Math.ceil(EXTENT.maxY - EXTENT.minY + 2 * SCENE_MARGIN),
  stageLeft: Math.round(SCENE_MARGIN - PIVOT.x - EXTENT.minX),
  stageTop: Math.round(SCENE_MARGIN - PIVOT.y - EXTENT.minY),
  originX: Math.round(SCENE_MARGIN - EXTENT.minX),
  originY: Math.round(SCENE_MARGIN - EXTENT.minY),
} as const;

export const SCENE_ASPECT = SCENE.width / SCENE.height;

/**
 * Scene px to render-box px.
 *
 * A CONSTANT, and that matters more than its value: it is applied outside the
 * perspective container, so it never reaches the camera. The viewport's zoom
 * multiplies it from further out again.
 */
export const SCENE_FIT = BOARD_RENDER_WIDTH / SCENE.width;

/**
 * The widest layer the scene asks the compositor to rasterise, in scene px.
 *
 * Exported so a test can hold the line that produced this module's scale: the
 * board surface must stay inside the texture cap at a 2x device pixel ratio,
 * because past it the compositor silently stops drawing.
 */
export const WIDEST_LAYER = Math.max(
  ARTWORK_BOX.width,
  sx(PCB_BODY.width + 2 * GROUND_MARGIN),
);

/** The tallest layer, on the same terms. The ground is the tall one. */
export const TALLEST_LAYER = Math.max(
  ARTWORK_BOX.height,
  sy(PCB_BODY.height) + 2 * GROUND_MARGIN * STAGE.width,
);
