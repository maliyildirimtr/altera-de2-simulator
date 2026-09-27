/**
 * Runtime assets supplied by the user and the per-image overlay calibration.
 *
 * The two PNGs are deliberately separate sources. The 2.5D image already
 * contains its camera angle and physical depth, so it must not be projected or
 * rebuilt with CSS transforms. Live simulator state is drawn in the image's
 * native pixel coordinate system.
 */

export interface ArtworkPoint {
  x: number;
  y: number;
}

export type InputOverlayShape = 'rect' | 'quad';

export interface NormalizedArtworkPoint {
  /** Fraction of the source image width. */
  x: number;
  /** Fraction of the source image height. */
  y: number;
}

export interface QuadCorners {
  topLeft: NormalizedArtworkPoint;
  topRight: NormalizedArtworkPoint;
  bottomRight: NormalizedArtworkPoint;
  bottomLeft: NormalizedArtworkPoint;
}

/**
 * One 2.5D SW/KEY overlay in source-image coordinates.
 *
 * `x` / `y` are the normalised top-left of the untransformed box. The four
 * corners are absolute normalised image points, rather than offsets inside the
 * box, so calibration exports can be pasted back here without another unit
 * conversion. Rotation, scale and skew are applied around the box centre.
 */
export interface InputOverlayCalibration {
  index: number;
  label: string;
  shape: InputOverlayShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  corners?: QuadCorners;
}

export interface InputOverlayCalibrationSet {
  switches: readonly InputOverlayCalibration[];
  keys: readonly InputOverlayCalibration[];
}

export interface OverlayLayout {
  width: number;
  height: number;
  switches: {
    centres: readonly ArtworkPoint[];
    bodyWidth: number;
    bodyHeight: number;
    slotWidth: number;
    slotHeight: number;
    leverWidth: number;
    leverHeight: number;
    travel: number;
  };
  keys: {
    centres: readonly ArtworkPoint[];
    bodyWidth: number;
    bodyHeight: number;
    plungerRadius: number;
    plungerTravel: number;
  };
  leds: {
    red: readonly ArtworkPoint[];
    green: readonly ArtworkPoint[];
    green8: ArtworkPoint;
    redWidth: number;
    redHeight: number;
    greenWidth: number;
    greenHeight: number;
    green8Width: number;
    green8Height: number;
    neutralFill: string;
  };
  hex: {
    centres: readonly ArtworkPoint[];
    windowWidth: number;
    windowHeight: number;
    digitWidth: number;
    digitHeight: number;
    faceTop: string;
    faceBottom: string;
  };
  lcd: {
    glassX: number;
    glassY: number;
    glassWidth: number;
    glassHeight: number;
    insetX: number;
    insetY: number;
  };
}

export interface BoardReferenceAsset {
  src: string;
  width: number;
  height: number;
  layout: OverlayLayout;
  /** Only the 2.5D source needs per-control perspective hit geometry. */
  inputCalibration?: InputOverlayCalibrationSet;
  /** Per-digit visible-face geometry for the perspective-rendered 2.5D PNG. */
  hexCalibration?: readonly InputOverlayCalibration[];
  /** Visible LCD glass geometry for the perspective-rendered 2.5D PNG. */
  lcdCalibration?: InputOverlayCalibration;
}

const points = (xs: readonly number[], y: number): readonly ArtworkPoint[] =>
  xs.map((x) => ({ x, y }));

const n = (value: number, extent: number): number => Number((value / extent).toFixed(6));

const REF_25D_W = 2400;
const REF_25D_H = 1792;

const inputRect = (
  index: number,
  label: string,
  cx: number,
  cy: number,
  width: number,
  height: number,
  overrides: Partial<InputOverlayCalibration> = {},
): InputOverlayCalibration => ({
  index,
  label,
  shape: 'rect',
  x: n(cx - width / 2, REF_25D_W),
  y: n(cy - height / 2, REF_25D_H),
  width: n(width, REF_25D_W),
  height: n(height, REF_25D_H),
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  ...overrides,
});

const quad = (
  topLeft: readonly [number, number],
  topRight: readonly [number, number],
  bottomRight: readonly [number, number],
  bottomLeft: readonly [number, number],
): Pick<InputOverlayCalibration, 'shape' | 'corners'> => ({
  shape: 'quad',
  corners: {
    topLeft: { x: n(topLeft[0], REF_25D_W), y: n(topLeft[1], REF_25D_H) },
    topRight: { x: n(topRight[0], REF_25D_W), y: n(topRight[1], REF_25D_H) },
    bottomRight: { x: n(bottomRight[0], REF_25D_W), y: n(bottomRight[1], REF_25D_H) },
    bottomLeft: { x: n(bottomLeft[0], REF_25D_W), y: n(bottomLeft[1], REF_25D_H) },
  },
});

