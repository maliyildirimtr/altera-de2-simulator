/**
 * Material palette for the DE2 board renderers.
 *
 * Colours were sampled from the supplied photographs of the original Terasic
 * DE2 — primarily the orthographic top-view scan, which is the only reference
 * with flat, even lighting. Where photographic accuracy and simulator
 * legibility disagree (most obviously the unlit LED colour: a real diffused
 * LED is pale enough to be mistaken for "on") the values are pulled toward
 * legibility while keeping the correct hue.
 *
 * Restrained engineering-laboratory palette: deep navy solder mask, copper and
 * gold pad detail, one silkscreen ink. No neon, no cyberpunk accents.
 *
 * Both renderers read from here, so a material change lands in 2D and 2.5D at
 * the same time.
 */

/* ────────────────────────────────────────────────────────────────────────
 * PCB substrate
 *
 * A real board is not one colour. Solder mask over a copper pour reads
 * lighter and slightly warmer than mask over bare substrate, and the whole
 * surface carries a directional sheen from the mask's semi-gloss finish.
 * These four values drive that separation.
 * ──────────────────────────────────────────────────────────────────────── */

export const PCB = {
  /** Solder mask over bare substrate — the darkest field. */
  base: '#0A2142',
  /** Mask catching the light, top-left. */
  light: '#153A64',
  /** Mask in shadow, used for the vignette and the 2.5D substrate walls. */
  dark: '#050F1E',
  /** Mask over a ground pour: lighter and a touch warmer than `base`. */
  pour: '#12305628',
  /** Solid form of the pour tint, for shapes that need an opaque fill. */
  pourSolid: '#123056',
  /** Routed trace hint. */
  trace: '#2E639F',
  /** Silkscreen-outlined courtyard boxes around small parts. */
  courtyard: '#8FA6C4',
  /** Exposed FR-4 core on the board edge. */
  core: '#C2A461',
  coreDark: '#8A7238',
  /** Plated through-hole barrel. */
  hole: '#040A14',
  /** Contact shadow where a part meets the board. */
  contactShadow: '#02060C',
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * Silkscreen
 *
 * A real board has exactly ONE silkscreen ink. Hierarchy therefore comes
 * only from size, weight and opacity — never from a second colour. The
 * yellow `ref` tone is the exception the DE2 actually has: its reference
 * designators are printed in a warmer, thinner ink than the brand marks.
 * ──────────────────────────────────────────────────────────────────────── */

export const SILK = {
  /** The ink itself — slightly warm off-white, never pure #FFF. */
  ink: '#E6EBF3',
  /** Brand marks and area headings: full-strength ink. */
  primary: 0.94,
  /** Bank and connector labels. */
  secondary: 0.82,
  /** Fine print: part captions, net names. */
  tertiary: 0.64,
  /** Reference designators, printed thinner on the real board. */
  ref: '#D8BE7C',
  refOpacity: 0.6,
} as const;

export const GOLD = {
  light: '#F0D89A',
  base: '#C9A54E',
  dark: '#8A6E2C',
  /** Gold immersion pad seen edge-on (2.5D header pins). */
  edge: '#6E5620',
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * Metal
 * ──────────────────────────────────────────────────────────────────────── */

export const METAL = {
  /** Bright nickel connector shells: USB, SD shield, RCA barrel. */
  bright: '#D3D8DE',
  mid: '#9BA3AD',
  dark: '#636B76',
  shadow: '#333942',
  /** Machined tact-switch body. */
  tact: '#C2C7CE',
  tactDark: '#7C838C',
  /** The black moulded plunger on a tact switch. */
  plunger: '#191B1F',
  plungerLight: '#31353B',
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * Moulded plastic packages
 * ──────────────────────────────────────────────────────────────────────── */

export const IC = {
  /** Matte epoxy top. */
  top: '#25282E',
  mid: '#1B1E23',
  dark: '#0E1116',
  /** Glossy chamfer around the package edge. */
  bevel: '#3A3F47',
  /** Mould parting line. */
  seam: '#14171B',
  /** Gull-wing leads. */
  pin: '#A6AEB9',
  pinDark: '#5E666F',
  /** Pin-1 orientation dimple. */
  pin1: '#C09A36',
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * Seven-segment displays
 *
 * The DE2's displays have a PALE GREY face — not a dark red one. Unlit
 * segments read as faint grey shapes printed on that face; lit segments are
 * a saturated orange-red. Getting this wrong makes the board look like it
 * uses a cheaper class of part than it does.
 * ──────────────────────────────────────────────────────────────────────── */

export const SEVEN_SEG = {
  /** Package face, lit from the top-left. */
  faceLight: '#DAD8D1',
  face: '#C9C7BF',
  faceDark: '#A9A7A0',
  /** Package side walls (2.5D). */
  side: '#8D8B85',
  /** Unlit segment printed on the grey face. */
  off: '#8E8C85',
  offEdge: '#76746E',
  /** Driven segment. */
  on: '#FF3D1E',
  onCore: '#FFB59B',
  onEdge: '#C41F08',
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * Indicator LEDs
 *
 * Off states are deliberately darker than a real diffused lens so that
 * "which LEDs are driven" is answerable at a glance, which is the whole
 * point of the panel. Hue and the lens rim stay accurate.
 * ──────────────────────────────────────────────────────────────────────── */

export const LED = {
  redOn: '#FF4433',
  redCore: '#FFD5C9',
  redEdge: '#B31C10',
  redOff: '#6B332C',
  redOffDark: '#361511',

  greenOn: '#46E874',
  greenCore: '#D8FFDF',
  greenEdge: '#1E8F3C',
  greenOff: '#2C5A35',
  greenOffDark: '#122A18',

  /** Clear-epoxy lens rim, common to both colours. */
  rim: '#46505E',
  rimLight: '#6B7686',

  /** Blue power-rail indicators (POWER / LOAD / GOOD) — always lit. */
  blueOn: '#5AA8FF',
  blueCore: '#D6EBFF',
  blueEdge: '#1F5FB8',
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * Slide switches
 *
 * IVORY body, BLACK lever — the DE2 way round. Getting this backwards
 * inverts the whole bottom edge of the board.
 * ──────────────────────────────────────────────────────────────────────── */

export const SWITCH = {
  bodyLight: '#EFEBE1',
  body: '#DCD7CB',
  bodyDark: '#B3AEA1',
  /** Body side walls (2.5D). */
  side: '#9A958A',
  /** The recessed channel the lever travels in. */
  channel: '#6B6760',
  /** Moulded black lever. */
  lever: '#1B1D21',
  leverLight: '#43474D',
  leverDark: '#0B0D10',
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * Connectors
 * ──────────────────────────────────────────────────────────────────────── */

/** 3.5 mm audio jack housings, by body style. */
export const JACK: Record<string, string> = {
  'jack-pink': '#E58FB4',
  'jack-blue': '#5EA9DE',
  'jack-green': '#86C765',
  'jack-cream': '#E4DFD2',
};

/** Darker companion for each jack, used for side walls and the barrel. */
export const JACK_DARK: Record<string, string> = {
  'jack-pink': '#A35F7D',
  'jack-blue': '#3C7AA6',
  'jack-green': '#5B9042',
  'jack-cream': '#A8A294',
};

export const CONNECTOR = {
  /** RJ45 / D-sub / header black plastic. */
  plastic: '#171A1F',
  plasticLight: '#2A2F36',
  plasticDark: '#0A0C10',
  /** The dark opening of an outward-facing connector. */
  mouth: '#05080C',
  /** Ethernet link / activity LEDs. */
  linkGreen: '#3E8F4A',
  linkAmber: '#9A5A2A',
} as const;

export const BUTTON_RED = {
  light: '#EF5B4C',
  base: '#C9302A',
  dark: '#7C1712',
} as const;

/* ────────────────────────────────────────────────────────────────────────
 * LCD module
 *
 * A teal-green module PCB, dark metal bezel, pale grey-green STN glass. The
 * DE2 LCD is not simulated, so the glass is drawn unlit and never carries
 * sample text.
 * ──────────────────────────────────────────────────────────────────────── */

export const LCD = {
  /** Module carrier PCB — distinctly teal against the navy mainboard. */
  pcb: '#14584E',
  pcbDark: '#0B3A33',
  bezel: '#1C2027',
  bezelLight: '#31373F',
  glass: '#9DAE88',
  glassLight: '#B2C09E',
  glassDark: '#7C8C6B',
  /** Faint character cells on the unlit panel. */
  cell: '#78886699',
} as const;

/** Passive chip components (resistor networks, capacitors). */
export const PASSIVE = {
  body: '#23262B',
  bodyLight: '#33373E',
  /** Metallised terminations. */
  cap: '#A9B0BA',
  /** Tantalum capacitor body — the DE2's are violet. */
  tantalum: '#6E5A96',
  tantalumLight: '#8C78B4',
  tantalumDark: '#463962',
  /** Electrolytic can top. */
  canTop: '#4A4F58',
  canRing: '#2B2F36',
} as const;
