/**
 * Canonical physical layout of the ORIGINAL Terasic / Altera DE2 board
 * (Cyclone II EP2C35F672C6 — NOT DE2-70, DE2-115 or DE1).
 *
 * ── Coordinate system ─────────────────────────────────────────────────────
 * All geometry is expressed in REAL MILLIMETRES with the origin at the
 * top-left corner of the PCB, x → right, y → down. The official DE2 outer
 * PCB dimensions are 203 mm × 153 mm.
 *
 * Renderers (2D SVG, 2.5D extruded SVG and a future 3D renderer) all consume
 * this single module. No renderer may hardcode component coordinates.
 *
 * ── Source priority (per project rules) ───────────────────────────────────
 *  1. Supplied top-view photograph of the original Terasic DE2
 *  2. Terasic DE2 User Manual (board overview figure, outer dimensions)
 *  3. DE2 schematics / reference designators
 *  4. Previous project implementation
 *
 * Positions were derived by scaling the supplied photograph against the
 * official 203 × 153 mm outline (~5.95 px/mm). They are accurate to roughly
 * ±1.5 mm — faithful in ordering, proportion and grouping, which is what a
 * teaching illustration needs. They are NOT a substitute for the DE2
 * mechanical drawing.
 *
 * KNOWN SOURCE DISAGREEMENT (documented rather than silently guessed):
 * the second supplied reference image is a DE2-115 annotation diagram
 * (Cyclone IV E, two Ethernet ports, HSMC connector). It is used here only
 * for connector *naming*, never for placement. The original DE2 has a single
 * Ethernet port, no HSMC, and a different top-edge ordering.
 */

/* ────────────────────────────────────────────────────────────────────────
 * Board envelope
 * ──────────────────────────────────────────────────────────────────────── */

/** Official DE2 outer PCB dimensions in millimetres. */
export const BOARD_MM = { width: 203, height: 153 } as const;

/** PCB substrate thickness in millimetres (standard FR-4). */
export const PCB_THICKNESS_MM = 1.6;

/** PCB corner radius in millimetres. */
export const PCB_CORNER_RADIUS_MM = 2.4;

/**
 * Rendering scale. The SVG viewBox is authored in millimetres, so this is
 * only used to size the DOM box the viewport transform operates on.
 */
export const BOARD_PX_PER_MM = 6;

export const BOARD_RENDER_WIDTH = Math.round(BOARD_MM.width * BOARD_PX_PER_MM);
export const BOARD_RENDER_HEIGHT = Math.round(BOARD_MM.height * BOARD_PX_PER_MM);

/* ────────────────────────────────────────────────────────────────────────
 * Component model
 * ──────────────────────────────────────────────────────────────────────── */

export type BoardComponentType =
  | 'switch'
  | 'key'
  | 'led-red'
  | 'led-green'
  | 'seven-segment'
  | 'lcd'
  | 'fpga'
  | 'connector'
  | 'header'
  | 'memory'
  | 'ic'
  | 'oscillator'
  | 'passive'
  | 'mounting-hole';

/**
 * Visual body treatment. Renderers map this to their own materials; it keeps
 * per-component styling out of the renderers without leaking SVG specifics
 * into the layout model.
 */
export type BoardBodyStyle =
  | 'ic-black'
  | 'metal'
  | 'metal-dark'
  | 'gold'
  | 'plastic-black'
  | 'plastic-white'
  | 'jack-pink'
  | 'jack-blue'
  | 'jack-green'
  /** PS/2 mini-DIN: cream plastic on the DE2, not the PC-standard purple. */
  | 'jack-cream'
  /** Chrome RCA barrel (VIDEO IN). */
  | 'rca'
  | 'barrel'
  | 'button-red'
  | 'display'
  | 'lcd'
  /** Violet tantalum capacitor. */
  | 'tantalum'
  /** Aluminium electrolytic can. */
  | 'can'
  /** Always-lit blue power-rail indicator. */
  | 'indicator-blue'
  | 'pad';

export interface BoardComponent {
  /** Stable unique id, e.g. `sw-0`, `hex-3`, `conn-vga`. */
  id: string;
  type: BoardComponentType;
  /** Bank index for indexed families (SW, KEY, LEDR, LEDG, HEX). */
  index?: number;
  /** Top-left corner, millimetres. */
  x: number;
  y: number;
  /** Footprint size, millimetres. */
  width: number;
  height: number;
  /** Degrees, clockwise, about the footprint centre. Defaults to 0. */
  rotation?: number;
  /** Whether the component accepts user input. */
  interactive: boolean;
  /** Silkscreen / accessible label, e.g. `SW0`, `VGA`. */
  label?: string;
  /** Package height above the PCB surface, millimetres. Used by 2.5D / 3D. */
  elevation?: number;
  /** Body treatment hint for renderers. */
  body?: BoardBodyStyle;
  /** Optional reference designator silkscreen, e.g. `U1`, `J13`. */
  refDes?: string;
  /** Extra descriptive text drawn on larger packages. */
  caption?: string;
}

