/**
 * A VGA monitor for the DE2's VGA_R/G/B, VGA_HS, VGA_VS (and VGA_BLANK) pins.
 *
 * Like a real monitor it knows nothing about the design: it samples the pins
 * once per board clock cycle, starts a new line at every falling edge of HS
 * (sync pulses are active low) and a new frame at every falling edge of VS.
 * The picture is kept in raw sample coordinates measured from the sync edges,
 * so porches and sync pulses show as black borders. When a frame matches the
 * standard 640x480 at 60 Hz timing (800 x 525, or 1600 samples per line at
 * CLOCK_50 with a 25 MHz pixel clock) the visible area is cut out; a design
 * that drives VGA_BLANK (active low) is cut to its own visible area instead.
 */

export interface VgaSample {
  hs: number;
  vs: number;
  r: number;
  g: number;
  b: number;
  /** VGA_BLANK level, or null when the design does not drive it. */
  blank: number | null;
}

export interface VgaFrame {
  width: number;
  height: number;
  /** RGBA pixels, width * height * 4. */
  pixels: Uint8ClampedArray;
  /** Measured timing, in board clock cycles. */
  lineCycles: number;
  lines: number;
  /** Samples per pixel (2 for a 25 MHz pixel clock at CLOCK_50). */
  divider: number;
  /** How the visible area was found. */
  crop: 'standard' | 'blank' | 'raw';
}

export const VGA_MAX_W = 2048;
export const VGA_MAX_H = 1024;

export interface VgaMonitor {
  /** Samples of the current line, as packed RGB (-1 = blanked). */
  line: number[];
  /** Lines of the current frame. */
  rows: number[][];
  prevHs: number;
  prevVs: number;
  /** Line length (samples) of the last complete line. */
  lastLine: number;
  /** Completed frames since reset. */
  frames: number;
  /** The last complete frame, and the frame still being drawn. */
  frame: VgaFrame | null;
  /** Bumped on every change a viewer should repaint for. */
  version: number;
  /** True once any VGA pin was seen. */
  seen: boolean;
  hasBlank: boolean;
  /** Colour depth of the RGB ports (the DE2 has 10 bits per colour). */
  bits: number;
  /** False until the first horizontal sync: samples before it are not a whole line. */
  lineSynced: boolean;
}

export function createVgaMonitor(): VgaMonitor {
  return { line: [], rows: [], prevHs: 1, prevVs: 1, lastLine: 0, frames: 0, frame: null, version: 0, seen: false, hasBlank: false, bits: 10, lineSynced: false };
}

const scale = (v: number, bits: number) => {
  const max = bits >= 31 ? 0xffffffff : (1 << bits) - 1;
  return Math.max(0, Math.min(255, Math.round(((v >>> 0) & max) * 255 / max)));
};

/** Feed one board clock cycle's pin levels. */
export function vgaSample(m: VgaMonitor, s: VgaSample): void {
  m.seen = true;
  if (s.blank !== null) m.hasBlank = true;
  const blanked = s.blank !== null && s.blank === 0;
  if (m.lineSynced && m.line.length < VGA_MAX_W * 2) {
    m.line.push(blanked ? -1 : (scale(s.r, m.bits) << 16) | (scale(s.g, m.bits) << 8) | scale(s.b, m.bits));
  }
  const hsFell = m.prevHs === 1 && s.hs === 0;
  const vsFell = m.prevVs === 1 && s.vs === 0;
  m.prevHs = s.hs ? 1 : 0;
  m.prevVs = s.vs ? 1 : 0;
  if (hsFell) {
    if (!m.lineSynced) {
      m.lineSynced = true;
      m.line = [];
      return;
    }
    m.lastLine = m.line.length;
    if (m.rows.length < VGA_MAX_H) m.rows.push(m.line);
    m.line = [];
    if (m.rows.length % 8 === 0) m.version += 1;
  }
  if (vsFell) {
    if (m.rows.length > 1) {
      m.frame = buildFrame(m.rows, m.hasBlank);
      m.frames += 1;
    }
    m.rows = [];
    m.version += 1;
  }
}

/** The picture so far: the frame being drawn over the last complete one. */
export function vgaPreview(m: VgaMonitor): VgaFrame | null {
  if (m.rows.length < 2) return m.frame;
  const partial = buildFrame(m.rows, m.hasBlank, m.frame);
  return partial;
}

function buildFrame(rows: number[][], hasBlank: boolean, under?: VgaFrame | null): VgaFrame {
  const lens = rows.map((r) => r.length).sort((a, b) => a - b);
  const lineCycles = lens[Math.floor(lens.length / 2)] || 1;
  const divider = lineCycles >= 1400 && lineCycles <= 1800 ? 2 : 1;
  const lines = under ? Math.max(under.lines, rows.length) : rows.length;
  // sx0: first sample of the picture in a line; y0: first line.
  let sx0 = 0;
  let y0 = 0;
  let w = Math.ceil(lineCycles / divider);
  let h = lines;
  let crop: VgaFrame['crop'] = 'raw';
  const standard = Math.abs(lineCycles / divider - 800) <= 2 && Math.abs(lines - 525) <= 3;
  if (hasBlank) {
    // Visible area = the samples not blanked.
    let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
    rows.forEach((r, y) => r.forEach((v, x) => {
      if (v < 0) return;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }));
    // Nothing visible yet in a frame being drawn (still in vertical blanking):
    // keep showing the last picture.
    if (maxX < 0 && under) return under;
    if (maxX >= 0) {
      sx0 = minX;
      w = Math.floor((maxX - minX + 1) / divider);
      y0 = minY;
      h = under && under.crop === 'blank' ? Math.max(under.height, maxY - minY + 1) : maxY - minY + 1;
      // Visible from the very first line: the monitor locked on in the middle
      // of the picture's top line (after a reset), so that line is left blank.
      if (minY === 0 && !under) {
        y0 = -1;
        h += 1;
      }
      crop = 'blank';
    }
  } else if (standard) {
    // 640x480 at 60 Hz, measured from the sync edges: sync 96 + back porch 48
    // pixels before the picture, sync 2 + back porch 33 lines above it.
    sx0 = 144 * divider;
    y0 = 35;
    w = 640;
    h = 480;
    crop = 'standard';
  }
  w = Math.max(1, Math.min(VGA_MAX_W, w));
  h = Math.max(1, Math.min(VGA_MAX_H, h));
  const pixels = under && under.width === w && under.height === h ? new Uint8ClampedArray(under.pixels) : new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = rows[y + y0];
    if (!row) continue;
    for (let x = 0; x < w; x++) {
      const v = row[sx0 + x * divider];
      const o = (y * w + x) * 4;
      if (v === undefined || v < 0) {
        pixels[o] = pixels[o + 1] = pixels[o + 2] = 0;
      } else {
        pixels[o] = (v >> 16) & 255;
        pixels[o + 1] = (v >> 8) & 255;
        pixels[o + 2] = v & 255;
      }
      pixels[o + 3] = 255;
    }
  }
  return { width: w, height: h, pixels, lineCycles, lines, divider, crop };
}

/** Board clock cycles for one frame at the measured timing (standard 640x480 when unknown). */
export function vgaFrameCycles(m: VgaMonitor): number {
  if (m.frame) return m.frame.lineCycles * m.frame.lines;
  return 1600 * 525;
}
