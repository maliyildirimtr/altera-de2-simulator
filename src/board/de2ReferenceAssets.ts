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
  x: n(cx - width / 2, 2168),
  y: n(cy - height / 2, 1477),
  width: n(width, 2168),
  height: n(height, 1477),
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
    topLeft: { x: n(topLeft[0], 2168), y: n(topLeft[1], 1477) },
    topRight: { x: n(topRight[0], 2168), y: n(topRight[1], 1477) },
    bottomRight: { x: n(bottomRight[0], 2168), y: n(bottomRight[1], 1477) },
    bottomLeft: { x: n(bottomLeft[0], 2168), y: n(bottomLeft[1], 1477) },
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
    inputQuad(0, 'SW0', [1355, 1237], [1406, 1237], [1410, 1377], [1359, 1377]),
    inputQuad(1, 'SW1', [1280, 1237], [1333, 1237], [1335, 1377], [1284, 1377]),
    inputQuad(2, 'SW2', [1209, 1237], [1260, 1237], [1261, 1377], [1211, 1377]),
    inputQuad(3, 'SW3', [1135, 1237], [1187, 1237], [1186, 1377], [1135, 1377]),
    inputQuad(4, 'SW4', [1063, 1237], [1115, 1237], [1114, 1377], [1062, 1377]),
    inputQuad(5, 'SW5', [987, 1237], [1039, 1237], [1037, 1377], [986, 1377]),
    inputQuad(6, 'SW6', [913, 1237], [966, 1237], [962, 1377], [911, 1377]),
    inputQuad(7, 'SW7', [840, 1237], [891, 1237], [887, 1377], [836, 1377]),
    inputQuad(8, 'SW8', [765, 1237], [817, 1237], [812, 1377], [761, 1377]),
    inputQuad(9, 'SW9', [691, 1237], [743, 1237], [736, 1377], [686, 1377]),
    inputQuad(10, 'SW10', [617, 1237], [670, 1237], [662, 1377], [611, 1377]),
    inputQuad(11, 'SW11', [544, 1237], [595, 1237], [587, 1377], [537, 1377]),
    inputQuad(12, 'SW12', [470, 1237], [522, 1237], [512, 1377], [461, 1377]),
    inputQuad(13, 'SW13', [398, 1237], [449, 1237], [439, 1377], [388, 1377]),
    inputQuad(14, 'SW14', [323, 1237], [375, 1237], [364, 1377], [313, 1377]),
    inputQuad(15, 'SW15', [250, 1237], [302, 1237], [289, 1377], [239, 1377]),
    inputQuad(16, 'SW16', [178, 1237], [229, 1237], [216, 1377], [165, 1377]),
    inputQuad(17, 'SW17', [105, 1237], [158, 1237], [142, 1377], [92, 1377]),
  ],
  keys: [
    inputQuad(0, 'KEY0', [1897, 1266], [2000, 1266], [2010, 1376], [1905, 1376]),
    inputQuad(1, 'KEY1', [1748, 1266], [1850, 1266], [1860, 1376], [1754, 1376]),
    inputQuad(2, 'KEY2', [1599, 1266], [1707, 1266], [1710, 1376], [1605, 1376]),
    inputQuad(3, 'KEY3', [1450, 1266], [1558, 1266], [1560, 1376], [1450, 1376]),
  ],
};

/**
 * Visible digit planes measured from the 2168 x 1477 source PNG. Logical
 * order is HEX0..HEX7. The approximately ten-pixel lower-edge shift is the
 * perspective of the module face; segment slant remains inside the canonical
 * seven-segment artwork and is therefore not baked into these corners.
 */
export const DE2_25D_HEX_CALIBRATION: readonly InputOverlayCalibration[] = [
  inputQuad(0, 'HEX0', [876, 1009], [948, 1009], [938, 1119], [866, 1119]),
  inputQuad(1, 'HEX1', [811, 1011], [879, 1011], [869, 1118], [801, 1118]),
  inputQuad(2, 'HEX2', [742, 1012], [810, 1012], [800, 1118], [732, 1118]),
  inputQuad(3, 'HEX3', [673, 1013], [741, 1013], [731, 1117], [663, 1117]),
  inputQuad(4, 'HEX4', [438, 1012], [510, 1012], [500, 1117], [428, 1117]),
  inputQuad(5, 'HEX5', [365, 1012], [437, 1012], [427, 1117], [355, 1117]),
  inputQuad(6, 'HEX6', [210, 1013], [282, 1013], [272, 1117], [200, 1117]),
  inputQuad(7, 'HEX7', [136, 1013], [208, 1013], [198, 1117], [126, 1117]),
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
  [251, 718],
  [881, 719],
  [876, 856],
  [233, 856],
);

export const DE2_REFERENCE_2D: BoardReferenceAsset = {
  src: '/boards/de2/de2-reference-2d.png',
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
  src: '/boards/de2/de2-reference-25d.png',
  width: 2168,
  height: 1477,
  inputCalibration: DE2_25D_INPUT_CALIBRATION,
  hexCalibration: DE2_25D_HEX_CALIBRATION,
  lcdCalibration: DE2_25D_LCD_CALIBRATION,
  layout: {
    width: 2168,
    height: 1477,
    switches: {
      centres: points(
        [123, 197, 270, 344, 418, 492, 566, 640, 714, 789, 864, 939, 1012, 1088, 1162, 1237, 1309, 1384],
        1305,
      ),
      bodyWidth: 70,
      bodyHeight: 140,
      slotWidth: 41,
      slotHeight: 82,
      leverWidth: 41,
      leverHeight: 36,
      travel: 46,
    },
    keys: {
      centres: points([1506, 1656, 1804, 1954], 1322),
      bodyWidth: 110,
      bodyHeight: 110,
      plungerRadius: 31,
      plungerTravel: 5,
    },
    leds: {
      red: points(
        [138, 208, 282, 356, 430, 503, 576, 651, 728, 801, 877, 951, 1023, 1093, 1164, 1233, 1303, 1377],
        1210,
      ),
      green: points([1455, 1530, 1608, 1687, 1767, 1845, 1924, 1999], 1211),
      green8: { x: 598, y: 1095 },
      redWidth: 23,
      redHeight: 25,
      greenWidth: 24,
      greenHeight: 27,
      green8Width: 21,
      green8Height: 29,
      neutralFill: '#063B5E',
    },
    hex: {
      centres: points([170, 244, 399, 472, 707, 776, 845, 910], 1065),
      windowWidth: 72,
      windowHeight: 94,
      digitWidth: 64,
      digitHeight: 86,
      faceTop: '#77706D',
      faceBottom: '#686765',
    },
    lcd: {
      glassX: 232,
      glassY: 718,
      glassWidth: 651,
      glassHeight: 140,
      insetX: 0.055,
      insetY: 0.16,
    },
  },
};

export const DE2_REFERENCE_2D_ASPECT = DE2_REFERENCE_2D.width / DE2_REFERENCE_2D.height;
export const DE2_REFERENCE_25D_ASPECT = DE2_REFERENCE_25D.width / DE2_REFERENCE_25D.height;