const inputQuad = (
  index: number,
  label: string,
  topLeft: readonly [number, number],
  topRight: readonly [number, number],
  bottomRight: readonly [number, number],
  bottomLeft: readonly [number, number],
): InputOverlayCalibration => {
  const xs = [topLeft[0], topRight[0], bottomRight[0], bottomLeft[0]];
  const ys = [topLeft[1], topRight[1], bottomRight[1], bottomLeft[1]];
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return inputRect(
    index,
    label,
    minX + (maxX - minX) / 2,
    minY + (maxY - minY) / 2,
    maxX - minX,
    maxY - minY,
    { ...quad(topLeft, topRight, bottomRight, bottomLeft) },
  );
};

/**
 * Independent, per-element 2.5D calibration. Entries are in logical index
 * order (SW0..SW17 / KEY0..KEY3), unlike the artwork centre arrays which are
 * stored from left to right. The source image is a perspective render: even
 * apparently central controls have measurable shear, so every live surface,
 * mask and hit target uses the four physical face corners measured in the PNG.
 */
export const DE2_25D_INPUT_CALIBRATION: InputOverlayCalibrationSet = {
  switches: [
    inputQuad(0, 'SW0', [1480, 1399], [1531, 1399], [1536, 1537], [1483, 1537]),
    inputQuad(1, 'SW1', [1405, 1399], [1458, 1399], [1461, 1537], [1406, 1537]),
    inputQuad(2, 'SW2', [1333, 1399], [1384, 1399], [1386, 1537], [1333, 1537]),
    inputQuad(3, 'SW3', [1260, 1399], [1312, 1399], [1313, 1537], [1259, 1537]),
    inputQuad(4, 'SW4', [1187, 1399], [1239, 1399], [1239, 1537], [1185, 1537]),
    inputQuad(5, 'SW5', [1112, 1399], [1163, 1399], [1162, 1537], [1109, 1537]),
    inputQuad(6, 'SW6', [1038, 1399], [1090, 1399], [1087, 1537], [1033, 1537]),
    inputQuad(7, 'SW7', [964, 1399], [1016, 1399], [1012, 1537], [958, 1537]),
    inputQuad(8, 'SW8', [890, 1399], [941, 1399], [936, 1537], [883, 1537]),
    inputQuad(9, 'SW9', [815, 1399], [867, 1399], [861, 1537], [807, 1537]),
    inputQuad(10, 'SW10', [741, 1399], [794, 1399], [787, 1537], [732, 1537]),
    inputQuad(11, 'SW11', [668, 1399], [719, 1399], [711, 1537], [658, 1537]),
    inputQuad(12, 'SW12', [594, 1399], [646, 1399], [636, 1537], [582, 1537]),
    inputQuad(13, 'SW13', [522, 1399], [573, 1399], [562, 1537], [509, 1537]),
    inputQuad(14, 'SW14', [448, 1399], [499, 1399], [487, 1537], [434, 1537]),
    inputQuad(15, 'SW15', [374, 1399], [426, 1399], [413, 1537], [359, 1537]),
    inputQuad(16, 'SW16', [302, 1399], [354, 1399], [340, 1537], [286, 1537]),
    inputQuad(17, 'SW17', [230, 1399], [281, 1399], [266, 1537], [213, 1537]),
  ],
  keys: [
    inputQuad(0, 'KEY0', [2021, 1425], [2127, 1425], [2136, 1540], [2027, 1540]),
    inputQuad(1, 'KEY1', [1871, 1425], [1977, 1425], [1985, 1540], [1876, 1540]),
    inputQuad(2, 'KEY2', [1723, 1425], [1829, 1425], [1835, 1540], [1726, 1540]),
    inputQuad(3, 'KEY3', [1574, 1425], [1682, 1425], [1686, 1540], [1575, 1540]),
  ],
};

/**
 * Visible digit planes measured from the 2400 x 1792 source render. Logical
 * order is HEX0..HEX7. The approximately ten-pixel lower-edge shift is the
 * perspective of the module face; segment slant remains inside the canonical
 * seven-segment artwork and is therefore not baked into these corners.
 */
export const DE2_25D_HEX_CALIBRATION: readonly InputOverlayCalibration[] = [
  inputQuad(0, 'HEX0', [1001, 1171], [1070, 1171], [1067, 1275], [997, 1275]),
  inputQuad(1, 'HEX1', [936, 1171], [1003, 1171], [1001, 1275], [931, 1275]),
  inputQuad(2, 'HEX2', [867, 1171], [935, 1171], [931, 1275], [860, 1275]),
  inputQuad(3, 'HEX3', [797, 1171], [866, 1171], [862, 1275], [790, 1275]),
  inputQuad(4, 'HEX4', [562, 1171], [633, 1171], [627, 1275], [555, 1275]),
  inputQuad(5, 'HEX5', [489, 1171], [561, 1171], [553, 1275], [480, 1275]),
  inputQuad(6, 'HEX6', [336, 1171], [408, 1171], [399, 1275], [326, 1275]),
  inputQuad(7, 'HEX7', [263, 1171], [332, 1171], [324, 1275], [252, 1275]),
];

