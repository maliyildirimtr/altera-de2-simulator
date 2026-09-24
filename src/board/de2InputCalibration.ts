import type {
  ArtworkPoint,
  InputOverlayCalibration,
  NormalizedArtworkPoint,
  QuadCorners,
} from './de2ReferenceAssets';

export interface ResolvedInputOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  centre: ArtworkPoint;
  corners: readonly [ArtworkPoint, ArtworkPoint, ArtworkPoint, ArtworkPoint];
}

export interface ProjectiveTransform {
  /** Numerators and denominator for x' = (a*x + b*y + c) / (g*x + h*y + 1). */
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
}

export interface ProjectiveWarpFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  matrix: string;
}

export const CALIBRATION_MIN_SIZE = 0.001;

const denormalise = (
  point: NormalizedArtworkPoint,
  imageWidth: number,
  imageHeight: number,
): ArtworkPoint => ({ x: point.x * imageWidth, y: point.y * imageHeight });

export function rectCorners(
  calibration: Pick<InputOverlayCalibration, 'x' | 'y' | 'width' | 'height'>,
): QuadCorners {
  const { x, y, width, height } = calibration;
  return {
    topLeft: { x, y },
    topRight: { x: x + width, y },
    bottomRight: { x: x + width, y: y + height },
    bottomLeft: { x, y: y + height },
  };
}

export function calibrationCorners(calibration: InputOverlayCalibration): QuadCorners {
  return calibration.shape === 'quad' && calibration.corners
    ? calibration.corners
    : rectCorners(calibration);
}

/** SVG transform shared by the live overlay and the calibration editor. */
export function calibrationTransform(
  calibration: InputOverlayCalibration,
  imageWidth: number,
  imageHeight: number,
): string {
  const cx = (calibration.x + calibration.width / 2) * imageWidth;
  const cy = (calibration.y + calibration.height / 2) * imageHeight;
  return [
    `translate(${cx} ${cy})`,
    `rotate(${calibration.rotate})`,
    `skewX(${calibration.skewX})`,
    `skewY(${calibration.skewY})`,
    `scale(${calibration.scaleX} ${calibration.scaleY})`,
    `translate(${-cx} ${-cy})`,
  ].join(' ');
}

/**
 * Mirrors the SVG transform order: scale, skewY, skewX and finally rotate,
 * all around the calibrated box centre.
 */
function transformPoint(
  point: ArtworkPoint,
  calibration: InputOverlayCalibration,
  imageWidth: number,
  imageHeight: number,
): ArtworkPoint {
  const cx = (calibration.x + calibration.width / 2) * imageWidth;
  const cy = (calibration.y + calibration.height / 2) * imageHeight;
  let x = point.x - cx;
  let y = point.y - cy;

  x *= calibration.scaleX;
  y *= calibration.scaleY;

  y += Math.tan((calibration.skewY * Math.PI) / 180) * x;
  x += Math.tan((calibration.skewX * Math.PI) / 180) * y;

  const angle = (calibration.rotate * Math.PI) / 180;
  const rotatedX = x * Math.cos(angle) - y * Math.sin(angle);
  const rotatedY = x * Math.sin(angle) + y * Math.cos(angle);
  return { x: rotatedX + cx, y: rotatedY + cy };
}

export function resolveInputOverlay(
  calibration: InputOverlayCalibration,
  imageWidth: number,
  imageHeight: number,
): ResolvedInputOverlay {
  const x = calibration.x * imageWidth;
  const y = calibration.y * imageHeight;
  const width = calibration.width * imageWidth;
  const height = calibration.height * imageHeight;
  const sourceCorners = calibrationCorners(calibration);
  const transformed = [
    sourceCorners.topLeft,
    sourceCorners.topRight,
    sourceCorners.bottomRight,
    sourceCorners.bottomLeft,
  ].map((point) =>
    transformPoint(denormalise(point, imageWidth, imageHeight), calibration, imageWidth, imageHeight),
  ) as [ArtworkPoint, ArtworkPoint, ArtworkPoint, ArtworkPoint];

  return {
    x,
    y,
    width,
    height,
    centre: { x: x + width / 2, y: y + height / 2 },
    corners: transformed,
  };
}

