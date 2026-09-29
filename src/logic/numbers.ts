/**
 * Number systems helper: parsing and converting between bases, two's
 * complement, and the step-by-step working a student would write down.
 * Pure functions on BigInt so 32-bit values need no special care.
 */

export type Base = 2 | 8 | 10 | 16;
export const BASES: Base[] = [2, 8, 10, 16];
export const WIDTHS = [4, 8, 16, 32] as const;

const DIGITS = '0123456789ABCDEF';

export interface Parsed {
  /** The number as typed (may be negative in base 10). */
  value: bigint;
  error: 'empty' | 'digit' | null;
}

/** Reads text in a base. Spaces, underscores and 0b/0o/0x prefixes are ignored; base 10 may be negative. */
export function parseIn(text: string, base: Base): Parsed {
  let t = text.trim().replace(/[\s_]/g, '').toUpperCase();
  let neg = false;
  if (base === 10 && t.startsWith('-')) {
    neg = true;
    t = t.slice(1);
  }
  if ((base === 2 && t.startsWith('0B')) || (base === 8 && t.startsWith('0O')) || (base === 16 && t.startsWith('0X'))) t = t.slice(2);
  if (!t) return { value: 0n, error: 'empty' };
  let v = 0n;
  for (const ch of t) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return { value: 0n, error: 'digit' };
    v = v * BigInt(base) + BigInt(d);
  }
  return { value: neg ? -v : v, error: null };
}

export function toBase(v: bigint, base: Base): string {
  if (v === 0n) return '0';
  let n = v < 0n ? -v : v;
  let out = '';
  while (n > 0n) {
    out = DIGITS[Number(n % BigInt(base))] + out;
    n /= BigInt(base);
  }
  return (v < 0n ? '-' : '') + out;
}

/** Groups digits from the right: 1011 0110. */
export function group(s: string, size: number): string {
  const out: string[] = [];
  for (let i = s.length; i > 0; i -= size) out.unshift(s.slice(Math.max(0, i - size), i));
  return out.join(' ');
}

export interface Analysis {
  /** Bit pattern that the value occupies in `width` bits (two's complement if negative). */
  bits: bigint;
  width: number;
  unsigned: bigint;
  signed: bigint;
  /** The typed value does not fit in the width (unsigned or signed range). */
  overflow: boolean;
  min: bigint;
  max: bigint;
  umax: bigint;
}

export function analyze(value: bigint, width: number): Analysis {
  const mod = 1n << BigInt(width);
  const umax = mod - 1n;
  const min = -(mod >> 1n);
  const max = (mod >> 1n) - 1n;
  const bits = ((value % mod) + mod) % mod;
  const signed = bits > max ? bits - mod : bits;
  const overflow = value < min || value > umax;
  return { bits, width, unsigned: bits, signed, overflow, min, max, umax };
}

export function binary(bits: bigint, width: number): string {
  return toBase(bits, 2).padStart(width, '0');
}

/** Decimal → binary by repeated division: [dividend, quotient, remainder] rows. */
export function divisionSteps(v: bigint, base: Base = 2, limit = 40): Array<[bigint, bigint, number]> {
  const rows: Array<[bigint, bigint, number]> = [];
  let n = v < 0n ? -v : v;
  if (n === 0n) return [[0n, 0n, 0]];
  while (n > 0n && rows.length < limit) {
    rows.push([n, n / BigInt(base), Number(n % BigInt(base))]);
    n /= BigInt(base);
  }
  return rows;
}

/** Positional expansion of a bit pattern: terms (bit, power) for each 1 bit. */
export function positionalTerms(bits: bigint, width: number): Array<{ power: number; weight: bigint }> {
  const terms: Array<{ power: number; weight: bigint }> = [];
  for (let i = width - 1; i >= 0; i--) if ((bits >> BigInt(i)) & 1n) terms.push({ power: i, weight: 1n << BigInt(i) });
  return terms;
}

/** Two's complement of a magnitude: [magnitude bits, inverted, +1]. */
export function twosComplementSteps(magnitude: bigint, width: number): { plain: string; inverted: string; result: string } {
  const mod = 1n << BigInt(width);
  const plain = ((magnitude % mod) + mod) % mod;
  const inverted = (mod - 1n) ^ plain;
  const result = (inverted + 1n) % mod;
  return { plain: binary(plain, width), inverted: binary(inverted, width), result: binary(result, width) };
}
