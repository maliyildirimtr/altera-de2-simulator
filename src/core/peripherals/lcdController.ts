/**
 * HD44780-compatible character-LCD controller for the DE2's 16 x 2 module.
 *
 * ── Scope ─────────────────────────────────────────────────────────────────
 * This is a FUNCTIONAL emulator, not an analogue-timing one. It has no notion
 * of nanoseconds, no busy flag delay and no internal oscillator: real HD44780
 * timing matters when you are writing the driver, and classroom DE2 designs
 * that get their delays wrong fail on hardware rather than here. What it does
 * model correctly is the command set and the memory behaviour those designs
 * depend on — which is what decides whether "HELLO" appears in the right place.
 *
 * ── Why it is a pure module ───────────────────────────────────────────────
 * Nothing here imports React or the store. State goes in, state comes out, and
 * the only way to change it is to hand it a bus transaction. That makes the
 * decoder independently unit-testable, keeps a second copy of simulator truth
 * out of the component tree, and means the renderer can be given nothing but
 * two 16-character strings.
 *
 * ── The bus ───────────────────────────────────────────────────────────────
 * Transactions latch on the FALLING edge of LCD_EN, which is the HD44780's
 * documented behaviour and what the Terasic DE2 reference designs drive. The
 * caller samples RS / RW / DATA and calls `lcdStep` on every simulation tick;
 * this module watches EN itself and acts only on the edge, so a design holding
 * EN high across several ticks writes one character, not several.
 *
 *   RS=0 RW=0   instruction write
 *   RS=1 RW=0   data write to DDRAM or CGRAM (whichever was addressed last)
 *   RW=1        read — NOT IMPLEMENTED, see `lcdStep`
 *
 * Custom characters (CGRAM, codes 0-7), display and cursor shift and the
 * entry mode's shift-on-write are modelled, so scrolling text and
 * user-defined glyphs look the way they do on the board.
 */

/** The DE2 module is 16 x 2. Not configurable — it is a physical part. */
export const LCD_COLS = 16;
export const LCD_ROWS = 2;

/**
 * DDRAM base address of each display line. This mapping is the single most
 * common source of "why is my text in the wrong place": on a 16 x 2 module the
 * second line does NOT continue from the first, it starts at 0x40.
 */
export const LCD_ROW_BASE = [0x00, 0x40] as const;

/** DDRAM is 80 bytes; a 16 x 2 module shows a 16-byte window of each row. */
const DDRAM_SIZE = 0x80;

/** In two-line mode each line holds 40 characters; display shift rotates within them. */
export const LCD_LINE_LENGTH = 40;

/** CGRAM: eight 5 x 8 user glyphs, one byte per pixel row (low 5 bits used). */
export const CGRAM_SIZE = 64;

/** Private-use code points `lcdLines` returns for CGRAM characters 0-7. */
export const LCD_CUSTOM_BASE = 0xe000;

/**
 * The few characters above 0x7e the HD44780 A00 ROM has that classroom
 * designs actually use. Everything else outside ASCII still renders as a space.
 */
const ROM_EXTRAS: Readonly<Record<number, string>> = {
  0x7f: '\u2190', // left arrow
  0xdf: '\u00b0', // degree
  0xe4: '\u00b5', // micro
  0xf4: '\u03a9', // ohm
  0xf7: '\u03c0', // pi
  0xff: '\u2588', // full block
};

export interface LcdBusSignals {
  /** Register select: 0 = instruction, 1 = data. */
  rs: number;
  /** Read/write: 0 = write, 1 = read. */
  rw: number;
  /** Enable. Transactions latch on its falling edge. */
  en: number;
  /** DATA[7:0], already assembled into a byte by the caller. */
  data: number;
  /** Module power. 0 blanks the panel. */
  on: number;
  /** Backlight. */
  blon: number;
}

export interface LcdState {
  /** Display data RAM. 0x20 (space) when clear, as on a real controller. */
  ddram: readonly number[];
  /** Address counter — where the next data write lands. */
  address: number;
  /** User glyph RAM; see CGRAM_SIZE. */
  cgram: readonly number[];
  /** CGRAM address counter, used while `target` is 'cg'. */
  cgAddress: number;
  /** Which RAM data writes go to: the last "set address" command decides. */
  target: 'dd' | 'cg';
  /** Display shift in characters (0..39): how far the visible window has scrolled left. */
  shift: number;
  /** Set by "display on/off control": 0 blanks the characters, keeps the RAM. */
  displayOn: boolean;
  cursorOn: boolean;
  blinkOn: boolean;
  /** Entry mode: whether the address counter increments or decrements. */
  increment: boolean;
  shiftOnWrite: boolean;
  /** Two-line mode, from "function set". The DE2 module is always used in it. */
  twoLine: boolean;
  /** LCD_ON / LCD_BLON, as last sampled. */
  powered: boolean;
  backlight: boolean;
  /** Previous EN level, so the falling edge can be detected. */
  prevEn: number;
  /**
   * Set once the design performs any write. Until then the panel is blank
   * because nothing has driven it — never because we are hiding something.
   */
  initialised: boolean;
  /**
   * Count of transactions this controller ignored because RW was high.
   * Surfaced rather than swallowed: a design that depends on reading back the
   * busy flag will show a non-zero count here instead of silently misbehaving.
   */
  unsupportedReads: number;
}