export function polygonPoints(points: readonly ArtworkPoint[]): string {
  return points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

/**
 * Exact homography from a source rectangle to TL/TR/BR/BL destination points.
 * The returned coefficients operate on source pixels, not normalised units.
 */
export function projectiveTransformForQuad(
  sourceWidth: number,
  sourceHeight: number,
  corners: readonly [ArtworkPoint, ArtworkPoint, ArtworkPoint, ArtworkPoint],
): ProjectiveTransform {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const dx1 = topRight.x - bottomRight.x;
  const dx2 = bottomLeft.x - bottomRight.x;
  const dx3 = topLeft.x - topRight.x + bottomRight.x - bottomLeft.x;
  const dy1 = topRight.y - bottomRight.y;
  const dy2 = bottomLeft.y - bottomRight.y;
  const dy3 = topLeft.y - topRight.y + bottomRight.y - bottomLeft.y;
  const denominator = dx1 * dy2 - dx2 * dy1;

  let perspectiveX = 0;
  let perspectiveY = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    if (Math.abs(denominator) < 1e-9) {
      throw new Error('Cannot project a rectangle onto a degenerate quadrilateral');
    }
    perspectiveX = (dx3 * dy2 - dx2 * dy3) / denominator;
    perspectiveY = (dx1 * dy3 - dx3 * dy1) / denominator;
  }

  return {
    a: (topRight.x - topLeft.x + perspectiveX * topRight.x) / sourceWidth,
    b: (bottomLeft.x - topLeft.x + perspectiveY * bottomLeft.x) / sourceHeight,
    c: topLeft.x,
    d: (topRight.y - topLeft.y + perspectiveX * topRight.y) / sourceWidth,
    e: (bottomLeft.y - topLeft.y + perspectiveY * bottomLeft.y) / sourceHeight,
    f: topLeft.y,
    g: perspectiveX / sourceWidth,
    h: perspectiveY / sourceHeight,
  };
}

export function applyProjectiveTransform(
  transform: ProjectiveTransform,
  point: ArtworkPoint,
): ArtworkPoint {
  const denominator = transform.g * point.x + transform.h * point.y + 1;
  return {
    x: (transform.a * point.x + transform.b * point.y + transform.c) / denominator,
    y: (transform.d * point.x + transform.e * point.y + transform.f) / denominator,
  };
}

/**
 * CSS uses column-major matrix3d arguments. Perspective terms live in m14 and
 * m24, making the browser divide x/y by the same homography denominator.
 */
export function projectiveCssMatrix3d(transform: ProjectiveTransform): string {
  const values = [
    transform.a, transform.d, 0, transform.g,
    transform.b, transform.e, 0, transform.h,
    0, 0, 1, 0,
    transform.c, transform.f, 0, 1,
  ];
  return `matrix3d(${values.map((value) => Number(value.toFixed(12))).join(',')})`;
}

/**
 * Local foreignObject frame plus the CSS homography used by every 100 x 100
 * 2.5D live surface (inputs, HEX digits and LCD glass).
 */
export function projectiveWarpFrame(
  corners: readonly [ArtworkPoint, ArtworkPoint, ArtworkPoint, ArtworkPoint],
): ProjectiveWarpFrame {
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const x = Math.min(...xs) - 2;
  const y = Math.min(...ys) - 2;
  const localCorners = corners.map((point) => ({ x: point.x - x, y: point.y - y })) as [
    ArtworkPoint,
    ArtworkPoint,
    ArtworkPoint,
    ArtworkPoint,
  ];
  return {
    x,
    y,
    width: Math.max(...xs) - x + 2,
    height: Math.max(...ys) - y + 2,
    matrix: projectiveCssMatrix3d(projectiveTransformForQuad(100, 100, localCorners)),
  };
}

/** Boundary-inclusive ray-cast used by tests and calibration diagnostics. */
export function pointInPolygon(point: ArtworkPoint, polygon: readonly ArtworkPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j];
    const b = polygon[i];
    const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
    const onSegment =
      Math.abs(cross) < 1e-7 &&
      point.x >= Math.min(a.x, b.x) &&
      point.x <= Math.max(a.x, b.x) &&
      point.y >= Math.min(a.y, b.y) &&
      point.y <= Math.max(a.y, b.y);
    if (onSegment) return true;

    const crosses =
      b.y > point.y !== a.y > point.y &&
      point.x < ((a.x - b.x) * (point.y - b.y)) / (a.y - b.y) + b.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function hitTestInputOverlay(
  calibration: InputOverlayCalibration,
  point: ArtworkPoint,
  imageWidth: number,
  imageHeight: number,
): boolean {
  return pointInPolygon(point, resolveInputOverlay(calibration, imageWidth, imageHeight).corners);
}

export function withRectShape(calibration: InputOverlayCalibration): InputOverlayCalibration {
  return { ...calibration, shape: 'rect', corners: undefined };
}

export function withQuadShape(calibration: InputOverlayCalibration): InputOverlayCalibration {
  return { ...calibration, shape: 'quad', corners: calibrationCorners(calibration) };
}

export function moveCalibration(
  calibration: InputOverlayCalibration,
  dx: number,
  dy: number,
): InputOverlayCalibration {
  const corners = calibration.corners
    ? {
        topLeft: { x: calibration.corners.topLeft.x + dx, y: calibration.corners.topLeft.y + dy },
        topRight: { x: calibration.corners.topRight.x + dx, y: calibration.corners.topRight.y + dy },
        bottomRight: {
          x: calibration.corners.bottomRight.x + dx,
          y: calibration.corners.bottomRight.y + dy,
        },
        bottomLeft: {
          x: calibration.corners.bottomLeft.x + dx,
          y: calibration.corners.bottomLeft.y + dy,
        },
      }
    : undefined;
  return { ...calibration, x: calibration.x + dx, y: calibration.y + dy, corners };
}