/** Where a component's silkscreen label sits relative to its footprint. */
export type LabelPlacement = 'above' | 'below' | 'none';

export interface SilkscreenText {
  id: string;
  x: number;
  y: number;
  text: string;
  /** Cap height in millimetres. */
  size: number;
  anchor?: 'start' | 'middle' | 'end';
  /**
   * A real board has one silkscreen ink, so hierarchy comes from size, weight
   * and opacity — never a second colour. `ref` is the DE2's one genuine
   * exception: its reference designators are printed in a warmer, thinner ink.
   */
  tone?: 'primary' | 'secondary' | 'tertiary' | 'ref';
  weight?: 'normal' | 'bold' | 'black';
  italic?: boolean;
  letterSpacing?: number;
  rotation?: number;
  /**
   * Minimum detail level at which this text is drawn. Micro silkscreen is
   * dropped when the board is zoomed out so text never dominates the board.
   */
  minDetail?: BoardDetail;
}

/** Progressive level of detail, driven by the viewport zoom scale. */
export type BoardDetail = 'low' | 'normal' | 'high';

const DETAIL_RANK: Record<BoardDetail, number> = { low: 0, normal: 1, high: 2 };

/** True when `required` detail is available at the current `detail` level. */
export function hasDetail(detail: BoardDetail, required: BoardDetail): boolean {
  return DETAIL_RANK[detail] >= DETAIL_RANK[required];
}

/** Maps a viewport zoom scale to a level of detail. */
export function detailForScale(scale: number): BoardDetail {
  if (scale < 0.55) return 'low';
  if (scale < 1.05) return 'normal';
  return 'high';
}

/* ────────────────────────────────────────────────────────────────────────
 * Bank geometry constants
 * ──────────────────────────────────────────────────────────────────────── */

/** SW / LEDR share a common column pitch so each switch sits under its LED. */
const USER_IO_PITCH = 6.23;
/** Centre of SW17 / LEDR17 (left-most of the bank). */
const USER_IO_FIRST_CX = 9.7;

/** LEDG bank pitch (wider than the red bank on the real board). */
const LEDG_PITCH = 6.586;
/** Centre of LEDG0 (right-most of the bank). */
const LEDG_LAST_CX = 170;

const LED_W = 2.8;
const LED_H = 4.2;
const LED_Y = 132;

const SWITCH_W = 4.2;
const SWITCH_H = 9.8;
const SWITCH_Y = 137.4;

const KEY_D = 10.2;
const KEY_Y = 136.4;

const HEX_W = 10.5;
const HEX_H = 11.4;
const HEX_Y = 114.6;
const HEX_PITCH = 11.3;

/**
 * Silkscreen baselines for the bottom user-I/O strip. Held here so the 2D and
 * 2.5D renderers print labels on exactly the same lines and nothing collides.
 */
/**
 * Silkscreen baselines for the bottom user-I/O strip.
 *
 * Two constraints set these numbers:
 *
 *  1. The DE2 prints each indicator's designator ABOVE its row, between the
 *     resistor networks and the lenses. The flat view follows that.
 *  2. In the 2.5D view a part of height `e` hides anything printed less than
 *     `1.28 x e` millimetres above it, because height lifts on screen while
 *     depth only foreshortens. Every line below therefore clears the part it
 *     labels by that margin, so the elevated view can show the same
 *     silkscreen as the flat one instead of dropping it.
 */
export const BOTTOM_SILK = {
  /** Above the seven-segment bank (packages stand 2.6 mm proud). */
  hexLabelY: 110.4,
  /** Above the LED row (lenses stand 1.8 mm proud). */
  ledLabelY: 129.4,
  /** Below the switch and push-button banks — nothing stands in front. */
  controlLabelY: 150,
  /** Above LEDG8, which stands apart from the green bank. */
  ledg8LabelY: 115.4,
} as const;

/** Centre x of SW`index` / LEDR`index` (index 17 left-most, 0 right-most). */
export function userIoCentreX(index: number): number {
  return USER_IO_FIRST_CX + (17 - index) * USER_IO_PITCH;
}

/** Centre x of LEDG`index` (index 8 is the odd one out, near the HEX bank). */
export function ledGreenCentreX(index: number): number {
  return LEDG_LAST_CX - index * LEDG_PITCH;
}

/** Centre x of KEY`index`. Each KEY sits under LEDG(2 × index). */
export function keyCentreX(index: number): number {
  return ledGreenCentreX(index * 2);
}

/**
 * Left edge of HEX`index`. The real DE2 groups the displays as
 * [HEX7 HEX6] [HEX5 HEX4] [HEX3 HEX2 HEX1 HEX0].
 */
