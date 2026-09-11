/**
 * Platform identity constants.
 *
 * Change PLATFORM_NAME here and it propagates to every component that imports it.
 * The final product name has not been decided — keep this as the single source.
 */
export const PLATFORM_NAME = 'Engineering Lab';

/** Short form for compact contexts (mobile nav, meta tags, etc.) */
export const PLATFORM_SHORT = 'EngLab';

/** Hero tagline shown on the landing page */
export const PLATFORM_TAGLINE = 'Design. Simulate. Understand.';

/** Sub-tagline / descriptor */
export const PLATFORM_DESCRIPTOR =
  'Engineering tools for learning and simulation';

export const PLATFORM_DOMAIN = 'lab.maliyildirimtr.com';
export const PLATFORM_URL = 'https://lab.maliyildirimtr.com';
export const PLATFORM_PUBLIC_URL = 'https://lab.maliyildirimtr.com';

export const PLATFORM_TOOLS = [
  { id: 'de2', name: 'DE2 Simulator', path: '/de2-simulator' },
  { id: 'waveform', name: 'Waveform', path: '/waveform' },
  { id: 'schematic', name: 'Schematic', path: '/schematic' },
  { id: 'examples', name: 'Examples', path: '/examples' }
];

export const ENGINEERING_AREAS = [
  { id: 'digital-logic', name: 'Digital Logic', path: '/digital-logic', active: true },
  { id: 'fpga', name: 'FPGA', path: '/fpga', active: true },
  { id: 'circuit-analysis', name: 'Circuit Analysis', path: '/circuit-analysis', active: false },
  { id: 'signals', name: 'Signals', path: '/signals', active: false },
  { id: 'microcontrollers', name: 'Microcontrollers', path: '/microcontrollers', active: false },
  { id: 'electronics', name: 'Electronics', path: '/electronics', active: false }
];