/** A blank controller: spaces in DDRAM, cursor home, display off until driven. */
export function createLcdState(): LcdState {
  return {
    ddram: new Array(DDRAM_SIZE).fill(0x20),
    address: 0,
    cgram: new Array(CGRAM_SIZE).fill(0),
    cgAddress: 0,
    target: 'dd',
    shift: 0,
    displayOn: false,
    cursorOn: false,
    blinkOn: false,
    increment: true,
    shiftOnWrite: false,
    twoLine: true,
    powered: false,
    backlight: false,
    prevEn: 0,
    initialised: false,
    unsupportedReads: 0,
  };
}

/** Board reset: back to a blank panel with the cursor home. */
export function resetLcdState(): LcdState {
  return createLcdState();
}

/**
 * Advances the address counter the way the HD44780 does: it wraps within
 * DDRAM rather than running off the end.
 */
function advance(state: LcdState, address: number): number {
  return step(address, state.increment);
}

function step(address: number, forward: boolean): number {
  const next = forward ? address + 1 : address - 1;
  if (next < 0) return DDRAM_SIZE - 1;
  if (next >= DDRAM_SIZE) return 0;
  return next;
}

function shiftBy(shift: number, by: number): number {
  return (((shift + by) % LCD_LINE_LENGTH) + LCD_LINE_LENGTH) % LCD_LINE_LENGTH;
}

/** DDRAM address shown at a visible row/column, taking the display shift into account. */
export function lcdCellAddress(state: LcdState, row: number, col: number): number {
  return LCD_ROW_BASE[row] + ((col + state.shift) % LCD_LINE_LENGTH);
}

/**
 * Decodes one instruction write. Ordered most-significant bit first, which is
 * how the HD44780 itself discriminates: the commands form a prefix code, so
 * testing 0x80 before 0x40 before 0x20 and so on is not an optimisation, it is
 * the only correct order.
 */
function applyInstruction(state: LcdState, byte: number): LcdState {
  const touched = { ...state, initialised: true };

  // Set DDRAM address — 1aaa aaaa
  if (byte & 0x80) return { ...touched, address: byte & 0x7f, target: 'dd' };

  // Set CGRAM address — 01aa aaaa. Following data writes define glyph rows.
  if (byte & 0x40) return { ...touched, cgAddress: byte & 0x3f, target: 'cg' };

  // Function set — 001D NF**. N selects two-line mode.
  if (byte & 0x20) return { ...touched, twoLine: (byte & 0x08) !== 0 };

  // Cursor or display shift — 0001 SR**. S=1 scrolls the whole display,
  // S=0 moves only the cursor; R picks the direction.
  if (byte & 0x10) {
    const right = (byte & 0x04) !== 0;
    if (byte & 0x08) return { ...touched, shift: shiftBy(touched.shift, right ? -1 : 1) };
    return { ...touched, target: 'dd', address: step(touched.address, right) };
  }

  // Display on/off control — 0000 1DCB
  if (byte & 0x08) {
    return {
      ...touched,
      displayOn: (byte & 0x04) !== 0,
      cursorOn: (byte & 0x02) !== 0,
      blinkOn: (byte & 0x01) !== 0,
    };
  }

  // Entry mode set — 0000 01IS
  if (byte & 0x04) {
    return {
      ...touched,
      increment: (byte & 0x02) !== 0,
      shiftOnWrite: (byte & 0x01) !== 0,
    };
  }

  // Return home — 0000 001*. Cursor to 0 and the display unshifted; DDRAM untouched.
  if (byte & 0x02) return { ...touched, address: 0, shift: 0, target: 'dd' };

  // Clear display — 0000 0001. DDRAM to spaces AND cursor home, and entry
  // mode back to increment: a design that clears and then writes without
  // setting an address expects to land at (0,0) and move right.
  if (byte & 0x01) {
    return {
      ...touched,
      ddram: new Array(DDRAM_SIZE).fill(0x20),
      address: 0,
      shift: 0,
      target: 'dd',
      increment: true,
    };
  }

  // 0x00 is not a command.
  return state;
}