export function hexLeftX(index: number): number {
  if (index >= 6) return 6.0 + (7 - index) * HEX_PITCH;
  if (index >= 4) return 33.5 + (5 - index) * HEX_PITCH;
  return 71.5 + (3 - index) * HEX_PITCH;
}

/* ────────────────────────────────────────────────────────────────────────
 * Interactive & indicator banks
 * ──────────────────────────────────────────────────────────────────────── */

export const DE2_SWITCHES: BoardComponent[] = Array.from({ length: 18 }, (_, i) => {
  const index = 17 - i;
  return {
    id: `sw-${index}`,
    type: 'switch' as const,
    index,
    x: +(userIoCentreX(index) - SWITCH_W / 2).toFixed(3),
    y: SWITCH_Y,
    width: SWITCH_W,
    height: SWITCH_H,
    interactive: true,
    label: `SW${index}`,
    elevation: 2.9,
    body: 'plastic-black' as const,
  };
});

export const DE2_KEYS: BoardComponent[] = Array.from({ length: 4 }, (_, i) => {
  const index = 3 - i;
  return {
    id: `key-${index}`,
    type: 'key' as const,
    index,
    x: +(keyCentreX(index) - KEY_D / 2).toFixed(3),
    y: KEY_Y,
    width: KEY_D,
    height: KEY_D,
    interactive: true,
    label: `KEY${index}`,
    elevation: 3.2,
    body: 'metal' as const,
  };
});

export const DE2_LEDS_RED: BoardComponent[] = Array.from({ length: 18 }, (_, i) => {
  const index = 17 - i;
  return {
    id: `ledr-${index}`,
    type: 'led-red' as const,
    index,
    x: +(userIoCentreX(index) - LED_W / 2).toFixed(3),
    y: LED_Y,
    width: LED_W,
    height: LED_H,
    interactive: false,
    label: `LEDR${index}`,
    elevation: 1.9,
  };
});

export const DE2_LEDS_GREEN: BoardComponent[] = Array.from({ length: 9 }, (_, i) => {
  const index = 8 - i;
  // LEDG8 is physically separated from LEDG7..0 and sits beside the HEX bank.
  const isolated = index === 8;
  return {
    id: `ledg-${index}`,
    type: 'led-green' as const,
    index,
    x: isolated
      ? 61.4
      : +(ledGreenCentreX(index) - LED_W / 2).toFixed(3),
    y: isolated ? 118.2 : LED_Y,
    width: LED_W,
    height: LED_H,
    interactive: false,
    label: `LEDG${index}`,
    elevation: 1.9,
  };
});

export const DE2_HEX_DISPLAYS: BoardComponent[] = Array.from({ length: 8 }, (_, i) => {
  const index = 7 - i;
  return {
    id: `hex-${index}`,
    type: 'seven-segment' as const,
    index,
    x: +hexLeftX(index).toFixed(3),
    y: HEX_Y,
    width: HEX_W,
    height: HEX_H,
    interactive: false,
    label: `HEX${index}`,
    elevation: 2.2,
    body: 'display' as const,
  };
});

/* ────────────────────────────────────────────────────────────────────────
 * Connectors — top I/O edge, left edge and right edge
 * ──────────────────────────────────────────────────────────────────────── */

