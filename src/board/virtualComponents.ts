/**
 * Parsing of the `virtualComponent` strings that connect a design's ports to
 * DE2 hardware.
 *
 * A pin mapping carries a string like `SW[3]`, `LEDR12`, `HEX0[6]`, `HEX0` or
 * `CLOCK_50`. Those come from two places — the physical-pin dictionary and
 * `autoMapPort` — and they arrive in several spellings. Before this module,
 * every consumer re-derived them with its own inline regex and its own
 * `parseInt(a || b || '0')` fallback, which is how a bus-level name ended up
 * being read as "bit 0" instead of "the whole bus".
 *
 * Nothing here touches the simulator. It turns a string into a target.
 */

export type VirtualFamily = 'SW' | 'KEY' | 'LEDR' | 'LEDG' | 'HEX' | 'CLOCK_50';

/** How many of each part the DE2 has. The board is fixed; these are not options. */
export const DE2_FAMILY_WIDTH: Record<Exclude<VirtualFamily, 'HEX' | 'CLOCK_50'>, number> = {
  SW: 18,
  KEY: 4,
  LEDR: 18,
  LEDG: 9,
};

/** A DE2 seven-segment display has seven segments, A..G. */
export const HEX_SEGMENTS = 7;

export type VirtualTarget =
  | { family: 'CLOCK_50' }
  /** One member of a bank: `SW[3]`, `LEDR12`. */
  | { family: 'SW' | 'KEY' | 'LEDR' | 'LEDG'; index: number }
  /** A whole bank driven by one vector port: `SW`, `LEDR`. */
  | { family: 'SW' | 'KEY' | 'LEDR' | 'LEDG'; index: null }
  /** One segment of one display: `HEX0[6]`. */
  | { family: 'HEX'; display: number; segment: number }
  /** A whole display driven by one 7-bit vector port: `HEX0`. */
  | { family: 'HEX'; display: number; segment: null };

/**
 * Parses a `virtualComponent` string.
 *
 * Recognised, in this order — most specific first, so a bank name can never
 * swallow an indexed one:
 *
 *   CLOCK_50
 *   HEX0[6]   HEX0_6    one segment
 *   HEX0                 a whole display, from a `[6:0]` port
 *   SW[3]     SW3        one bank member
 *   SW                   a whole bank, from a `[17:0]` port
 *
 * Returns null for anything else — including LCD signals, which are resolved
 * by their own module and must not be reinterpreted here.
 */
export function parseVirtualComponent(raw: string | null | undefined): VirtualTarget | null {
  if (!raw) return null;
  const name = raw.trim().toUpperCase();

  if (name === 'CLOCK_50') return { family: 'CLOCK_50' };

  // Never let an LCD signal be read as an LED or a switch: `LCD_DATA[3]`
  // contains no family prefix, but being explicit here documents the boundary.
  if (name.startsWith('LCD')) return null;

  const hexSeg = /^HEX(\d+)(?:\[(\d+)\]|_(\d+))$/.exec(name);
  if (hexSeg) {
    return {
      family: 'HEX',
      display: Number(hexSeg[1]),
      segment: Number(hexSeg[2] ?? hexSeg[3]),
    };
  }

  const hexBus = /^HEX(\d+)$/.exec(name);
  if (hexBus) return { family: 'HEX', display: Number(hexBus[1]), segment: null };

  const member = /^(SW|KEY|LEDR|LEDG)(?:\[(\d+)\]|_?(\d+))$/.exec(name);
  if (member) {
    return {
      family: member[1] as 'SW' | 'KEY' | 'LEDR' | 'LEDG',
      index: Number(member[2] ?? member[3]),
    };
  }

  const bank = /^(SW|KEY|LEDR|LEDG)$/.exec(name);
  if (bank) {
    return { family: bank[1] as 'SW' | 'KEY' | 'LEDR' | 'LEDG', index: null };
  }

  return null;
}

/**
 * The per-pin signal names a target covers, paired with the board index each
 * one drives.
 *
 * A bank-level target expands to one entry per bit, which is what lets a
 * single `output [6:0] HEX0` populate all seven segments. `width` is the
 * declared width of the port, so a scalar port that happens to be called `SW`
 * resolves to one switch rather than to eighteen.
 */
export function expandTarget(
  target: VirtualTarget,
  portName: string,
  width: number,
): Array<{ signal: string; index: number }> {
  if (target.family === 'CLOCK_50') return [{ signal: portName, index: 0 }];

  if (target.family === 'HEX') {
    if (target.segment !== null) return [{ signal: portName, index: target.segment }];
    const bits = Math.min(Math.max(width, 1), HEX_SEGMENTS);
    if (bits <= 1) return [{ signal: portName, index: 0 }];
    return Array.from({ length: bits }, (_, bit) => ({
      signal: `${portName}[${bit}]`,
      index: bit,
    }));
  }

  if (target.index !== null) return [{ signal: portName, index: target.index }];

  const bits = Math.min(Math.max(width, 1), DE2_FAMILY_WIDTH[target.family]);
  if (bits <= 1) return [{ signal: portName, index: 0 }];
  return Array.from({ length: bits }, (_, bit) => ({
    signal: `${portName}[${bit}]`,
    index: bit,
  }));
}
