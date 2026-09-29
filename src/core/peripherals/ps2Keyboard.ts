/**
 * PS/2 keyboard on the DE2's PS2_CLK / PS2_DAT pins.
 *
 * Keys become scan codes (set 2, the codes a real keyboard sends: make code on
 * press, F0 + code on release, E0 before extended keys) and each byte is sent
 * the way a keyboard sends it: start bit 0, eight data bits LSB first, odd
 * parity, stop bit 1. The keyboard drives both lines; data changes while the
 * clock is high and is read by the host on the falling clock edge.
 *
 * The line clock is slowed to `half` board clock cycles per half period, so a
 * design that synchronises and filters PS2_CLK with CLOCK_50 sees clean edges.
 * Pure and deterministic: `ps2Tick` advances one board clock cycle.
 */

export interface Ps2State {
  /** Bytes still to send, oldest first. */
  queue: number[];
  /** Bit frame being sent (11 bits), or null when idle. */
  frame: number[] | null;
  /** Position inside the current frame, in half periods. */
  phase: number;
  /** Cycles left in the current half period. */
  left: number;
  /** Board clock cycles per half period of PS2_CLK. */
  half: number;
  /** Idle half periods still to wait before the next byte. */
  gap: number;
  clk: number;
  dat: number;
  /** Every byte sent so far (newest last, bounded), for the panel. */
  sent: number[];
}

export const PS2_HALF_OPTIONS = [4, 16, 64] as const;

export function createPs2(half = 16): Ps2State {
  return { queue: [], frame: null, phase: 0, left: 0, half, gap: 0, clk: 1, dat: 1, sent: [] };
}

/** The 11-bit frame for a byte: start, data LSB first, odd parity, stop. */
export function ps2Frame(byte: number): number[] {
  const bits = Array.from({ length: 8 }, (_, i) => (byte >> i) & 1);
  const ones = bits.reduce((s, b) => s + b, 0);
  return [0, ...bits, ones % 2 === 0 ? 1 : 0, 1];
}

/** Board clock cycles needed to send `bytes` bytes, including the gaps. */
export function ps2Cycles(bytes: number, half: number): number {
  return bytes * (22 + 4) * half + 4 * half;
}

export function ps2Enqueue(s: Ps2State, bytes: number[]): void {
  s.queue.push(...bytes.map((b) => b & 0xff));
}

/** Advance one board clock cycle; returns the line levels for this cycle. */
export function ps2Tick(s: Ps2State): { clk: number; dat: number } {
  if (!s.frame) {
    if (s.gap > 0) {
      s.left -= 1;
      if (s.left <= 0) {
        s.gap -= 1;
        s.left = s.half;
      }
    } else if (s.queue.length) {
      const byte = s.queue.shift()!;
      s.frame = ps2Frame(byte);
      s.sent = [...s.sent.slice(-63), byte];
      s.phase = 0;
      s.left = s.half;
    }
    if (!s.frame) {
      s.clk = 1;
      s.dat = 1;
      return { clk: 1, dat: 1 };
    }
  }
  // Even half periods: clock high, data set up. Odd: clock low (host samples).
  const bit = s.frame[Math.floor(s.phase / 2)];
  s.dat = bit;
  s.clk = s.phase % 2 === 0 ? 1 : 0;
  const out = { clk: s.clk, dat: s.dat };
  s.left -= 1;
  if (s.left <= 0) {
    s.phase += 1;
    s.left = s.half;
    if (s.phase >= 22) {
      s.frame = null;
      s.gap = 4;
    }
  }
  return out;
}

/* ── Scan codes, set 2 ──────────────────────────────────────────────── */

const CODES: Record<string, number> = {
  KeyA: 0x1c, KeyB: 0x32, KeyC: 0x21, KeyD: 0x23, KeyE: 0x24, KeyF: 0x2b, KeyG: 0x34, KeyH: 0x33,
  KeyI: 0x43, KeyJ: 0x3b, KeyK: 0x42, KeyL: 0x4b, KeyM: 0x3a, KeyN: 0x31, KeyO: 0x44, KeyP: 0x4d,
  KeyQ: 0x15, KeyR: 0x2d, KeyS: 0x1b, KeyT: 0x2c, KeyU: 0x3c, KeyV: 0x2a, KeyW: 0x1d, KeyX: 0x22,
  KeyY: 0x35, KeyZ: 0x1a,
  Digit0: 0x45, Digit1: 0x16, Digit2: 0x1e, Digit3: 0x26, Digit4: 0x25, Digit5: 0x2e, Digit6: 0x36,
  Digit7: 0x3d, Digit8: 0x3e, Digit9: 0x46,
  Backquote: 0x0e, Minus: 0x4e, Equal: 0x55, Backslash: 0x5d, BracketLeft: 0x54, BracketRight: 0x5b,
  Semicolon: 0x4c, Quote: 0x52, Comma: 0x41, Period: 0x49, Slash: 0x4a,
  Space: 0x29, Enter: 0x5a, Backspace: 0x66, Tab: 0x0d, Escape: 0x76, CapsLock: 0x58,
  ShiftLeft: 0x12, ShiftRight: 0x59, ControlLeft: 0x14, AltLeft: 0x11,
  F1: 0x05, F2: 0x06, F3: 0x04, F4: 0x0c, F5: 0x03, F6: 0x0b, F7: 0x83, F8: 0x0a,
  F9: 0x01, F10: 0x09, F11: 0x78, F12: 0x07,
  Numpad0: 0x70, Numpad1: 0x69, Numpad2: 0x72, Numpad3: 0x7a, Numpad4: 0x6b, Numpad5: 0x73,
  Numpad6: 0x74, Numpad7: 0x6c, Numpad8: 0x75, Numpad9: 0x7d, NumpadAdd: 0x79, NumpadSubtract: 0x7b,
  NumpadMultiply: 0x7c, NumpadDecimal: 0x71,
};
/** Keys sent with an E0 prefix. */
const EXTENDED: Record<string, number> = {
  ArrowUp: 0x75, ArrowDown: 0x72, ArrowLeft: 0x6b, ArrowRight: 0x74,
  ControlRight: 0x14, AltRight: 0x11, Home: 0x6c, End: 0x69, PageUp: 0x7d, PageDown: 0x7a,
  Insert: 0x70, Delete: 0x71, NumpadEnter: 0x5a, NumpadDivide: 0x4a,
};

/** Scan code bytes for pressing (make) or releasing (break) a key, by `KeyboardEvent.code`. */
export function scanCodes(code: string, release: boolean): number[] | null {
  if (code in CODES) return release ? [0xf0, CODES[code]] : [CODES[code]];
  if (code in EXTENDED) return release ? [0xe0, 0xf0, EXTENDED[code]] : [0xe0, EXTENDED[code]];
  return null;
}

/** Make + break codes for tapping one key. */
export function tapCodes(code: string): number[] | null {
  const make = scanCodes(code, false);
  const brk = scanCodes(code, true);
  return make && brk ? [...make, ...brk] : null;
}

export const hexByte = (b: number) => b.toString(16).toUpperCase().padStart(2, '0');