export const DE2_CONNECTORS: BoardComponent[] = [
  // ── Top I/O edge, left → right (original DE2 ordering) ──
  { id: 'conn-usb-blaster', type: 'connector', x: 9, y: 1.5, width: 14, height: 13, interactive: false, label: 'USB BLASTER', elevation: 3.9, body: 'metal', refDes: 'J9' },
  { id: 'conn-usb-device', type: 'connector', x: 24.6, y: 1.5, width: 12.4, height: 13, interactive: false, label: 'USB DEVICE', elevation: 3.9, body: 'metal', refDes: 'J10' },
  { id: 'conn-usb-host', type: 'connector', x: 38.6, y: 1.5, width: 12.8, height: 13, interactive: false, label: 'USB HOST', elevation: 3.9, body: 'metal', refDes: 'J11' },
  { id: 'conn-mic', type: 'connector', x: 55.5, y: 3, width: 7.5, height: 9.5, interactive: false, label: 'MIC', elevation: 3.6, body: 'jack-pink' },
  { id: 'conn-line-in', type: 'connector', x: 64.5, y: 3, width: 7.5, height: 9.5, interactive: false, label: 'LINE IN', elevation: 3.6, body: 'jack-blue' },
  { id: 'conn-line-out', type: 'connector', x: 73.5, y: 3, width: 7.5, height: 9.5, interactive: false, label: 'LINE OUT', elevation: 3.6, body: 'jack-green' },
  { id: 'conn-video-in', type: 'connector', x: 84, y: 2, width: 9, height: 11, interactive: false, label: 'VIDEO IN', elevation: 4.0, body: 'rca', refDes: 'J12' },
  { id: 'conn-vga', type: 'connector', x: 96, y: 1.5, width: 22, height: 13, interactive: false, label: 'VGA', elevation: 4.3, body: 'metal-dark', refDes: 'J13' },
  { id: 'conn-ethernet', type: 'connector', x: 121.5, y: 1, width: 19, height: 14.5, interactive: false, label: 'ETHERNET', elevation: 4.6, body: 'plastic-black', refDes: 'J4' },
  { id: 'conn-rs232', type: 'connector', x: 143.5, y: 1.5, width: 20, height: 13, interactive: false, label: 'RS-232', elevation: 4.3, body: 'metal-dark', refDes: 'J8' },
  { id: 'conn-ps2', type: 'connector', x: 167, y: 2, width: 13, height: 12, interactive: false, label: 'PS/2', elevation: 3.9, body: 'jack-cream', refDes: 'J6' },

  // ── Left edge ──
  { id: 'conn-dc-power', type: 'connector', x: 2.2, y: 18.5, width: 13, height: 11, interactive: false, label: 'DC 9V', elevation: 3.8, body: 'barrel' },
  { id: 'ctl-power-button', type: 'connector', x: 3.6, y: 32, width: 9.2, height: 9.2, interactive: false, label: 'POWER', elevation: 3.4, body: 'button-red' },
  { id: 'ctl-run-prog', type: 'connector', x: 2.4, y: 69.5, width: 5.5, height: 12, interactive: false, label: 'RUN / PROG', elevation: 2.4, body: 'plastic-black', refDes: 'SW19' },
  { id: 'hdr-jp3', type: 'header', x: 2.6, y: 55, width: 5, height: 9, interactive: false, elevation: 2.2, body: 'plastic-black', refDes: 'JP3' },

  // ── Right edge ──
  { id: 'hdr-gpio0', type: 'header', x: 173, y: 35, width: 9, height: 55, interactive: false, label: 'GPIO 0', elevation: 3.4, body: 'plastic-black', refDes: 'JP1' },
  { id: 'hdr-gpio1', type: 'header', x: 185, y: 35, width: 9, height: 55, interactive: false, label: 'GPIO 1', elevation: 3.4, body: 'plastic-black', refDes: 'JP2' },
  { id: 'conn-sd-card', type: 'connector', x: 172, y: 97, width: 27, height: 21, interactive: false, label: 'SD CARD', elevation: 2.4, body: 'metal', refDes: 'J14' },
  { id: 'conn-sma-out', type: 'connector', x: 193.5, y: 58, width: 7.5, height: 7.5, interactive: false, label: 'SMA', elevation: 2.8, body: 'gold', refDes: 'J15' },
  { id: 'conn-sma-in', type: 'connector', x: 187, y: 141, width: 7.5, height: 7.5, interactive: false, label: 'EXT_CLK', elevation: 2.8, body: 'gold', refDes: 'J5' },
];

/* ────────────────────────────────────────────────────────────────────────
 * Major silicon — LCD, FPGA, memory, controller ICs, oscillators
 * ──────────────────────────────────────────────────────────────────────── */

