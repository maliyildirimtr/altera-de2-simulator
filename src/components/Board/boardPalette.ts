/**
 * Shared material palette for the DE2 board renderers.
 *
 * Restrained engineering-laboratory colours: deep navy solder mask, copper and
 * gold pad details, white silkscreen. No neon, no cyberpunk accents.
 * Both the 2D and 2.5D renderers read from here so the two views stay in the
 * same visual family.
 */

export const PCB = {
  /** Solder mask base. */
  base: '#0E2747',
  /** Lit face of the mask (top-left illumination). */
  light: '#154070',
  /** Shaded mask, used for edge falloff and the 2.5D substrate sides. */
  dark: '#081B33',
  /** Exposed FR-4 core seen on the board edge. */
  core: '#C8A55E',
  coreDark: '#8A6E34',
  /** Copper pour showing through the mask. */
  pour: '#1B4E85',
  /** Routed trace hint colour. */
  trace: '#2E70B8',
  /** Plated through-hole barrel. */
  hole: '#050D18',
} as const;

export const SILK = {
  white: '#DCE6F2',
  dim: '#93A7C0',
  ref: '#D9BC72',
} as const;

export const METAL = {
  /** Bright connector shells (USB, SD card shield). */
  bright: '#C3CAD3',
  mid: '#8E97A3',
  dark: '#5B636E',
  shadow: '#31363E',
  /** Machined push-button cap. */
  cap: '#B9BFC7',
  capDark: '#6E757F',
} as const;

export const GOLD = {
  light: '#E8CE84',
  base: '#C7A24A',
  dark: '#8A6E2C',
} as const;

export const IC = {
  /** Moulded epoxy package top. */
  top: '#23262C',
  mid: '#1A1D22',
  dark: '#101317',
  /** Lead frame / gull-wing pins. */
  pin: '#9AA2AD',
  pinDark: '#5C636D',
  /** Pin-1 orientation dot. */
  pin1: '#B99331',
} as const;

export const LED = {
  redOn: '#FF4034',
  redCore: '#FFD0C4',
  redOff: '#5A1712',
  redOffDark: '#2A0A08',
  greenOn: '#3FE06A',
  greenCore: '#D3FFD9',
  greenOff: '#154F26',
  greenOffDark: '#082414',
  /** Clear epoxy lens rim. */
  rim: '#3A4453',
} as const;

export const SEVEN_SEG = {
  /** Moulded display package. */
  package: '#2A1414',
  packageTop: '#3A1C1C',
  /** Unlit segment. */
  off: '#4A1A17',
  offDim: '#33110F',
  /** Lit segment. */
  on: '#FF3B2E',
  onCore: '#FFB1A4',
} as const;

/**
 * The DE2 LCD is NOT simulated, so the module is drawn unlit: a muted
 * grey-green STN panel rather than a bright backlit one. Keeping it dim also
 * stops a 72 mm module from dominating the board visually.
 */
export const LCD = {
  bezel: '#1B1F26',
  bezelLight: '#2C323B',
  glass: '#93A47B',
  glassDark: '#76875F',
  pixelOff: 'rgba(24, 48, 12, 0.22)',
} as const;

export const JACK: Record<string, string> = {
  'jack-pink': '#E48BB0',
  'jack-blue': '#5AA8DC',
  'jack-green': '#7FC55C',
  'jack-yellow': '#E2C34B',
  'jack-purple': '#9E86C8',
};

export const SWITCH = {
  body: '#15181D',
  bodyTop: '#23272E',
  leverLight: '#DDE2E8',
  leverMid: '#A5ACB6',
  leverDark: '#6A717B',
  /** Recessed channel behind the lever. */
  channel: '#05070A',
} as const;

export const BUTTON_RED = {
  light: '#E8493C',
  base: '#C42B21',
  dark: '#7E1810',
} as const;
