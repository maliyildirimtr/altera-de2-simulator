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
 *   RS=1 RW=0   data write to DDRAM (or CGRAM, see the limitation below)
 *   RW=1        read — NOT IMPLEMENTED, see `lcdStep`
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
  const next = state.increment ? address + 1 : address - 1;
  if (next < 0) return DDRAM_SIZE - 1;
  if (next >= DDRAM_SIZE) return 0;
  return next;
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
  if (byte & 0x80) return { ...touched, address: byte & 0x7f };

  // Set CGRAM address — 01aa aaaa. Accepted so a design that defines custom
  // glyphs does not desync, but custom glyphs are not rendered; see the
  // limitation note on `lcdStep`.
  if (byte & 0x40) return touched;

  // Function set — 001D NF**. N selects two-line mode.
  if (byte & 0x20) return { ...touched, twoLine: (byte & 0x08) !== 0 };

  // Cursor or display shift — 0001 SR**. Accepted; shifting the visible
  // window is not modelled, which only affects designs that scroll.
  if (byte & 0x10) return touched;

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

  // Return home — 0000 001*. Cursor to 0; DDRAM contents untouched.
  if (byte & 0x02) return { ...touched, address: 0 };

  // Clear display — 0000 0001. DDRAM to spaces AND cursor home, and entry
  // mode back to increment: a design that clears and then writes without
  // setting an address expects to land at (0,0) and move right.
  if (byte & 0x01) {
    return {
      ...touched,
      ddram: new Array(DDRAM_SIZE).fill(0x20),
      address: 0,
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

  // Data write: store the character and step the address counter.
  const ddram = [...levels.ddram];
  ddram[levels.address & 0x7f] = byte;
  return {
    ...levels,
    ddram,
    address: advance(levels, levels.address & 0x7f),
    initialised: true,
  };
}

/**
 * The two visible lines, each exactly 16 characters.
 *
 * Bytes outside printable ASCII render as spaces rather than as mojibake: the
 * HD44780 character ROM is not ASCII above 0x7f, and inventing glyphs for it
 * would be showing the user something the hardware would not show.
 */
export function lcdLines(state: LcdState): [string, string] {
  const line = (row: number): string => {
    if (!state.displayOn) return ' '.repeat(LCD_COLS);
    let out = '';
    for (let col = 0; col < LCD_COLS; col += 1) {
      const byte = state.ddram[(LCD_ROW_BASE[row] + col) & 0x7f] ?? 0x20;
      out += byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : ' ';
    }
    return out;
  };
  return [line(0), line(1)];
}

/** Cursor position as {row, col}, or null when it is off-screen or disabled. */
export function lcdCursor(state: LcdState): { row: number; col: number } | null {
  if (!state.displayOn || !state.cursorOn) return null;
  const addr = state.address & 0x7f;
  for (let row = 0; row < LCD_ROWS; row += 1) {
    const base = LCD_ROW_BASE[row];
    if (addr >= base && addr < base + LCD_COLS) return { row, col: addr - base };
  }
  return null;
}

/** Whether the panel should render as a live display at all. */
export function lcdIsVisible(state: LcdState): boolean {
  return state.powered && state.displayOn;
}