export const DE2_MODULES: BoardComponent[] = [
  { id: 'mod-lcd', type: 'lcd', x: 11.8, y: 68, width: 72, height: 29, interactive: false, label: 'LCD 16x2', elevation: 3.9, body: 'lcd' },

  { id: 'ic-fpga', type: 'fpga', x: 113.5, y: 63.5, width: 27, height: 26, interactive: false, label: 'Cyclone II', elevation: 2.3, body: 'ic-black', refDes: 'U1', caption: 'EP2C35F672C6' },

  { id: 'mem-sdram', type: 'memory', x: 85.5, y: 68.5, width: 18, height: 11.5, interactive: false, label: 'SDRAM 8MB', elevation: 1.5, body: 'ic-black', refDes: 'U17' },
  { id: 'mem-sram', type: 'memory', x: 85, y: 84, width: 19, height: 10.5, interactive: false, label: 'SRAM 512KB', elevation: 1.5, body: 'ic-black', refDes: 'U18' },
  { id: 'mem-flash', type: 'memory', x: 114, y: 89.5, width: 19, height: 12.5, interactive: false, label: 'FLASH 4MB', elevation: 1.5, body: 'ic-black', refDes: 'U20' },

  { id: 'ic-usb-ctrl', type: 'ic', x: 24, y: 30, width: 17, height: 15, interactive: false, elevation: 1.6, body: 'ic-black', refDes: 'U22' },
  { id: 'ic-usb-host', type: 'ic', x: 46, y: 30, width: 13, height: 11.5, interactive: false, elevation: 1.6, body: 'ic-black', refDes: 'U19' },
  { id: 'ic-lcd-buffer', type: 'ic', x: 29, y: 56, width: 13, height: 5.5, interactive: false, elevation: 1.2, body: 'ic-black', refDes: 'U30' },
  { id: 'ic-config', type: 'ic', x: 24, y: 50.5, width: 7.5, height: 5, interactive: false, elevation: 1.2, body: 'ic-black', refDes: 'U4' },
  { id: 'ic-audio-codec', type: 'ic', x: 79.5, y: 33, width: 10, height: 8, interactive: false, elevation: 1.3, body: 'ic-black', refDes: 'U33' },
  { id: 'ic-audio-buffer', type: 'ic', x: 63, y: 49, width: 9, height: 7, interactive: false, elevation: 1.2, body: 'ic-black', refDes: 'U29' },
  { id: 'ic-tv-decoder', type: 'ic', x: 92, y: 28, width: 12, height: 10, interactive: false, elevation: 1.4, body: 'ic-black', refDes: 'U34' },
  { id: 'ic-vga-dac', type: 'ic', x: 106, y: 28.5, width: 11, height: 9, interactive: false, elevation: 1.4, body: 'ic-black', refDes: 'U35' },
  { id: 'ic-ethernet', type: 'ic', x: 120, y: 29, width: 13, height: 12, interactive: false, elevation: 1.5, body: 'ic-black', refDes: 'U26' },
  { id: 'ic-io-buffer-a', type: 'ic', x: 158, y: 40, width: 7, height: 18, interactive: false, elevation: 1.2, body: 'ic-black', refDes: 'U15' },
  { id: 'ic-io-buffer-b', type: 'ic', x: 158, y: 62, width: 7, height: 18, interactive: false, elevation: 1.2, body: 'ic-black', refDes: 'U16' },
  { id: 'ic-seg-driver', type: 'ic', x: 126, y: 104.5, width: 12, height: 5.5, interactive: false, elevation: 1.2, body: 'ic-black', refDes: 'U12' },

  /* Power-rail indicators. Hard-wired on the board, so always lit. */
  { id: 'led-power', type: 'passive', x: 26.2, y: 46.8, width: 2.4, height: 1.6, interactive: false, elevation: 1, body: 'indicator-blue' },
  { id: 'led-load', type: 'passive', x: 31.8, y: 46.8, width: 2.4, height: 1.6, interactive: false, elevation: 1, body: 'indicator-blue' },
  { id: 'led-good', type: 'passive', x: 37.4, y: 46.8, width: 2.4, height: 1.6, interactive: false, elevation: 1, body: 'indicator-blue' },
  /* Ethernet link / activity pair. */
  { id: 'led-txd', type: 'passive', x: 144.2, y: 19.6, width: 1.9, height: 1.3, interactive: false, elevation: 0.8, body: 'indicator-blue' },
  { id: 'led-rxd', type: 'passive', x: 149.2, y: 19.6, width: 1.9, height: 1.3, interactive: false, elevation: 0.8, body: 'indicator-blue' },

  { id: 'osc-50mhz', type: 'oscillator', x: 85, y: 58.5, width: 8, height: 5, interactive: false, label: '50MHz', elevation: 2.2, body: 'metal', refDes: 'Y1' },
  { id: 'osc-27mhz', type: 'oscillator', x: 135.5, y: 30, width: 7, height: 4.5, interactive: false, label: '27MHz', elevation: 2.2, body: 'metal', refDes: 'Y3' },
];

/* ────────────────────────────────────────────────────────────────────────
 * Restrained passive population
 *
 * Deliberately sparse: enough small parts that the board does not read as an
 * empty rectangle, without drawing every microscopic resistor.
 * ──────────────────────────────────────────────────────────────────────── */

function passiveRow(
  idPrefix: string,
  startX: number,
  y: number,
  count: number,
  pitch: number,
  w = 2.2,
  h = 1.2,
): BoardComponent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}-${i}`,
    type: 'passive' as const,
    x: +(startX + i * pitch).toFixed(3),
    y,
    width: w,
    height: h,
    interactive: false,
    elevation: 0.6,
    body: 'ic-black' as const,
  }));
}

function passiveColumn(
  idPrefix: string,
  x: number,
  startY: number,
  count: number,
  pitch: number,
  w = 1.2,
  h = 2.2,
): BoardComponent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}-${i}`,
    type: 'passive' as const,
    x,
    y: +(startY + i * pitch).toFixed(3),
    width: w,
    height: h,
    interactive: false,
    elevation: 0.6,
    body: 'ic-black' as const,
  }));
}