/**
 * Feeds one simulation tick's worth of bus signals to the controller.
 *
 * Returns the new state, or the SAME OBJECT when nothing happened — callers
 * can use identity to skip a store update on the overwhelming majority of
 * ticks, where EN has not moved.
 *
 * Reads (RW=1) are counted and otherwise ignored. Implementing them properly
 * means driving the data bus back into the compiled design, which is a
 * bidirectional-bus change to the engine rather than an LCD change; the write
 * path is what classroom HD44780 examples use, and faking a read would be
 * worse than not having one.
 */
export function lcdStep(state: LcdState, bus: LcdBusSignals): LcdState {
  const en = bus.en ? 1 : 0;
  const powered = bus.on !== 0;
  const backlight = bus.blon !== 0;

  const falling = state.prevEn === 1 && en === 0;

  // Power and backlight are level-sensitive, not edge-latched.
  const levels =
    powered !== state.powered || backlight !== state.backlight || en !== state.prevEn
      ? { ...state, powered, backlight, prevEn: en }
      : state;

  if (!falling) return levels;

  if (bus.rw !== 0) {
    return { ...levels, unsupportedReads: levels.unsupportedReads + 1 };
  }

  const byte = bus.data & 0xff;

  if (bus.rs === 0) return applyInstruction(levels, byte);

  if (levels.target === 'cg') {
    const cgram = [...levels.cgram];
    cgram[levels.cgAddress & 0x3f] = byte & 0x1f;
    const next = levels.increment ? levels.cgAddress + 1 : levels.cgAddress - 1;
    return { ...levels, cgram, cgAddress: (next + CGRAM_SIZE) % CGRAM_SIZE, initialised: true };
  }

  // Data write: store the character and step the address counter; with
  // shift-on-write the display follows the cursor instead.
  const ddram = [...levels.ddram];
  ddram[levels.address & 0x7f] = byte;
  return {
    ...levels,
    ddram,
    address: advance(levels, levels.address & 0x7f),
    shift: levels.shiftOnWrite ? shiftBy(levels.shift, levels.increment ? 1 : -1) : levels.shift,
    initialised: true,
  };
}

/** Character a DDRAM byte shows as: ASCII, a CGRAM private-use code, a ROM extra, or a space. */
export function lcdCharFor(byte: number): string {
  if (byte < 0x10) return String.fromCharCode(LCD_CUSTOM_BASE + (byte & 0x07));
  if (byte >= 0x20 && byte <= 0x7e) return String.fromCharCode(byte);
  return ROM_EXTRAS[byte] ?? ' ';
}

/** The eight CGRAM glyphs as rows of '0'/'1' strings (5 wide, 8 tall). */
export function lcdCustomGlyphs(cgram: readonly number[]): string[][] {
  return Array.from({ length: 8 }, (_, g) =>
    Array.from({ length: 8 }, (_, r) => (cgram[g * 8 + r] ?? 0).toString(2).padStart(5, '0').slice(-5)),
  );
}

/**
 * The two visible lines, each exactly 16 characters.
 *
 * Codes 0-15 are the CGRAM glyphs, returned as private-use characters
 * (LCD_CUSTOM_BASE + n) that the dot-matrix renderer draws from CGRAM. A few
 * ROM symbols above 0x7e are mapped (see ROM_EXTRAS); the rest render as
 * spaces rather than mojibake.
 */
export function lcdLines(state: LcdState): [string, string] {
  const line = (row: number): string => {
    if (!state.displayOn) return ' '.repeat(LCD_COLS);
    let out = '';
    for (let col = 0; col < LCD_COLS; col += 1) {
      const byte = state.ddram[lcdCellAddress(state, row, col) & 0x7f] ?? 0x20;
      out += lcdCharFor(byte);
    }
    return out;
  };
  return [line(0), line(1)];
}

/** Cursor position as {row, col}, or null when it is off-screen or disabled. */
export function lcdCursor(state: LcdState): { row: number; col: number } | null {
  if (!state.displayOn || (!state.cursorOn && !state.blinkOn)) return null;
  if (state.target === 'cg') return null;
  const addr = state.address & 0x7f;
  for (let row = 0; row < LCD_ROWS; row += 1) {
    const base = LCD_ROW_BASE[row];
    if (addr < base || addr >= base + LCD_LINE_LENGTH) continue;
    const col = (addr - base - state.shift + LCD_LINE_LENGTH) % LCD_LINE_LENGTH;
    if (col < LCD_COLS) return { row, col };
  }
  return null;
}

/** Whether the panel should render as a live display at all. */
export function lcdIsVisible(state: LcdState): boolean {
  return state.powered && state.displayOn;
}