/**
 * The usable sage LCD glass, excluding its black bevel and plastic frame.
 *
 * The left edge is deliberately tapered: the photographed module is viewed
 * obliquely, so the upper-left corner sits about 20 px farther right than the
 * lower-left corner. Keeping that perspective in the quad prevents the live
 * backlight from painting over the black inner bezel.
 */
export const DE2_25D_LCD_CALIBRATION = inputQuad(
  0,
  'LCD',
  [375, 876],
  [1002, 876],
  [998, 1012],
  [358, 1012],
);

export const DE2_REFERENCE_2D: BoardReferenceAsset = {
  src: '/boards/de2/de2-reference-2d-v2.webp',
  width: 2048,
  height: 1638,
  layout: {
    width: 2048,
    height: 1638,
    switches: {
      centres: points(
        [132, 199, 266, 333, 402, 468, 537, 605, 674, 744, 812, 881, 949, 1020, 1087, 1155, 1223, 1293],
        1454,
      ),
      bodyWidth: 58,
      bodyHeight: 124,
      slotWidth: 36,
      slotHeight: 78,
      leverWidth: 38,
      leverHeight: 35,
      travel: 43,
    },
    keys: {
      centres: points([1407, 1544, 1681, 1819], 1467),
      bodyWidth: 108,
      bodyHeight: 112,
      plungerRadius: 29,
      plungerTravel: 5,
    },
    leds: {
      red: points(
        [132, 197, 266, 335, 404, 472, 541, 611, 682, 751, 821, 890, 959, 1024, 1090, 1156, 1221, 1291],
        1348,
      ),
      green: points([1364, 1436, 1508, 1582, 1657, 1730, 1805, 1874], 1347),
      green8: { x: 556, y: 1231 },
      redWidth: 22,
      redHeight: 28,
      greenWidth: 20,
      greenHeight: 26,
      green8Width: 19,
      green8Height: 26,
      neutralFill: '#063B5E',
    },
    hex: {
      centres: points([151, 222, 367, 438, 658, 723, 789, 852], 1222),
      windowWidth: 61,
      windowHeight: 90,
      digitWidth: 54,
      digitHeight: 82,
      faceTop: '#635A5A',
      faceBottom: '#514A4A',
    },
    lcd: {
      glassX: 191,
      glassY: 858,
      glassWidth: 620,
      glassHeight: 151,
      insetX: 0.055,
      insetY: 0.16,
    },
  },
};

export const DE2_REFERENCE_25D: BoardReferenceAsset = {
  src: '/boards/de2/de2-reference-25d-v2.webp',
  width: REF_25D_W,
  height: REF_25D_H,
  inputCalibration: DE2_25D_INPUT_CALIBRATION,
  hexCalibration: DE2_25D_HEX_CALIBRATION,
  lcdCalibration: DE2_25D_LCD_CALIBRATION,
  layout: {
    width: REF_25D_W,
    height: REF_25D_H,
    switches: {
      centres: points(
        [255, 328, 400, 473, 547, 620, 693, 767, 841, 915, 990, 1064, 1137, 1213, 1286, 1358, 1431, 1505],
        1468,
      ),
      bodyWidth: 54,
      bodyHeight: 138,
      slotWidth: 34,
      slotHeight: 80,
      leverWidth: 34,
      leverHeight: 34,
      travel: 44,
    },
    keys: {
      centres: points([1628, 1776, 1925, 2076], 1482),
      bodyWidth: 108,
      bodyHeight: 115,
      plungerRadius: 30,
      plungerTravel: 5,
    },
    leds: {
      red: points(
        [263, 334, 407, 481, 555, 628, 701, 777, 854, 926, 1002, 1076, 1148, 1219, 1290, 1359, 1429, 1503],
        1369,
      ),
      green: points([1581, 1655, 1733, 1811, 1890, 1967, 2047, 2122], 1369),
      green8: { x: 723, y: 1255 },
      redWidth: 22,
      redHeight: 24,
      greenWidth: 22,
      greenHeight: 26,
      green8Width: 18,
      green8Height: 26,
      neutralFill: '#063B5E',
    },
    hex: {
      centres: points([293, 367, 521, 594, 829, 898, 968, 1034], 1223),
      windowWidth: 72,
      windowHeight: 104,
      digitWidth: 64,
      digitHeight: 90,
      faceTop: '#77706D',
      faceBottom: '#686765',
    },
    lcd: {
      glassX: 358,
      glassY: 876,
      glassWidth: 644,
      glassHeight: 136,
      insetX: 0.055,
      insetY: 0.16,
    },
  },
};

export const DE2_REFERENCE_2D_ASPECT = DE2_REFERENCE_2D.width / DE2_REFERENCE_2D.height;
export const DE2_REFERENCE_25D_ASPECT = DE2_REFERENCE_25D.width / DE2_REFERENCE_25D.height;