export const DE2_PASSIVES: BoardComponent[] = [
  // Resistor networks above the LEDR / LEDG banks (RN1..RN27 region).
  ...passiveRow('rn-red', 8.2, 126.3, 18, USER_IO_PITCH, 3.2, 1.3),
  ...passiveRow('rn-green', 122.4, 126.3, 8, LEDG_PITCH, 3.2, 1.3),
  // Decoupling around the FPGA.
  ...passiveRow('c-fpga-top', 114, 60.6, 9, 3.1),
  ...passiveRow('c-fpga-bottom', 114, 91.2, 9, 3.1),
  // Audio / video front-end.
  ...passiveRow('c-analog', 56, 18.5, 11, 3.0),
  // Power section, top-left.
  ...passiveRow('c-power', 18, 20, 5, 3.4, 2.6, 1.6),
  // Memory bank decoupling.
  ...passiveRow('c-mem', 86, 81.5, 6, 3.0),
  // GPIO protection diodes, running down beside the expansion headers.
  ...passiveColumn('d-gpio', 168.4, 37, 10, 5.4),
];

/** Larger electrolytic / tantalum capacitors and the power inductor. */
export const DE2_POWER_PARTS: BoardComponent[] = [
  { id: 'pwr-inductor', type: 'passive', x: 3.5, y: 43, width: 9, height: 8, interactive: false, elevation: 4, body: 'plastic-black', refDes: 'L1' },
  { id: 'pwr-cap-1', type: 'passive', x: 15.5, y: 42, width: 6, height: 6, interactive: false, elevation: 5.5, body: 'can', refDes: 'TC4' },
  { id: 'pwr-cap-2', type: 'passive', x: 23, y: 42, width: 6, height: 6, interactive: false, elevation: 5.5, body: 'can', refDes: 'TC5' },
  { id: 'cap-vccio', type: 'passive', x: 104, y: 52, width: 4.4, height: 4.4, interactive: false, elevation: 4, body: 'tantalum' },
  { id: 'cap-vccint', type: 'passive', x: 96, y: 52, width: 4.4, height: 4.4, interactive: false, elevation: 4, body: 'tantalum' },
  { id: 'cap-3v3', type: 'passive', x: 146, y: 53, width: 4.4, height: 4.4, interactive: false, elevation: 4, body: 'tantalum' },
];

/* ────────────────────────────────────────────────────────────────────────
 * Mounting holes
 * ──────────────────────────────────────────────────────────────────────── */

export interface MountingHole {
  id: string;
  /** Centre, millimetres. */
  cx: number;
  cy: number;
  /** Drill radius, millimetres. */
  r: number;
  /** Annular ring radius, millimetres. */
  padR: number;
}

export const DE2_MOUNTING_HOLES: MountingHole[] = [
  { id: 'mh-tl', cx: 5.2, cy: 13.5, r: 1.6, padR: 2.8 },
  { id: 'mh-tr', cx: 197.5, cy: 21, r: 1.6, padR: 2.8 },
  { id: 'mh-bl', cx: 5.5, cy: 131, r: 1.6, padR: 2.8 },
  { id: 'mh-br', cx: 197.5, cy: 131, r: 1.6, padR: 2.8 },
  { id: 'mh-mid', cx: 100, cy: 106, r: 1.3, padR: 2.3 },
  { id: 'mh-fpga', cx: 152, cy: 96, r: 1.3, padR: 2.3 },
];

/* ────────────────────────────────────────────────────────────────────────
 * Silkscreen
 * ──────────────────────────────────────────────────────────────────────── */

/** Board branding and area labels. */
export const DE2_SILKSCREEN: SilkscreenText[] = [
  /* ── Brand marks: the only text at `primary` weight ───────────────── */
  { id: 'silk-altera', x: 128, y: 48.5, text: 'ALTERA', size: 6.6, anchor: 'middle', tone: 'primary', weight: 'black', letterSpacing: 0.5 },
  { id: 'silk-altera-reg', x: 146.2, y: 44.2, text: '\u00AE', size: 2.1, anchor: 'start', tone: 'secondary', minDetail: 'normal' },
  { id: 'silk-univ', x: 128, y: 54.4, text: 'UNIVERSITY', size: 3, anchor: 'middle', tone: 'primary', weight: 'bold', letterSpacing: 1.7 },
  { id: 'silk-prog', x: 128, y: 58.8, text: 'PROGRAM', size: 3, anchor: 'middle', tone: 'primary', weight: 'bold', letterSpacing: 1.7 },

  { id: 'silk-terasic', x: 51, y: 46.5, text: 'terasIC', size: 4.8, anchor: 'middle', tone: 'primary', weight: 'bold', italic: true },
  { id: 'silk-terasic-url', x: 51, y: 50.6, text: 'www.terasic.com', size: 2, anchor: 'middle', tone: 'tertiary', minDetail: 'normal' },

  { id: 'silk-de2', x: 152, y: 110, text: 'DE2', size: 11, anchor: 'middle', tone: 'primary', weight: 'black', letterSpacing: 0.7 },

  { id: 'silk-copyright', x: 4, y: 100.5, text: '\u00A9 ALTERA', size: 2.2, anchor: 'start', tone: 'secondary', minDetail: 'normal' },
  { id: 'silk-altera-url', x: 4, y: 103.6, text: 'www.altera.com', size: 2, anchor: 'start', tone: 'tertiary', minDetail: 'normal' },

  /* ── Area headings ────────────────────────────────────────────────── */
  { id: 'silk-lcd', x: 47.8, y: 63.4, text: 'LCD MODULE 2x16', size: 2.5, anchor: 'middle', tone: 'secondary', minDetail: 'normal', letterSpacing: 0.15 },
  { id: 'silk-gpio0', x: 177.5, y: 94, text: 'GPIO 0', size: 2.9, anchor: 'middle', tone: 'secondary', weight: 'bold' },
  { id: 'silk-gpio1', x: 189.5, y: 94, text: 'GPIO 1', size: 2.9, anchor: 'middle', tone: 'secondary', weight: 'bold' },
  { id: 'silk-sd', x: 185.5, y: 121.4, text: 'SD CARD', size: 2.5, anchor: 'middle', tone: 'secondary', minDetail: 'normal', letterSpacing: 0.15 },

  /* ── Net names and switch positions ──────────────────────────────── */
  { id: 'silk-run', x: 9.6, y: 72.6, text: 'RUN', size: 1.9, anchor: 'start', tone: 'secondary', minDetail: 'high' },
  { id: 'silk-prog-sw', x: 9.6, y: 80.4, text: 'PROG', size: 1.9, anchor: 'start', tone: 'secondary', minDetail: 'high' },
  { id: 'silk-vccio', x: 106.2, y: 50.4, text: 'VCCIO', size: 1.7, anchor: 'middle', tone: 'ref', minDetail: 'high' },
  { id: 'silk-vccint', x: 98.2, y: 50.4, text: 'VCCINT', size: 1.7, anchor: 'middle', tone: 'ref', minDetail: 'high' },
  { id: 'silk-3v3', x: 148.2, y: 51.6, text: '3V3', size: 1.7, anchor: 'middle', tone: 'ref', minDetail: 'high' },

  /* ── Ethernet link / activity legends ────────────────────────────── */
  { id: 'silk-txd', x: 145.1, y: 18.3, text: 'TXD', size: 1.35, anchor: 'middle', tone: 'tertiary', minDetail: 'high' },
  { id: 'silk-rxd', x: 150.1, y: 18.3, text: 'RXD', size: 1.35, anchor: 'middle', tone: 'tertiary', minDetail: 'high' },
];

/**
 * Silkscreen for the top / left / right edge connectors, printed beneath them.
 * All at `secondary` weight: these are wayfinding, not branding.
 */
export const DE2_CONNECTOR_LABELS: SilkscreenText[] = [
  { id: 'lbl-usb-blaster', x: 16.2, y: 16.3, text: 'BLASTER', size: 1.85, anchor: 'middle', tone: 'secondary', minDetail: 'normal' },
  { id: 'lbl-usb-device', x: 30.8, y: 16.3, text: 'DEVICE', size: 1.85, anchor: 'middle', tone: 'secondary', minDetail: 'normal' },
  { id: 'lbl-usb-host', x: 45, y: 16.3, text: 'HOST', size: 1.85, anchor: 'middle', tone: 'secondary', minDetail: 'normal' },
  { id: 'lbl-mic', x: 59.2, y: 15.4, text: 'MIC', size: 1.9, anchor: 'middle', tone: 'secondary', minDetail: 'normal' },
  { id: 'lbl-line-in', x: 68.2, y: 15.4, text: 'LINE IN', size: 1.9, anchor: 'middle', tone: 'secondary', minDetail: 'normal' },
  { id: 'lbl-line-out', x: 77.2, y: 15.4, text: 'LINE OUT', size: 1.9, anchor: 'middle', tone: 'secondary', minDetail: 'normal' },
  { id: 'lbl-video-in', x: 88.5, y: 15.8, text: 'VIDEO IN', size: 1.9, anchor: 'middle', tone: 'secondary', minDetail: 'normal' },
  { id: 'lbl-vga', x: 107, y: 16.6, text: 'VGA', size: 2.2, anchor: 'middle', tone: 'secondary', weight: 'bold' },
  { id: 'lbl-ethernet', x: 131, y: 17.8, text: 'ETHERNET', size: 2.1, anchor: 'middle', tone: 'secondary', weight: 'bold' },
  { id: 'lbl-rs232', x: 153.5, y: 16.6, text: 'RS-232', size: 2.2, anchor: 'middle', tone: 'secondary', weight: 'bold' },
  { id: 'lbl-ps2', x: 173.5, y: 15.8, text: 'PS/2', size: 2, anchor: 'middle', tone: 'secondary', minDetail: 'normal' },
  { id: 'lbl-dc', x: 8.7, y: 31.2, text: 'DC 9V', size: 2, anchor: 'middle', tone: 'secondary', minDetail: 'normal' },
];



/* ────────────────────────────────────────────────────────────────────────
 * Copper / routing hints
 *
 * A handful of long traces and pour edges so the PCB reads as a routed board
 * rather than a flat rectangle. Kept intentionally few — these are hints, not
 * a netlist.
 * ──────────────────────────────────────────────────────────────────────── */

export interface TraceHint {
  id: string;
  /** SVG path data in board millimetres. */
  d: string;
  /** Stroke width, millimetres. */
  width: number;
  /** 0..1 */
  opacity: number;
}

export const DE2_TRACE_HINTS: TraceHint[] = [
  { id: 'trace-fpga-hex', d: 'M 113.5 89.5 L 110 96 L 60 96 L 56 101 L 56 114', width: 0.35, opacity: 0.5 },
  { id: 'trace-fpga-ledr', d: 'M 118 89.5 L 118 104 L 100 104 L 96 110 L 96 126', width: 0.35, opacity: 0.45 },
  { id: 'trace-fpga-sw', d: 'M 124 89.5 L 124 108 L 40 108 L 34 114 L 34 126', width: 0.35, opacity: 0.4 },
  { id: 'trace-fpga-key', d: 'M 133 89.5 L 137 96 L 150 96 L 156 104 L 156 130', width: 0.35, opacity: 0.45 },
  { id: 'trace-fpga-gpio0', d: 'M 140.5 68 L 156 68 L 162 62 L 173 62', width: 0.35, opacity: 0.45 },
  { id: 'trace-fpga-gpio1', d: 'M 140.5 74 L 158 74 L 166 80 L 185 80', width: 0.35, opacity: 0.4 },
  { id: 'trace-fpga-sdram', d: 'M 113.5 72 L 108 72 L 104 74 L 103.5 74', width: 0.35, opacity: 0.45 },
  { id: 'trace-fpga-flash', d: 'M 126 89.5 L 126 91 L 128 93 L 133 93', width: 0.35, opacity: 0.4 },
  { id: 'trace-osc', d: 'M 93 61 L 104 61 L 108 65 L 113.5 65', width: 0.35, opacity: 0.5 },
  { id: 'trace-lcd-bus', d: 'M 83.8 76 L 96 76 L 102 70 L 113.5 70', width: 0.35, opacity: 0.35 },
  { id: 'trace-eth', d: 'M 131 46 L 131 54 L 136 58 L 136 63.5', width: 0.35, opacity: 0.4 },
  { id: 'trace-vga', d: 'M 111.5 41 L 111.5 50 L 116 56 L 116 63.5', width: 0.35, opacity: 0.4 },
  { id: 'trace-bus-a', d: 'M 20 60 L 78 60', width: 0.3, opacity: 0.28 },
  { id: 'trace-bus-b', d: 'M 20 62 L 78 62', width: 0.3, opacity: 0.28 },
  { id: 'trace-bus-c', d: 'M 20 100 L 74 100', width: 0.3, opacity: 0.25 },
  { id: 'trace-bus-d', d: 'M 20 102 L 74 102', width: 0.3, opacity: 0.25 },
  { id: 'trace-bus-e', d: 'M 145 118 L 168 118', width: 0.3, opacity: 0.25 },
];

/* ────────────────────────────────────────────────────────────────────────
 * Aggregate views
 * ──────────────────────────────────────────────────────────────────────── */

/** Every component on the board, in no particular order. */
export const DE2_LAYOUT: BoardComponent[] = [
  ...DE2_CONNECTORS,
  ...DE2_MODULES,
  ...DE2_PASSIVES,
  ...DE2_POWER_PARTS,
  ...DE2_HEX_DISPLAYS,
  ...DE2_LEDS_RED,
  ...DE2_LEDS_GREEN,
  ...DE2_SWITCHES,
  ...DE2_KEYS,
];

/** Static (non-simulated) board furniture, used by both renderers. */
export const DE2_STATIC_COMPONENTS: BoardComponent[] = [
  ...DE2_CONNECTORS,
  ...DE2_MODULES,
  ...DE2_PASSIVES,
  ...DE2_POWER_PARTS,
];

const COMPONENT_BY_ID = new Map(DE2_LAYOUT.map((c) => [c.id, c]));

export function getBoardComponent(id: string): BoardComponent | undefined {
  return COMPONENT_BY_ID.get(id);
}

/** Centre point of a component's footprint, millimetres. */
export function componentCentre(c: BoardComponent): { cx: number; cy: number } {
  return { cx: c.x + c.width / 2, cy: c.y + c.height / 2 };
}

/**
 * Painter's-algorithm ordering for the 2.5D renderer: components further from
 * the viewer (smaller y) are drawn first so nearer packages overlap them.
 */
export function sortByDepth(components: BoardComponent[]): BoardComponent[] {
  return [...components].sort((a, b) => {
    const ay = a.y + a.height;
    const by = b.y + b.height;
    if (ay !== by) return ay - by;
    return a.x - b.x;
  });
}
