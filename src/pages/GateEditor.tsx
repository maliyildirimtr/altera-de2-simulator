import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, ChevronDown, ClipboardPaste, Copy, CopyPlus, Cpu, FileDown, FileUp, FlaskConical, Link2, Move, Pause, Play, Plus, Redo2, RotateCcw, RotateCw, Timer, Trash2, Undo2, X, Zap } from 'lucide-react';
import {
  ARITH,
  CLOCKED,
  EMPTY_SEQ,
  MAX_ADDR,
  MAX_WIDTH,
  PARTS,
  WIDE,
  addrWidth,
  dataWidth,
  formatBus,
  maskOf,
  parseNumber,
  signalWidths,
  bitWidth,
  MULTI_INPUT,
  PALETTE,
  PRESETS,
  SEG7_PATTERNS,
  SINKS,
  SOURCES,
  blockPins,
  evaluate,
  flatten,
  runTests,
  testTemplate,
  usedBlocks,
  inputNames,
  ioNodes,
  isFlipFlop,
  isGate,
  outputNames,
  settle,
  sig,
  simulateTiming,
  toDe2Verilog,
  toVerilog,
  truthTable,
  valueAt,
  type Circuit,
  type GateNode,
  type GateType,
  type Library,
  type TestResult,
  type PartCategory,
  type SeqState,
  type Trace,
} from '../gates/circuit';
import { useI18n } from '../i18n/I18nProvider';
import { fmt } from '../i18n/dictionary';
import { OpenInSchematicButton } from '../components/Share/OpenInToolButton';
import { useBoardStore } from '../store/boardStore';
import { markWorkspaceDirty, markWorkspaceUser } from '../services/exampleHandoff';
import { decodeJson, encodeJson, MAX_SHARE_URL_LENGTH } from '../services/shareLink';
import { useLocation } from 'react-router-dom';
import { downloadText } from '../utils/svgExport';

const STORAGE_KEY = 'logiclab_gates_v1';
const W = 72;
const H = 52;
const CANVAS_W = 1100;
const CANVAS_H = 620;
const HISTORY_LIMIT = 48;

interface Saved {
  circuit: Circuit;
  inputs: Record<string, number>;
  name: string;
  /** Open with the gate-delay view on (set by the lessons). */
  timing?: boolean;
  seq?: SeqState;
  tests?: string;
}

const LIBRARY_KEY = 'logiclab_gates_lib_v1';
const SHARE_KEY = 'g';
const FILE_FORMAT = 'logiclab-gates';

function loadLibrary(): Library {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    const lib = raw ? (JSON.parse(raw) as Library) : {};
    return lib && typeof lib === 'object' ? lib : {};
  } catch {
    return {};
  }
}

function isCircuit(c: unknown): c is Circuit {
  const x = c as Circuit;
  return !!x && Array.isArray(x.nodes) && Array.isArray(x.wires) && x.nodes.every((n) => n && typeof n.id === 'string' && typeof n.type === 'string') && x.wires.every((w) => w && typeof w.from === 'string' && typeof w.to === 'string');
}

/** A design as saved to a file or carried by a share link. */
interface DesignFile {
  format: typeof FILE_FORMAT;
  version: 1;
  name: string;
  circuit: Circuit;
  tests?: string;
  library?: Library;
}

function readDesign(data: unknown): DesignFile | null {
  const d = data as DesignFile;
  if (!d || d.format !== FILE_FORMAT || !isCircuit(d.circuit)) return null;
  const library: Library = {};
  for (const [id, b] of Object.entries(d.library ?? {})) if (b && typeof b.name === 'string' && isCircuit(b.circuit)) library[id] = { id, name: b.name, circuit: b.circuit };
  return { format: FILE_FORMAT, version: 1, name: typeof d.name === 'string' ? d.name : 'gate_design', circuit: d.circuit, tests: typeof d.tests === 'string' ? d.tests : '', library };
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if (s?.circuit?.nodes && s.circuit.wires) {
        return { circuit: s.circuit, inputs: s.inputs ?? {}, name: s.name || 'gate_design', timing: !!s.timing, seq: s.seq?.q ? s.seq : EMPTY_SEQ, tests: typeof s.tests === 'string' ? s.tests : '' };
      }
    }
  } catch {
    /* start with a preset */
  }
  return { circuit: structuredClone(PRESETS.half_adder.circuit), inputs: {}, name: 'half_adder', seq: EMPTY_SEQ };
}

/* ── Geometry ──────────────────────────────────────────────────────── */

const BLOCK_TITLE: Partial<Record<GateType, string>> = { MUX2: 'MUX', MUX4: 'MUX', DEMUX2: 'DEMUX', DEMUX4: 'DEMUX', DEC2: 'DEC', DEC3: 'DEC', BITSEL: 'BIT', PENC4: 'PRI', ADD: 'ADD', SUB: 'SUB', MUL: 'MUL', DIV: 'DIV', SHIFT: 'SHIFT', CMP: 'CMP', NEG: 'NEG', SEXT: 'SEXT', BITCNT: 'CNT', BLOCK: 'BLK', HA: 'HA', FA: 'FA', DFF: 'D', TFF: 'T', JKFF: 'JK', SRFF: 'SR', REG: 'REG', RAM: 'RAM', ROM: 'ROM' };

/** Plexers drawn as a trapezoid (wide side = the side with more signals). */
const TRAPEZOID: GateType[] = ['MUX2', 'MUX4', 'BITSEL', 'DEMUX2', 'DEMUX4'];

function isBlock(t: GateType): boolean {
  return t in BLOCK_TITLE;
}

function nodeSize(n: Pick<GateNode, 'type' | 'inputs' | 'width'> & { label?: string }): { w: number; h: number } {
  if (isGate(n.type)) return { w: W, h: Math.max(H, inputNames(n).length * 16 + 12) };
  if (n.type === 'SPLIT' || n.type === 'MERGE') return { w: 30, h: Math.max(H, dataWidth(n) * 16 + 12) };
  if (n.type === 'CONST') return { w: 60, h: 36 };
  // Inputs and outputs grow with their name (and a bus value box).
  if (n.type === 'IN' || n.type === 'OUT' || n.type === 'LED' || n.type === 'BTN' || n.type === 'CLK') {
    return { w: Math.max(W, 52 + (n.label ?? '').length * 7.2 + (n.type === 'IN' && dataWidth(n) > 1 ? 6 : 0)), h: H };
  }
  if (n.type === 'SEG7') return { w: 64, h: 104 };
  if (n.type === 'CONST0' || n.type === 'CONST1') return { w: 44, h: 36 };
  if (n.type === 'TUNNEL') return { w: 76, h: 32 };
  if (n.type === 'BLOCK') return { w: 100, h: Math.max(inputNames(n).length, outputNames(n).length, 1) * 22 + 22 };
  if (isBlock(n.type)) {
    const pins = Math.max(inputNames(n).length, outputNames(n).length);
    return { w: 76, h: pins * 22 + 18 };
  }
  return { w: W, h: H };
}

type Side = 'L' | 'R' | 'T' | 'B';
type LocalPin = { x: number; y: number; side: Side };

/** Key of a pin in GateNode.pinLayout: i0, i1… for inputs, o0… for outputs. */
const pinKey = (dir: 'i' | 'o', k: number) => `${dir}${k}`;

/** Sides and positions of a block's pins (inputs left, outputs right unless moved). */
function blockFrame(n: GateNode): { w: number; h: number; pins: Record<string, LocalPin>; title: { x: number; y: number } } {
  const keys = [...inputNames(n).map((_, k) => pinKey('i', k)), ...outputNames(n).map((_, k) => pinKey('o', k))];
  const sideOf = (key: string): Side => n.pinLayout?.[key]?.side ?? (key[0] === 'i' ? 'L' : 'R');
  const bySide: Record<Side, string[]> = { L: [], R: [], T: [], B: [] };
  keys.forEach((k) => bySide[sideOf(k)].push(k));
  // Room for the pin names: a band along each side that has pins, and the
  // title in the middle of what is left.
  const nameOf = (key: string) => (key[0] === 'i' ? inputNames(n) : outputNames(n))[Number(key.slice(1))] ?? '';
  const textW = (list: string[]) => Math.max(0, ...list.map((k) => nameOf(k).length * 5.6)) + 12;
  const top = bySide.T.length ? 20 : 4;
  const bottom = bySide.B.length ? 20 : 4;
  const left = bySide.L.length ? textW(bySide.L) : 6;
  const right = bySide.R.length ? textW(bySide.R) : 6;
  const titleW = (n.label || 'BLOCK').length * 7 + 12;
  const h = Math.max(bySide.L.length, bySide.R.length, 1) * 22 + 10 + top + bottom;
  const w = Math.max(100, Math.max(bySide.T.length, bySide.B.length) * 30 + 24, left + titleW + right);
  const title = { x: left + (w - left - right) / 2, y: top + (h - top - bottom) / 2 + 4 };
  const pins: Record<string, LocalPin> = {};
  (Object.keys(bySide) as Side[]).forEach((side) => {
    const list = bySide[side];
    const vertical = side === 'L' || side === 'R';
    list.forEach((key, i) => {
      // Default spacing keeps side pins clear of the top and bottom name bands.
      const even = vertical ? (top + ((i + 1) * (h - top - bottom)) / (list.length + 1)) / h : (i + 1) / (list.length + 1);
      const pos = n.pinLayout?.[key]?.pos ?? even;
      if (side === 'L') pins[key] = { x: 0, y: pos * h, side };
      else if (side === 'R') pins[key] = { x: w, y: pos * h, side };
      else if (side === 'T') pins[key] = { x: pos * w, y: 0, side };
      else pins[key] = { x: pos * w, y: h, side };
    });
  });
  return { w, h, pins, title };
}

function localSize(n: GateNode): { w: number; h: number } {
  return n.type === 'BLOCK' ? blockFrame(n) : nodeSize(n);
}

/** A pin in the part's own (unrotated) frame. */
function localPin(n: GateNode, dir: 'i' | 'o', k: number): LocalPin {
  if (n.type === 'BLOCK') return blockFrame(n).pins[pinKey(dir, k)] ?? { x: 0, y: 0, side: 'L' };
  const { w, h } = nodeSize(n);
  if (dir === 'i') return { x: 0, y: (h * (k + 1)) / (inputNames(n).length + 1), side: 'L' };
  return { x: w, y: (h * (k + 1)) / (Math.max(1, outputNames(n).length) + 1), side: 'R' };
}

const rotOf = (n: GateNode) => (((n.rot ?? 0) % 360) + 360) % 360;

/** Rotates a point of the part's frame about its centre (clockwise, like SVG). */
function turn(n: GateNode, p: { x: number; y: number }, back = false): { x: number; y: number } {
  const { w, h } = localSize(n);
  const a = ((back ? -rotOf(n) : rotOf(n)) * Math.PI) / 180;
  const [cx, cy] = [w / 2, h / 2];
  const [c, s] = [Math.round(Math.cos(a)), Math.round(Math.sin(a))];
  return { x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c };
}

/** Bounding box of a part on the canvas, after rotation. */
function boxOf(n: GateNode): { x: number; y: number; w: number; h: number } {
  const { w, h } = localSize(n);
  const sideways = rotOf(n) % 180 === 90;
  return sideways ? { x: n.x + (w - h) / 2, y: n.y + (h - w) / 2, w: h, h: w } : { x: n.x, y: n.y, w, h };
}

function inPort(n: GateNode, pin: number): { x: number; y: number } {
  const p = turn(n, localPin(n, 'i', pin));
  return { x: n.x + p.x, y: n.y + p.y };
}
function outPort(n: GateNode, pin = 0): { x: number; y: number } {
  const p = turn(n, localPin(n, 'o', pin));
  return { x: n.x + p.x, y: n.y + p.y };
}

type Pt = { x: number; y: number };

/** Unit vector pointing out of the part at one of its pins, after rotation. */
function pinDir(n: GateNode, dir: 'i' | 'o', k: number): Pt {
  const side = localPin(n, dir, k).side;
  const v = side === 'L' ? { x: -1, y: 0 } : side === 'R' ? { x: 1, y: 0 } : side === 'T' ? { x: 0, y: -1 } : { x: 0, y: 1 };
  const a = (rotOf(n) * Math.PI) / 180;
  const [c, sn] = [Math.round(Math.cos(a)), Math.round(Math.sin(a))];
  return { x: v.x * c - v.y * sn, y: v.x * sn + v.y * c };
}

const RIGHT: Pt = { x: 1, y: 0 };
const LEFT: Pt = { x: -1, y: 0 };
/** Length of the straight stub a wire keeps where it leaves or enters a pin. */
const STUB = 18;

/**
 * Automatic route. A wire leaves its output pin and reaches its input pin
 * along the direction the pin faces (so a pin on the top of a rotated part is
 * left upwards), then joins the two stubs with at most two corners.
 */
function autoBends(a: Pt, b: Pt, da: Pt = RIGHT, db: Pt = LEFT): number[] {
  // The common case keeps its historic shape: one vertical segment half way.
  if (da.x === 1 && db.x === -1) return [Math.max(a.x + STUB, (a.x + b.x) / 2)];
  const p1 = { x: a.x + da.x * STUB, y: a.y + da.y * STUB };
  const q1 = { x: b.x + db.x * STUB, y: b.y + db.y * STUB };
  const xm = (p1.x + q1.x) / 2;
  const ym = (p1.y + q1.y) / 2;
  // A route never doubles back over a stub: each corner choice is checked
  // against the direction the wire leaves `a` and the one it must arrive in.
  const ahead = (d: Pt) => (q1.x - p1.x) * d.x + (q1.y - p1.y) * d.y >= 0;
  const viaX = [{ x: xm, y: p1.y }, { x: xm, y: q1.y }];
  const viaY = [{ x: p1.x, y: ym }, { x: q1.x, y: ym }];
  let mid: Pt[];
  if (da.y === 0 && db.y === 0) mid = ahead(da) ? viaX : viaY;
  else if (da.x === 0 && db.x === 0) mid = ahead(da) ? viaY : viaX;
  else if (da.y === 0) {
    // Horizontal out, vertical in: one corner if it runs forward and enters from the right side.
    const fits = (q1.x - p1.x) * da.x >= 0 && (q1.y - p1.y) * -db.y >= 0;
    mid = fits ? [{ x: q1.x, y: p1.y }] : viaX;
  } else {
    const fits = (q1.y - p1.y) * da.y >= 0 && (q1.x - p1.x) * -db.x >= 0;
    mid = fits ? [{ x: p1.x, y: q1.y }] : viaY;
  }
  return encodeRoute(a, b, [a, p1, ...mid, q1, b]) ?? [Math.max(a.x + STUB, (a.x + b.x) / 2)];
}

/** Drops repeated points and points in the middle of a straight run. */
function cleanRoute(raw: Pt[]): Pt[] {
  const pts: Pt[] = [];
  for (const p of raw) {
    const last = pts[pts.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    pts.push(p);
  }
  for (let i = 1; i < pts.length - 1; ) {
    const [p0, p1, p2] = [pts[i - 1], pts[i], pts[i + 1]];
    if ((p0.x === p1.x && p1.x === p2.x) || (p0.y === p1.y && p1.y === p2.y)) pts.splice(i, 1);
    else i++;
  }
  return pts;
}

/** Turns an orthogonal polyline from a to b into Wire.bends, or null if it cannot be encoded. */
function encodeRoute(a: Pt, b: Pt, raw: Pt[]): number[] | null {
  const corners = cleanRoute(raw).slice(1, -1);
  if (!corners.length) return null;
  // The encoding leaves `a` and reaches `b` horizontally; a vertical end is a
  // zero-length horizontal step.
  if (corners[0].x === a.x) corners.unshift({ ...a });
  if (corners[corners.length - 1].x === b.x) corners.push({ ...b });
  if (corners.length % 2 !== 0) return null;
  return corners.slice(0, -1).map((c, j) => (j % 2 === 0 ? c.x : c.y));
}

/** Corner points of an orthogonal route through `bends` (see Wire.bends). */
export function routePoints(a: Pt, b: Pt, bends?: number[]): Pt[] {
  const list = bends && bends.length % 2 === 1 ? bends : autoBends(a, b);
  const pts: Pt[] = [a];
  let cur = a;
  list.forEach((v, i) => {
    cur = i % 2 === 0 ? { x: v, y: cur.y } : { x: cur.x, y: v };
    pts.push(cur);
  });
  pts.push({ x: cur.x, y: b.y }, b);
  return pts;
}

/** Removes zero-length and straight-through bends so a route stays tidy. */
export function simplifyBends(a: Pt, b: Pt, bends: number[]): number[] {
  const pts = cleanRoute(routePoints(a, b, bends));
  if (pts.length <= 2) return autoBends(a, b);
  return encodeRoute(a, b, pts) ?? bends;
}

function pointsPath(pts: Pt[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
}

function wirePath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mid = Math.max(a.x + 18, (a.x + b.x) / 2);
  return `M${a.x},${a.y} H${mid} V${b.y} H${b.x}`;
}

/* ── Shapes ────────────────────────────────────────────────────────── */

/** Gate body shapes (IEEE distinctive), drawn in a W x h box. */
function GateShape({ type, fill, stroke, h = H }: { type: GateType; fill: string; stroke: string; h?: number }) {
  const bubble = type === 'NAND' || type === 'NOR' || type === 'XNOR' || type === 'NOT';
  const bodyW = bubble ? W - 10 : W;
  let d = '';
  if (type === 'AND' || type === 'NAND') d = `M8,4 H${bodyW / 2} A${bodyW / 2 - 8},${h / 2 - 4} 0 0 1 ${bodyW / 2},${h - 4} H8 Z`;
  else if (type === 'OR' || type === 'NOR' || type === 'XOR' || type === 'XNOR') d = `M10,4 Q${bodyW * 0.62},4 ${bodyW},${h / 2} Q${bodyW * 0.62},${h - 4} 10,${h - 4} Q24,${h / 2} 10,4 Z`;
  else if (type === 'NOT' || type === 'BUF') d = `M10,6 L${bodyW},${h / 2} L10,${h - 6} Z`;
  return (
    <g>
      <path d={d} fill={fill} stroke={stroke} strokeWidth={1.6} />
      {(type === 'XOR' || type === 'XNOR') && <path d={`M3,4 Q17,${h / 2} 3,${h - 4}`} fill="none" stroke={stroke} strokeWidth={1.6} />}
      {bubble && <circle cx={bodyW + 5} cy={h / 2} r={4.5} fill={fill} stroke={stroke} strokeWidth={1.6} />}
    </g>
  );
}

// Seven-segment polygons in a 40 x 70 box, segments a..g.
const SEGMENTS = [
  '8,3 32,3 28,8 12,8', // a
  '33,4 37,8 36,32 31,30 32,9', // b
  '36,38 37,62 33,66 32,61 31,40', // c
  '8,67 32,67 28,62 12,62', // d
  '7,66 3,62 4,38 9,40 8,61', // e
  '7,4 3,8 4,32 9,30 8,9', // f
  '9,35 12,32 28,32 31,35 28,38 12,38', // g
];

function Seg7Face({ value }: { value: number }) {
  const pattern = SEG7_PATTERNS[value & 15];
  return (
    <g transform="translate(12,16)">
      {SEGMENTS.map((pts, i) => {
        const lit = ((pattern >> i) & 1) === 0;
        return <polygon key={i} data-seg={i} data-lit={lit ? 1 : 0} points={pts} fill={lit ? '#ef4444' : 'rgba(239,68,68,0.12)'} style={{ filter: lit ? 'drop-shadow(0 0 3px rgba(239,68,68,0.8))' : undefined }} />;
      })}
    </g>
  );
}

/** Small icon of a part for the menus. */
function PartIcon({ type }: { type: GateType }) {
  const s = 'currentColor';
  if (isGate(type)) return <svg width="26" height="18" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><GateShape type={type} fill="none" stroke={s} /></svg>;
  const box = (text: string) => (
    <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
      <rect x="2" y="1.5" width="22" height="15" rx="2" fill="none" stroke={s} strokeWidth="1.3" />
      <text x="13" y="12.5" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={s}>{text}</text>
    </svg>
  );
  switch (type) {
    case 'IN': return box('0/1');
    case 'OUT': return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><circle cx="13" cy="9" r="7" fill="none" stroke={s} strokeWidth="1.3" /><text x="13" y="12" textAnchor="middle" fontSize="8" fontWeight="700" fill={s}>1</text></svg>;
    case 'BTN': return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><rect x="5" y="2" width="16" height="14" rx="3" fill="none" stroke={s} /><circle cx="13" cy="9" r="4.5" fill={s} /></svg>;
    case 'CLK': return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M2,14 H7 V4 H13 V14 H19 V4 H24" fill="none" stroke={s} strokeWidth="1.5" /></svg>;
    case 'TUNNEL': return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M3,3 H17 L23,9 L17,15 H3 Z" fill="none" stroke={s} strokeWidth="1.3" /></svg>;
    case 'BLOCK': return box('BLK');
    case 'CONST': return box('0x');
    case 'SPLIT': return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M2,9 H11 M11,2 V16 M11,3 H24 M11,7 H24 M11,11 H24 M11,15 H24" fill="none" stroke={s} strokeWidth="1.3" /><path d="M11,2 V16" stroke={s} strokeWidth="3" /></svg>;
    case 'MERGE': return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M15,9 H24 M2,3 H15 M2,7 H15 M2,11 H15 M2,15 H15" fill="none" stroke={s} strokeWidth="1.3" /><path d="M15,2 V16" stroke={s} strokeWidth="3" /></svg>;
    case 'CONST0': return box('0');
    case 'CONST1': return box('1');
    case 'SEG7': return box('8.');
    case 'LED': return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><circle cx="13" cy="9" r="6" fill="#ef4444" /></svg>;
    case 'MUX2':
    case 'MUX4':
    case 'BITSEL': return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M6,1 L20,5 V13 L6,17 Z" fill="none" stroke={s} strokeWidth="1.3" /></svg>;
    case 'DEMUX2':
    case 'DEMUX4': return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M6,5 L20,1 V17 L6,13 Z" fill="none" stroke={s} strokeWidth="1.3" /></svg>;
    default: return box(BLOCK_TITLE[type] ?? type);
  }
}

const SIDES: Side[] = ['T', 'R', 'B', 'L'];

/** The side a pin faces after the part is rotated (clockwise). */
function turnedSide(side: Side, rot: number): Side {
  return SIDES[(SIDES.indexOf(side) + Math.round(rot / 90)) % 4];
}

/**
 * A pin name drawn inside the frame next to its pin. The offset is worked
 * out on the side the pin faces after rotation, then mapped back into the
 * part's frame, so the name always sits inside the frame and reads upright.
 */
function PinLabel({ n, p, text }: { n: GateNode; p: LocalPin; text: string }) {
  const rot = rotOf(n);
  const side = turnedSide(p.side, rot);
  const pin = turn(n, p);
  const on =
    side === 'T' ? { x: pin.x, y: pin.y + 16, a: 'middle' as const }
    : side === 'B' ? { x: pin.x, y: pin.y - 8, a: 'middle' as const }
    : side === 'R' ? { x: pin.x - 9, y: pin.y + 3.5, a: 'end' as const }
    : { x: pin.x + 9, y: pin.y + 3.5, a: 'start' as const };
  const at = turn(n, on, true);
  return <text x={at.x} y={at.y} textAnchor={on.a} fontSize={9} fill="var(--text-secondary)" pointerEvents="none" transform={rot ? `rotate(${-rot} ${at.x} ${at.y})` : undefined}>{text}</text>;
}

let idCounter = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

type Sample = Record<string, number>;

/**
 * Gate-level drawing editor: place gates, plexers, adders, flip-flops and
 * displays, wire them, drive inputs, buttons and a clock, and watch the
 * outputs; see the generated Verilog and the truth table or timing diagram,
 * send the design to the DE2 board or the Schematic tool, and replay an input
 * change with gate delays to see glitches.
 */
export default function GateEditor() {
  const { d, lang } = useI18n();
  const g = d.gates;
  const navigate = useNavigate();
  const initial = useMemo(load, []);
  const [circuit, setCircuit] = useState<Circuit>(initial.circuit);
  const [inputs, setInputs] = useState<Record<string, number>>(initial.inputs);
  const [seq, setSeq] = useState<SeqState>(initial.seq ?? EMPTY_SEQ);
  const [name, setName] = useState(initial.name);
  const [selected, setSelected] = useState<{ kind: 'node' | 'wire'; id: string } | null>(null);
  const [pending, setPending] = useState<{ id: string; pin: number } | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [timingMode, setTimingMode] = useState(!!initial.timing);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [traceTime, setTraceTime] = useState(0);
  const [menu, setMenu] = useState<PartCategory | 'blocks' | 'file' | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<Sample[]>([]);
  const [library, setLibrary] = useState<Library>(loadLibrary);
  const [multi, setMulti] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [tests, setTests] = useState(initial.tests ?? '');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [, bumpHistory] = useState(0);
  const undoStack = useRef<Circuit[]>([]);
  const redoStack = useRef<Circuit[]>([]);
  const committed = useRef(initial.circuit);
  const lastPush = useRef(0);
  /** Set while typing a name, so the keystrokes become one undo step. */
  const typing = useRef(false);
  const clipboard = useRef<Circuit | null>(null);
  const pasteCount = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const svgRef = useRef<SVGSVGElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean; starts?: Record<string, { x: number; y: number }>; p0?: { x: number; y: number } } | null>(null);
  const marqueeRef = useRef<{ x0: number; y0: number; moved: boolean } | null>(null);
  const [pinEdit, setPinEdit] = useState<string | null>(null);
  const pinDrag = useRef<{ id: string; key: string } | null>(null);
  /** Dragging one segment of a wire: index into its bends. */
  const wireDrag = useRef<{ id: string; index: number } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ circuit, inputs, name, timing: timingMode, seq, tests }));
      } catch {
        /* storage unavailable */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [circuit, inputs, name, timingMode, seq, tests]);

  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    } catch {
      /* storage unavailable */
    }
  }, [library]);

  // Notices fade after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(t);
  }, [notice]);

  /* ── Undo / redo: every committed change of the circuit is a step ── */
  const circuitRef = useRef(circuit);
  circuitRef.current = circuit;
  const checkpoint = useCallback(() => {
    const cur = circuitRef.current;
    if (cur === committed.current) return;
    const now = Date.now();
    // Keystrokes of one name become one step; every other change is its own step.
    const merge = typing.current && now - lastPush.current < 1500 && undoStack.current.length > 0;
    typing.current = false;
    if (!merge) {
      undoStack.current = [...undoStack.current, committed.current].slice(-100);
    }
    lastPush.current = now;
    redoStack.current = [];
    committed.current = cur;
    bumpHistory((x) => x + 1);
  }, []);
  useEffect(() => {
    if (drag.current || wireDrag.current || pinDrag.current) return; // committed on pointer up
    checkpoint();
  }, [circuit, checkpoint]);
  const restore = (c: Circuit) => {
    committed.current = c;
    lastPush.current = 0;
    setCircuit(c);
    setSelected(null);
    setMulti([]);
    setTrace(null);
    bumpHistory((x) => x + 1);
  };
  const undo = () => {
    const prev = undoStack.current[undoStack.current.length - 1];
    if (!prev) return;
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [...redoStack.current, circuitRef.current];
    restore(prev);
  };
  const redo = () => {
    const next = redoStack.current[redoStack.current.length - 1];
    if (!next) return;
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current = [...undoStack.current, circuitRef.current];
    restore(next);
  };

  // What runs: blocks expanded, tunnels joined (ids of top-level parts unchanged).
  const flat = useMemo(() => flatten(circuit, library), [circuit, library]);
  const ev = useMemo(() => evaluate(flat, inputs, seq.q), [flat, inputs, seq]);
  const verilog = useMemo(() => toVerilog(flat, name), [flat, name]);
  const table = useMemo(() => truthTable(flat), [flat]);
  const { ins, outs, displays } = useMemo(() => ioNodes(circuit), [circuit]);
  const byId = useMemo(() => new Map(circuit.nodes.map((n) => [n.id, n])), [circuit]);
  const ffs = useMemo(() => flat.nodes.filter((n) => isFlipFlop(n.type) || n.type === 'REG').sort((a, b) => a.x - b.x || a.y - b.y), [flat]);
  const clocks = useMemo(() => circuit.nodes.filter((n) => n.type === 'CLK'), [circuit]);
  const sequential = flat.nodes.some((n) => CLOCKED.includes(n.type));
  // Bus widths of every signal, and wires joining pins of different widths.
  const widthInfo = useMemo(() => signalWidths(flat), [flat]);
  const mismatched = useMemo(() => new Set(widthInfo.mismatched), [widthInfo]);
  const widthOf = (key: string) => widthInfo.widths[key] ?? 1;
  const showGraph = sequential || clocks.length > 0;

  // Latest state for handlers that run from timers and pointer events.
  const live = useRef({ circuit: flat, inputs, seq, timingMode });
  live.current = { circuit: flat, inputs, seq, timingMode };

  /** Applies new source values: settles flip-flops, records a step, replays delays. */
  const apply = useCallback((next: Record<string, number>) => {
    const cur = live.current;
    const r = settle(cur.circuit, next, cur.seq);
    live.current = { ...cur, inputs: next, seq: r.seq };
    setInputs(next);
    setSeq(r.seq);
    if (cur.timingMode) {
      setTrace(simulateTiming(cur.circuit, cur.inputs, next, 60, r.seq.q));
      setTraceTime(0);
    } else setTrace(null);
    const sample: Sample = {};
    for (const n of cur.circuit.nodes) {
      if (SOURCES.includes(n.type)) sample[n.id] = r.ev.values[n.id] ?? 0;
      else if (SINKS.includes(n.type) || n.type === 'SEG7') sample[n.id] = r.ev.values[n.id] ?? 0;
      else if (isFlipFlop(n.type) || n.type === 'REG') sample[n.id] = r.seq.q[n.id] ?? 0;
    }
    setHistory((h) => [...h, sample].slice(-HISTORY_LIMIT));
  }, []);

  // Value shown on a signal: live value, or the replayed value at traceTime.
  const shown = useCallback(
    (key: string) => (trace && trace.changes[key] ? valueAt(trace.changes[key], traceTime) : ev.values[key] ?? 0),
    [trace, traceTime, ev],
  );

  // Replay animation.
  useEffect(() => {
    if (!trace || traceTime >= trace.end) return;
    const t = window.setTimeout(() => setTraceTime((x) => x + 1), 450);
    return () => window.clearTimeout(t);
  }, [trace, traceTime]);

  // Free-running clock: toggles every CLK node.
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      const cur = live.current;
      const clk = cur.circuit.nodes.filter((n) => n.type === 'CLK');
      if (!clk.length) return;
      const level = cur.inputs[clk[0].id] ? 0 : 1;
      const next = { ...cur.inputs };
      clk.forEach((c) => { next[c.id] = level; });
      apply(next);
    }, 500);
    return () => window.clearInterval(t);
  }, [running, apply]);
  useEffect(() => {
    if (running && clocks.length === 0) setRunning(false);
  }, [running, clocks.length]);

  const pulse = () => {
    const cur = live.current;
    const lo = { ...cur.inputs };
    clocks.forEach((c) => { lo[c.id] = 0; });
    const hi = { ...lo };
    clocks.forEach((c) => { hi[c.id] = 1; });
    // Start from low so the pulse always has a rising edge.
    if (clocks.some((c) => cur.inputs[c.id])) apply(lo);
    apply(hi);
    apply(lo);
  };

  const resetFlipFlops = () => {
    const cur = live.current;
    const cleared: SeqState = { q: {}, clk: cur.seq.clk };
    live.current = { ...cur, seq: cleared };
    setSeq(cleared);
    setTrace(null);
    setHistory([]);
  };

  // Close the part menu on outside click.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element;
      if (menuRef.current?.contains(el) || el.closest?.('[data-testid="gate-menu-file"]') || el.closest?.('[role="menu"]')) return;
      setMenu(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menu]);

  const toPoint = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * CANVAS_W, y: ((e.clientY - r.top) / r.height) * CANVAS_H };
  };

  const addNode = (type: GateType) => {
    const count = circuit.nodes.filter((n) => n.type === type).length;
    const size = nodeSize({ type });
    const leftCol = type === 'IN' || type === 'BTN' || type === 'CLK' || type === 'CONST0' || type === 'CONST1';
    const rightCol = type === 'OUT' || type === 'LED' || type === 'SEG7';
    const x = leftCol ? 40 : rightCol ? CANVAS_W - 140 : 260 + (circuit.nodes.length % 5) * 120;
    const y = 40 + ((count * 90 + (leftCol || rightCol ? 0 : circuit.nodes.length * 17)) % Math.max(60, CANVAS_H - size.h - 60));
    const inCount = circuit.nodes.filter((n) => n.type === 'IN').length;
    const label =
      type === 'IN' ? String.fromCharCode(97 + (inCount % 26))
      : type === 'OUT' ? (outs.length ? `y${outs.length}` : 'y')
      : type === 'LED' ? `led${count}`
      : type === 'CLK' ? (count ? `clk${count}` : 'clk')
      : type === 'BTN' ? `btn${count}`
      : type === 'SEG7' ? `hex${count}`
      : '';
    const n: GateNode = { id: newId(type.toLowerCase()), type, x, y, label, delay: 1 };
    setCircuit((c) => ({ ...c, nodes: [...c.nodes, n] }));
    setSelected({ kind: 'node', id: n.id });
    setTrace(null);
    setMenu(null);
  };

  const removeSelected = useCallback(() => {
    if (multi.length > 1) {
      const gone = new Set(multi);
      setCircuit((c) => ({ nodes: c.nodes.filter((n) => !gone.has(n.id)), wires: c.wires.filter((w) => !gone.has(w.from) && !gone.has(w.to)) }));
      setMulti([]);
      setSelected(null);
      setTrace(null);
      return;
    }
    if (!selected) return;
    setCircuit((c) =>
      selected.kind === 'wire'
        ? { ...c, wires: c.wires.filter((w) => w.id !== selected.id) }
        : { nodes: c.nodes.filter((n) => n.id !== selected.id), wires: c.wires.filter((w) => w.from !== selected.id && w.to !== selected.id) },
    );
    setSelected(null);
    setTrace(null);
  }, [selected, multi]);

  /* ── Copy / paste ── */
  const copySelection = () => {
    const ids = new Set(multi.length ? multi : selected?.kind === 'node' ? [selected.id] : []);
    if (!ids.size) return;
    clipboard.current = structuredClone({ nodes: circuit.nodes.filter((n) => ids.has(n.id)), wires: circuit.wires.filter((w) => ids.has(w.from) && ids.has(w.to)) });
    pasteCount.current = 0;
  };
  const pasteClipboard = (src: Circuit | null = clipboard.current) => {
    if (!src || !src.nodes.length) return;
    pasteCount.current += 1;
    const d = 30 * pasteCount.current;
    const map = new Map(src.nodes.map((n) => [n.id, newId(n.type.toLowerCase())]));
    const nodes = src.nodes.map((n) => ({ ...n, id: map.get(n.id)!, x: Math.min(CANVAS_W - 80, n.x + d), y: Math.min(CANVAS_H - 60, n.y + d) }));
    const wires = src.wires.map((w) => ({ ...w, id: newId('w'), from: map.get(w.from)!, to: map.get(w.to)!, ...(w.bends ? { bends: w.bends.map((b, i) => b + d * (i % 2 === 0 ? 1 : 1)) } : {}) }));
    setCircuit((c) => ({ nodes: [...c.nodes, ...nodes], wires: [...c.wires, ...wires] }));
    setMulti(nodes.map((n) => n.id));
    setSelected(nodes.length === 1 ? { kind: 'node', id: nodes[0].id } : null);
    setTrace(null);
  };
  const duplicate = () => {
    copySelection();
    pasteClipboard();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (mod && k === 'c') { copySelection(); return; }
      if (mod && k === 'v') { e.preventDefault(); pasteClipboard(); return; }
      if (mod && k === 'd') { e.preventDefault(); duplicate(); return; }
      if (mod && k === 'a') { e.preventDefault(); setMulti(circuitRef.current.nodes.map((n) => n.id)); setSelected(null); return; }
      if (!mod && k === 'r') { rotateSelection(e.shiftKey ? -90 : 90); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') removeSelected();
      if (e.key === 'Escape') { setPending(null); setSelected(null); setMulti([]); setMenu(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const connect = (to: string, pin: number) => {
    if (!pending || pending.id === to) { setPending(null); return; }
    const from = pending;
    setCircuit((c) => ({
      ...c,
      wires: [...c.wires.filter((w) => !(w.to === to && w.pin === pin)), { id: newId('w'), from: from.id, ...(from.pin ? { fromPin: from.pin } : {}), to, pin }],
    }));
    setPending(null);
    setTrace(null);
  };

  const toggleInput = (id: string) => apply({ ...live.current.inputs, [id]: live.current.inputs[id] ? 0 : 1 });
  /** Sets a bus input to a value (wrapped to its width). */
  const setBusInput = (n: GateNode, v: number) => {
    const m = maskOf(dataWidth(n));
    apply({ ...live.current.inputs, [n.id]: (((v % (m + 1)) + m + 1) % (m + 1)) >>> 0 });
  };
  const setButton = (id: string, v: number) => {
    if ((live.current.inputs[id] ?? 0) !== v) apply({ ...live.current.inputs, [id]: v });
  };

  // Pin editing ends when another part is selected.
  useEffect(() => {
    if (pinEdit && !(selected?.kind === 'node' && selected.id === pinEdit)) setPinEdit(null);
  }, [selected, pinEdit]);

  const startPinDrag = (e: React.PointerEvent, n: GateNode, key: string) => {
    pinDrag.current = { id: n.id, key };
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* optional */
    }
  };

  /** Turns the selected parts by 90° (clockwise or counter-clockwise). */
  const rotateSelection = (delta: number) => {
    const ids = new Set(multi.length ? multi : selected?.kind === 'node' ? [selected.id] : []);
    if (!ids.size) return;
    setCircuit((c) => ({ ...c, nodes: c.nodes.map((n) => (ids.has(n.id) ? { ...n, rot: (((n.rot ?? 0) + delta) % 360 + 360) % 360 } : n)) }));
    setTrace(null);
  };

  const onNodeDown = (e: React.PointerEvent, n: GateNode) => {
    e.stopPropagation();
    const p = toPoint(e);
    if (e.shiftKey) {
      // Shift-click adds to or removes from the selection.
      setMulti((m) => (m.includes(n.id) ? m.filter((x) => x !== n.id) : [...(m.length ? m : selected?.kind === 'node' ? [selected.id] : []), n.id]));
      setSelected({ kind: 'node', id: n.id });
      return;
    }
    const group = multi.includes(n.id) && multi.length > 1 ? multi : [n.id];
    const starts: Record<string, { x: number; y: number }> = {};
    for (const id of group) {
      const m = byId.get(id);
      if (m) starts[id] = { x: m.x, y: m.y };
    }
    drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false, starts, p0: p };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    if (group.length === 1) setMulti([n.id]);
    setSelected({ kind: 'node', id: n.id });
  };
  const onMove = (e: React.PointerEvent) => {
    const p = toPoint(e);
    if (pending) setMouse(p);
    const wd = wireDrag.current;
    if (wd) {
      const v = Math.round((wd.index % 2 === 0 ? Math.min(CANVAS_W - 4, Math.max(4, p.x)) : Math.min(CANVAS_H - 4, Math.max(4, p.y))) / 10) * 10;
      setCircuit((c) => ({ ...c, wires: c.wires.map((w) => (w.id === wd.id && w.bends ? { ...w, bends: w.bends.map((b, i) => (i === wd.index ? v : b)) } : w)) }));
      return;
    }
    const pd = pinDrag.current;
    if (pd) {
      const node = byId.get(pd.id);
      if (!node) return;
      const { w, h } = localSize(node);
      const q = turn(node, { x: p.x - node.x, y: p.y - node.y }, true);
      const d: Record<Side, number> = { L: Math.abs(q.x), R: Math.abs(w - q.x), T: Math.abs(q.y), B: Math.abs(h - q.y) };
      const side = (Object.keys(d) as Side[]).reduce((a, b) => (d[b] < d[a] ? b : a));
      const along = side === 'L' || side === 'R' ? q.y / h : q.x / w;
      const pos = Math.min(0.94, Math.max(0.06, Math.round(along * 20) / 20));
      setCircuit((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === pd.id ? { ...n, pinLayout: { ...(n.pinLayout ?? {}), [pd.key]: { side, pos } } } : n)) }));
      return;
    }
    const mq = marqueeRef.current;
    if (mq) {
      mq.moved = true;
      setMarquee({ x0: mq.x0, y0: mq.y0, x1: p.x, y1: p.y });
      return;
    }
    const dr = drag.current;
    if (!dr) return;
    dr.moved = true;
    if (dr.starts && dr.p0 && Object.keys(dr.starts).length > 1) {
      const dx = Math.round((p.x - dr.p0.x) / 10) * 10;
      const dy = Math.round((p.y - dr.p0.y) / 10) * 10;
      const starts = dr.starts;
      setCircuit((c) => ({
        ...c,
        nodes: c.nodes.map((n) => {
          const s0 = starts[n.id];
          if (!s0) return n;
          const b = boxOf(n);
          const [ox, oy] = [b.x - n.x, b.y - n.y];
          return { ...n, x: Math.min(CANVAS_W - b.w - 4, Math.max(4, s0.x + dx + ox)) - ox, y: Math.min(CANVAS_H - b.h - 4, Math.max(4, s0.y + dy + oy)) - oy };
        }),
      }));
      return;
    }
    const node = byId.get(dr.id);
    const b = node ? boxOf(node) : { x: 0, y: 0, w: W, h: H };
    const [ox, oy] = node ? [b.x - node.x, b.y - node.y] : [0, 0];
    const x = Math.round((Math.min(CANVAS_W - b.w - 4, Math.max(4, p.x - dr.dx + ox)) - ox) / 10) * 10;
    const y = Math.round((Math.min(CANVAS_H - b.h - 4, Math.max(4, p.y - dr.dy + oy)) - oy) / 10) * 10;
    setCircuit((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === dr.id ? { ...n, x, y } : n)) }));
  };
  const onUp = () => {
    const wd = wireDrag.current;
    if (wd) {
      // Tidy the route: merge bends that ended up on a straight line.
      setCircuit((c) => ({
        ...c,
        wires: c.wires.map((w) => {
          if (w.id !== wd.id || !w.bends) return w;
          const a = byId.get(w.from);
          const b = byId.get(w.to);
          return a && b ? { ...w, bends: simplifyBends(outPort(a, w.fromPin ?? 0), inPort(b, w.pin), w.bends) } : w;
        }),
      }));
    }
    const mq = marqueeRef.current;
    if (mq) {
      marqueeRef.current = null;
      if (mq.moved && marquee) {
        const [x0, x1] = [Math.min(marquee.x0, marquee.x1), Math.max(marquee.x0, marquee.x1)];
        const [y0, y1] = [Math.min(marquee.y0, marquee.y1), Math.max(marquee.y0, marquee.y1)];
        const hit = circuit.nodes.filter((n) => {
          const b = boxOf(n);
          return b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0;
        });
        setMulti(hit.map((n) => n.id));
        setSelected(hit.length === 1 ? { kind: 'node', id: hit[0].id } : null);
      } else {
        setSelected(null);
        setMulti([]);
      }
      setMarquee(null);
    }
    if (pinDrag.current) {
      pinDrag.current = null;
      checkpoint();
    }
    const wasDragging = !!drag.current?.moved;
    wireDrag.current = null;
    drag.current = null;
    if (wasDragging) checkpoint();
  };

  const loadPreset = (key: string) => {
    const p = PRESETS[key];
    const next: Record<string, number> = key === 'hazard' ? { a: 1, b: 1, c: 1 } : {};
    const r = settle(flatten(p.circuit, library), next, EMPTY_SEQ);
    setCircuit(structuredClone(p.circuit));
    setMulti([]);
    setTestResult(null);
    setInputs(next);
    setSeq(r.seq);
    live.current = { ...live.current, circuit: flatten(p.circuit, library), inputs: next, seq: r.seq };
    setName(key);
    setSelected(null);
    setPending(null);
    setTrace(null);
    setHistory([]);
    setRunning(false);
    if (key === 'hazard') setTimingMode(true);
  };

  const updateNode = (id: string, patch: Partial<GateNode>) => {
    if ('label' in patch) typing.current = true;
    setCircuit((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  };

  const setInputCount = (n: GateNode, k: number) => {
    setCircuit((c) => ({
      nodes: c.nodes.map((x) => (x.id === n.id ? { ...x, inputs: k } : x)),
      wires: c.wires.filter((w) => !(w.to === n.id && w.pin >= k)),
    }));
    setTrace(null);
  };

  /** Changes a block's width or direction, keeping the wires whose pin still exists. */
  const reshape = (n: GateNode, patch: Partial<GateNode>) => {
    const next = { ...n, ...patch };
    const [oi, oo, ni, no] = [inputNames(n), outputNames(n), inputNames(next), outputNames(next)];
    setCircuit((c) => ({
      nodes: c.nodes.map((x) => (x.id === n.id ? next : x)),
      wires: c.wires.flatMap((w) => {
        let out = w;
        if (w.to === n.id) {
          const pin = ni.indexOf(oi[w.pin]);
          if (pin < 0) return [];
          out = { ...out, pin };
        }
        if (w.from === n.id) {
          const pin = no.indexOf(oo[w.fromPin ?? 0]);
          if (pin < 0) return [];
          out = { ...out, fromPin: pin };
        }
        return [out];
      }),
    }));
    setTrace(null);
  };

  /* ── Files, share links and blocks ── */
  const designFile = (): DesignFile => ({ format: FILE_FORMAT, version: 1, name, circuit, tests, library: usedBlocks(circuit, library) });
  const loadDesign = (d: DesignFile) => {
    const lib = { ...library, ...(d.library ?? {}) };
    if (d.library && Object.keys(d.library).length) setLibrary(lib);
    const r = settle(flatten(d.circuit, lib), {}, EMPTY_SEQ);
    setCircuit(d.circuit);
    setInputs({});
    setSeq(r.seq);
    setName(d.name);
    setTests(d.tests ?? '');
    setSelected(null);
    setMulti([]);
    setTrace(null);
    setHistory([]);
    setRunning(false);
    setTestResult(null);
  };
  const newCircuit = () => {
    setCircuit({ nodes: [], wires: [] });
    setInputs({});
    setSeq(EMPTY_SEQ);
    setTrace(null);
    setSelected(null);
    setMulti([]);
    setHistory([]);
    setRunning(false);
    setTestResult(null);
    setMenu(null);
  };
  const safeName = (name || 'gate_design').replace(/[^A-Za-z0-9_-]+/g, '_');
  const saveFile = () => {
    downloadText(JSON.stringify(designFile(), null, 2), `${safeName}.logiclab.json`, 'application/json');
    setMenu(null);
  };
  const openFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      let d: DesignFile | null = null;
      try {
        d = readDesign(JSON.parse(String(reader.result)));
      } catch {
        d = null;
      }
      if (!d) return setNotice({ kind: 'err', text: g.openFailed });
      if (circuitRef.current.nodes.length && !window.confirm(g.openShared)) return;
      loadDesign(d);
    };
    reader.readAsText(file);
  };
  const copyShareLink = async () => {
    setMenu(null);
    try {
      const url = `${window.location.origin}${window.location.pathname}#/gates?${SHARE_KEY}=${await encodeJson(designFile())}`;
      if (url.length > MAX_SHARE_URL_LENGTH) return setNotice({ kind: 'err', text: g.tooLong });
      await navigator.clipboard.writeText(url);
      setNotice({ kind: 'ok', text: g.linkCopied });
    } catch (err) {
      setNotice({ kind: 'err', text: (err as Error).message });
    }
  };
  // Open a design carried by a share link (#/gates?g=…).
  useEffect(() => {
    const code = new URLSearchParams(location.search).get(SHARE_KEY);
    if (!code) return;
    let cancelled = false;
    decodeJson(code)
      .then((data) => {
        if (cancelled) return;
        const d = readDesign(data);
        if (!d) throw new Error(g.openFailed);
        if (circuitRef.current.nodes.length && !window.confirm(g.openShared)) return;
        loadDesign(d);
      })
      .catch((err: Error) => { if (!cancelled) setNotice({ kind: 'err', text: err.message }); })
      .finally(() => { if (!cancelled) navigate(location.pathname, { replace: true }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const saveAsBlock = () => {
    setMenu(null);
    const pins = blockPins(circuit);
    if (!pins.ins.length || !pins.outs.length) return setNotice({ kind: 'err', text: g.blockNeedsIo });
    const bname = (name || 'block').trim();
    const existing = Object.values(library).find((b) => b.name === bname);
    if (existing && !window.confirm(fmt(g.blockExists, { name: bname }))) return;
    const id = existing?.id ?? newId('blk');
    if (usedBlocks(circuit, library)[id]) return setNotice({ kind: 'err', text: g.blockRecursive });
    setLibrary((lib) => ({ ...lib, [id]: { id, name: bname, circuit: structuredClone(circuit) } }));
    setNotice({ kind: 'ok', text: fmt(g.blockSaved, { name: bname }) });
  };
  const addBlock = (id: string) => {
    const b = library[id];
    if (!b) return;
    const pins = blockPins(b.circuit);
    const count = circuit.nodes.filter((n) => n.type === 'BLOCK').length;
    const n: GateNode = { id: newId('blk'), type: 'BLOCK', ref: id, pinsIn: pins.ins, pinsOut: pins.outs, label: b.name, x: 300 + (count % 4) * 40, y: 60 + (count % 4) * 40, delay: 1 };
    setCircuit((c) => ({ ...c, nodes: [...c.nodes, n] }));
    setSelected({ kind: 'node', id: n.id });
    setMulti([n.id]);
    setMenu(null);
  };
  const deleteBlock = (id: string) => {
    const b = library[id];
    if (!b || !window.confirm(fmt(g.blockDelete, { name: b.name }))) return;
    setLibrary((lib) => {
      const next = { ...lib };
      delete next[id];
      return next;
    });
  };

  const runTest = () => {
    if (!tests.trim()) return setTestResult({ error: 'empty', rows: [], passed: 0, failed: 0 });
    setTestResult(runTests(flat, tests));
  };
  const testError = (e: string) =>
    e === 'empty' ? g.testEmpty
    : e.startsWith('unknown:') ? fmt(g.testUnknown, { names: e.slice(8) })
    : e.startsWith('columns:') ? fmt(g.testColumns, { line: e.slice(8) })
    : e;

  const openInDe2 = () => {
    const st = useBoardStore.getState();
    st.setHdlCode(toDe2Verilog(flat, name));
    st.setPinMappings([]);
    st.setEngine(null);
    st.resetBoard();
    markWorkspaceUser('de2');
    markWorkspaceDirty('de2');
    navigate('/de2-simulator');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(verilog);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const sel = selected?.kind === 'node' ? byId.get(selected.id) : undefined;

  const on = '#22c55e';
  const off = 'var(--text-muted)';
  const btn = 'h-8 px-2.5 rounded-[0.25rem] border text-[0.75rem] font-medium flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40';
  const btnStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' };
  const loopSet = new Set(ev.loop);
  const labelled = (t: GateType) => SOURCES.includes(t) || SINKS.includes(t) || t === 'SEG7' || t === 'TUNNEL';

  const renderNode = (n: GateNode) => {
    const { w, h } = localSize(n);
    const rot = rotOf(n);
    const upright = (x: number, y: number) => (rot ? `rotate(${-rot} ${x} ${y})` : undefined);
    const editing = pinEdit === n.id;
    const titleAt = n.type === 'BLOCK' ? blockFrame(n).title : { x: w / 2, y: 13 };
    const v = shown(n.id);
    const isSel = (selected?.kind === 'node' && selected.id === n.id) || multi.includes(n.id);
    const glitch = trace?.glitches.includes(n.id);
    const stroke = loopSet.has(n.id) ? '#ef4444' : isSel ? '#3b82f6' : 'var(--text-secondary)';
    const inNames = inputNames(n);
    const outNames = outputNames(n);
    const clockPin = PARTS[n.type]?.clock ?? -1;
    const busIn = n.type === 'IN' && dataWidth(n) > 1;
    const inW = (() => { const w0 = circuit.wires.find((x) => x.to === n.id && x.pin === 0); return w0 ? widthOf(sig(w0.from, w0.fromPin ?? 0)) : 1; })();
    const busOut = n.type === 'OUT' && inW > 1;
    let body: React.ReactNode;
    if (isGate(n.type)) body = <GateShape type={n.type} fill="var(--bg-surface)" stroke={stroke} h={h} />;
    else if (TRAPEZOID.includes(n.type)) {
      const demux = n.type === 'DEMUX2' || n.type === 'DEMUX4';
      const d = demux ? `M0,${h * 0.18} L${w},0 L${w},${h} L0,${h * 0.82} Z` : `M0,0 L${w},${h * 0.18} L${w},${h * 0.82} L0,${h} Z`;
      body = (
        <>
          <path d={d} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.2 : 1.5} />
          <text x={demux ? w / 2 + 7 : w / 2} y={h / 2 + 3} transform={upright(demux ? w / 2 + 7 : w / 2, h / 2 + 3)} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text-secondary)" pointerEvents="none">{BLOCK_TITLE[n.type]}</text>
        </>
      );
    } else if (isBlock(n.type)) {
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={4} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.2 : 1.5} />
          <text x={titleAt.x} y={titleAt.y} transform={upright(titleAt.x, titleAt.y)} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-primary)" pointerEvents="none">{n.type === 'BLOCK' ? (n.label || (n.ref && library[n.ref]?.name) || 'BLOCK') + (n.ref && !library[n.ref] ? ` (${g.blockMissing})` : '') : n.type === 'SHIFT' ? (n.dir === 'right' ? '>>' : '<<') : BLOCK_TITLE[n.type]}{ARITH.includes(n.type) ? ` ${bitWidth(n)}b` : n.type === 'REG' ? ` ${dataWidth(n)}b` : n.type === 'RAM' || n.type === 'ROM' ? ` ${1 << addrWidth(n)}×${dataWidth(n)}` : ''}</text>
          {(isFlipFlop(n.type) || n.type === 'REG') && (
            <text x={w / 2} y={h - 6} transform={upright(w / 2, h - 6)} textAnchor="middle" fontSize={11} fontWeight={700} fill={v ? on : 'var(--text-muted)'} pointerEvents="none">Q={formatBus(v, dataWidth(n))}</text>
          )}
        </>
      );
    } else if (n.type === 'SEG7') {
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={6} fill="#111827" stroke={stroke} strokeWidth={isSel ? 2.2 : 1.5} />
          <Seg7Face value={v} />
        </>
      );
    } else if (n.type === 'TUNNEL') {
      body = (
        <>
          <path d={`M0,0 H${w - 14} L${w},${h / 2} L${w - 14},${h} H0 Z`} fill={v ? 'rgba(34,197,94,0.12)' : 'var(--bg-surface)'} stroke={stroke} strokeWidth={isSel ? 2.2 : 1.4} />
          <text x={(w - 14) / 2 + 2} y={h / 2 + 4} transform={upright((w - 14) / 2 + 2, h / 2 + 4)} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-primary)" pointerEvents="none">{n.label || '?'}</text>
        </>
      );
    } else if (n.type === 'SPLIT' || n.type === 'MERGE') {
      // A bus bar: the bus pin in the middle of one side, single bits on the other.
      const split = n.type === 'SPLIT';
      const bx = split ? 10 : w - 10;
      const bits = dataWidth(n);
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} fill="transparent" />
          {Array.from({ length: bits }, (_, k) => {
            const y = (h * (k + 1)) / (bits + 1);
            return (
              <g key={k} pointerEvents="none">
                <line x1={split ? bx : 0} y1={y} x2={split ? w : bx} y2={y} stroke="var(--text-secondary)" strokeWidth={1.3} />
                <text x={split ? w - 3 : 3} y={y - 3} textAnchor={split ? 'end' : 'start'} fontSize={8} fill="var(--text-muted)">{k}</text>
              </g>
            );
          })}
          <line x1={split ? 0 : bx} y1={h / 2} x2={split ? bx : w} y2={h / 2} stroke="var(--text-secondary)" strokeWidth={3.5} pointerEvents="none" />
          <rect x={bx - 3} y={4} width={6} height={h - 8} rx={2} fill={isSel ? '#3b82f6' : 'var(--text-secondary)'} stroke={stroke} />
        </>
      );
    } else if (n.type === 'CONST') {
      body = (
        <>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={4} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.2 : 1.4} />
          <text x={w / 2} y={h / 2 + 5} transform={upright(w / 2, h / 2 + 5)} textAnchor="middle" fontSize={12} fontWeight={700} fill={v ? on : 'var(--text-secondary)'} pointerEvents="none">{formatBus(v, dataWidth(n))}</text>
        </>
      );
    } else if (n.type === 'CONST0' || n.type === 'CONST1') {
      body = (
        <>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={4} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.2 : 1.4} />
          <text x={w / 2} y={h / 2 + 5} transform={upright(w / 2, h / 2 + 5)} textAnchor="middle" fontSize={14} fontWeight={700} fill={n.type === 'CONST1' ? on : 'var(--text-secondary)'} pointerEvents="none">{n.type === 'CONST1' ? 1 : 0}</text>
        </>
      );
    } else body = <rect x={4} y={6} width={w - 8} height={h - 12} rx={8} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.4 : 1.4} />;

    // Inputs, outputs, LEDs, clocks and buttons stay upright when rotated:
    // only their pin moves, and the inside is laid out again for the new shape.
    const uprightIO = rot !== 0 && (['IN', 'OUT', 'LED', 'CLK', 'BTN'] as GateType[]).includes(n.type);
    if (uprightIO) body = null;
    const ioControls = (cx: number, cy: number, lx: number, ly: number, anchor: 'start' | 'middle' | 'end') => (
      <>
        {busIn && (
          <g data-testid={`gate-toggle-${n.label || n.id}`} onPointerDown={(e) => { e.stopPropagation(); setBusInput(n, (inputs[n.id] ?? 0) + (e.shiftKey ? -1 : 1)); }} style={{ cursor: 'pointer' }}>
            <title>{g.busHint}</title>
            <rect x={cx - 16} y={cy - 12} width={34} height={24} rx={5} fill={v ? 'rgba(34,197,94,0.18)' : 'var(--bg-panel)'} stroke={v ? on : 'var(--text-secondary)'} />
            <text x={cx + 1} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-primary)">{formatBus(v, dataWidth(n))}</text>
          </g>
        )}
        {n.type === 'IN' && !busIn && (
          <g data-testid={`gate-toggle-${n.label || n.id}`} onPointerDown={(e) => { e.stopPropagation(); toggleInput(n.id); }} style={{ cursor: 'pointer' }}>
            <rect x={cx - 12} y={cy - 12} width={24} height={24} rx={5} fill={v ? on : 'var(--bg-panel)'} stroke="var(--text-secondary)" />
            <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={v ? '#fff' : 'var(--text-primary)'}>{v}</text>
          </g>
        )}
        {n.type === 'CLK' && (
          <g data-testid={`gate-toggle-${n.label || n.id}`} onPointerDown={(e) => { e.stopPropagation(); toggleInput(n.id); }} style={{ cursor: 'pointer' }}>
            <rect x={cx - 12} y={cy - 12} width={24} height={24} rx={5} fill={v ? '#0ea5e9' : 'var(--bg-panel)'} stroke="var(--text-secondary)" />
            <path d={`M${cx - 9},${cy + 7} H${cx - 5} V${cy - 7} H${cx + 1} V${cy + 7} H${cx + 5} V${cy - 7} H${cx + 9}`} fill="none" stroke={v ? '#fff' : 'var(--text-primary)'} strokeWidth={1.6} />
          </g>
        )}
        {n.type === 'BTN' && (
          <g
            data-testid={`gate-button-${n.label || n.id}`}
            onPointerDown={(e) => { e.stopPropagation(); (e.currentTarget as Element).setPointerCapture?.(e.pointerId); setButton(n.id, 1); }}
            onPointerUp={(e) => { e.stopPropagation(); setButton(n.id, 0); }}
            onPointerCancel={() => setButton(n.id, 0)}
            style={{ cursor: 'pointer' }}
          >
            <title>{g.holdHint}</title>
            <rect x={cx - 12} y={cy - 12} width={24} height={24} rx={5} fill="var(--bg-panel)" stroke="var(--text-secondary)" />
            <circle cx={cx} cy={cy} r={v ? 6.5 : 8} fill={v ? '#2563eb' : '#334155'} />
          </g>
        )}
        {n.type === 'LED' && (
          <circle data-testid={`gate-led-${n.label || n.id}`} cx={cx} cy={cy} r={10} fill={v ? '#ef4444' : 'var(--bg-panel)'} stroke="var(--text-secondary)" style={{ filter: v ? 'drop-shadow(0 0 6px rgba(239,68,68,0.9))' : undefined }} />
        )}
        {busOut && (
          <g data-testid={`gate-output-${n.label || n.id}`}>
            <rect x={cx - 16} y={cy - 12} width={34} height={24} rx={12} fill={v ? 'rgba(239,68,68,0.18)' : 'var(--bg-panel)'} stroke={v ? '#ef4444' : 'var(--text-secondary)'} />
            <text x={cx + 1} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-primary)" pointerEvents="none">{formatBus(v, inW)}</text>
          </g>
        )}
        {n.type === 'OUT' && !busOut && (
          <g data-testid={`gate-output-${n.label || n.id}`}>
            <rect x={cx - 12} y={cy - 12} width={24} height={24} rx={12} fill={v ? '#ef4444' : 'var(--bg-panel)'} stroke="var(--text-secondary)" />
            <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={v ? '#fff' : 'var(--text-primary)'} pointerEvents="none">{v}</text>
          </g>
        )}
        {labelled(n.type) && n.type !== 'SEG7' && n.type !== 'TUNNEL' && (
          <text x={lx} y={ly} textAnchor={anchor} fontSize={12} fontWeight={600} fill="var(--text-primary)" pointerEvents="none">{n.label}</text>
        )}
      </>
    );
    const box = boxOf(n);
    const [bx, by, bw, bh] = [box.x - n.x, box.y - n.y, box.w, box.h];
    const sideways = rot === 90 || rot === 270;

    return (
      <g key={n.id} data-node={n.id} data-type={n.type} data-value={v} data-rot={rot} transform={`translate(${n.x},${n.y})`}>
        <g transform={rot ? `rotate(${rot} ${w / 2} ${h / 2})` : undefined}>
        <g onPointerDown={(e) => onNodeDown(e, n)} style={{ cursor: 'move' }}>
          {body}
          {glitch && <rect x={-4} y={-4} width={w + 8} height={h + 8} rx={10} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" />}
        </g>
        {!uprightIO && ioControls(22, H / 2, busIn || busOut ? 46 : 42, H / 2 + 4, 'start')}
        {n.type === 'SEG7' && <text x={w / 2} y={h + 13} transform={upright(w / 2, h + 13)} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text-primary)" pointerEvents="none">{n.label}</text>}
        {isGate(n.type) && (
          <text x={W / 2 - 4} y={h + 12} transform={upright(W / 2 - 4, h + 12)} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)" pointerEvents="none">
            {n.type}{timingMode ? ` · ${n.delay}t` : ''}
          </text>
        )}
        {/* Pin labels inside blocks; the clock pin gets the edge triangle. */}
        {isBlock(n.type) && inNames.map((nm, pin) => {
          const lp = localPin(n, 'i', pin);
          const y = lp.y;
          if (pin === clockPin && lp.side === 'L') return <path key={`l${pin}`} d={`M7,${y - 5} L14,${y} L7,${y + 5}`} fill="none" stroke="var(--text-secondary)" strokeWidth={1.3} pointerEvents="none" />;
          return <PinLabel key={`l${pin}`} n={n} p={lp} text={nm} />;
        })}
        {isBlock(n.type) && (outNames.length > 1 || n.type === 'BLOCK') && outNames.map((nm, pin) => {
          const lp = localPin(n, 'o', pin);
          return <PinLabel key={`o${pin}`} n={n} p={lp} text={nm} />;
        })}
        {/* Ports */}
        {inNames.map((_, pin) => {
          const lp = localPin(n, 'i', pin);
          return (
            <circle key={pin} data-port={`${n.id}:in${pin}`} cx={lp.x} cy={lp.y} r={6} fill={editing ? '#f59e0b' : pending ? '#3b82f6' : 'var(--bg-surface)'} stroke="var(--text-secondary)" strokeWidth={1.3} style={{ cursor: editing ? 'grab' : 'crosshair' }}
              onPointerDown={(e) => { e.stopPropagation(); if (editing) return startPinDrag(e, n, pinKey('i', pin)); if (pending) connect(n.id, pin); }} />
          );
        })}
        {outNames.map((_, pin) => {
          const lp = localPin(n, 'o', pin);
          const p = outPort(n, pin);
          const pv = shown(sig(n.id, pin));
          const active = pending?.id === n.id && pending.pin === pin;
          return (
            <circle key={`out${pin}`} data-port={`${n.id}:out${pin ? pin : ''}`} cx={lp.x} cy={lp.y} r={6} fill={editing ? '#f59e0b' : active ? '#3b82f6' : pv ? on : 'var(--bg-surface)'} stroke="var(--text-secondary)" strokeWidth={1.3} style={{ cursor: editing ? 'grab' : 'crosshair' }}
              onPointerDown={(e) => { e.stopPropagation(); if (editing) return startPinDrag(e, n, pinKey('o', pin)); setPending(active ? null : { id: n.id, pin }); setMouse(p); }} />
          );
        })}
        </g>
        {uprightIO && (
          <>
            <g onPointerDown={(e) => onNodeDown(e, n)} style={{ cursor: 'move' }}>
              <rect x={bx + 4} y={by + 4} width={bw - 8} height={bh - 8} rx={8} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.4 : 1.4} />
            </g>
            {sideways
              ? ioControls(bx + bw / 2, by + (rot === 90 ? 26 : bh - 26), bx + bw / 2, by + (rot === 90 ? bh - 12 : 22), 'middle')
              : ioControls(bx + bw - 22, by + bh / 2, bx + bw - (busIn || busOut ? 44 : 40), by + bh / 2 + 4, 'end')}
          </>
        )}
      </g>
    );
  };

  return (
    <div data-testid="gate-editor" className="absolute inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <h1 className="text-[0.875rem] font-bold mr-2">{g.title}</h1>
        <button type="button" className={btn} style={btnStyle} data-testid="gate-undo" title={g.undo} aria-label={g.undo} disabled={!undoStack.current.length} onClick={undo}><Undo2 size={14} /></button>
        <button type="button" className={btn} style={btnStyle} data-testid="gate-redo" title={g.redo} aria-label={g.redo} disabled={!redoStack.current.length} onClick={redo}><Redo2 size={14} /></button>
        <span className="w-px h-6" style={{ backgroundColor: 'var(--border-subtle)' }} />
        <div ref={menuRef} className="flex items-center gap-1.5 flex-wrap">
          {PALETTE.map(({ category, types }) => (
            <div key={category} className="relative">
              <button type="button" data-testid={`gate-menu-${category}`} aria-haspopup="menu" aria-expanded={menu === category} className={btn} style={{ ...btnStyle, backgroundColor: menu === category ? 'var(--accent-subtle)' : btnStyle.backgroundColor }} onClick={() => setMenu(menu === category ? null : category)}>
                {g.categories[category]} <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>
              {menu === category && (
                <div role="menu" className="absolute left-0 top-full mt-1 z-40 min-w-[14.375rem] p-1 rounded-[0.375rem] border shadow-lg flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  {types.map((t) => (
                    <button key={t} type="button" role="menuitem" data-testid={`gate-add-${t}`} onClick={() => addNode(t)} className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-[0.25rem] text-left text-[0.7812rem] hover:bg-[var(--accent-subtle)]" style={{ color: 'var(--text-primary)' }}>
                      <span className="w-[1.75rem] flex justify-center" style={{ color: 'var(--text-secondary)' }}><PartIcon type={t} /></span>
                      {g.partNames[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="relative">
            <button type="button" data-testid="gate-menu-blocks" aria-haspopup="menu" aria-expanded={menu === 'blocks'} className={btn} style={{ ...btnStyle, backgroundColor: menu === 'blocks' ? 'var(--accent-subtle)' : btnStyle.backgroundColor }} onClick={() => setMenu(menu === 'blocks' ? null : 'blocks')}>
              <Boxes size={13} /> {g.myBlocks} <ChevronDown size={12} style={{ opacity: 0.7 }} />
            </button>
            {menu === 'blocks' && (
              <div role="menu" className="absolute left-0 top-full mt-1 z-40 min-w-[16rem] max-w-[22rem] p-1 rounded-[0.375rem] border shadow-lg flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                <button type="button" role="menuitem" data-testid="gate-save-block" onClick={saveAsBlock} className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-[0.25rem] text-left text-[0.7812rem] font-semibold hover:bg-[var(--accent-subtle)]" style={{ color: 'var(--accent-primary)' }}>
                  <Plus size={14} /> {g.saveAsBlock}
                </button>
                <div className="h-px my-1" style={{ backgroundColor: 'var(--border-subtle)' }} />
                {Object.values(library).length === 0 && <p className="px-2.5 py-1.5 text-[0.7188rem]" style={{ color: 'var(--text-muted)' }}>{g.noBlocks}</p>}
                {Object.values(library).sort((a, b) => a.name.localeCompare(b.name)).map((b) => {
                  const pins = blockPins(b.circuit);
                  return (
                    <div key={b.id} className="flex items-center gap-1 rounded-[0.25rem] hover:bg-[var(--accent-subtle)]">
                      <button type="button" role="menuitem" data-testid={`gate-add-block-${b.name}`} onClick={() => addBlock(b.id)} className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-1.5 text-left text-[0.7812rem]" style={{ color: 'var(--text-primary)' }}>
                        <span className="w-[1.75rem] flex justify-center" style={{ color: 'var(--text-secondary)' }}><PartIcon type="BLOCK" /></span>
                        <span className="truncate">{b.name}</span>
                        <span className="ml-auto text-[0.6875rem] shrink-0" style={{ color: 'var(--text-muted)' }}>{pins.ins.length}→{pins.outs.length}</span>
                      </button>
                      <button type="button" aria-label={g.delete} title={g.delete} onClick={() => deleteBlock(b.id)} className="p-1.5 rounded hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-muted)' }}><X size={13} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <span className="flex-1" />
        <label className="flex items-center gap-1.5 text-[0.75rem]">
          {g.presets}
          <select className="h-8 px-2 rounded-[0.25rem] border text-[0.75rem]" style={btnStyle} value="" onChange={(e) => e.target.value && loadPreset(e.target.value)} data-testid="gate-preset">
            <option value="">—</option>
            {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.title[lang]}</option>)}
          </select>
        </label>
        <div className="relative" ref={undefined}>
          <button type="button" data-testid="gate-menu-file" aria-haspopup="menu" aria-expanded={menu === 'file'} className={btn} style={{ ...btnStyle, backgroundColor: menu === 'file' ? 'var(--accent-subtle)' : btnStyle.backgroundColor }} onClick={() => setMenu(menu === 'file' ? null : 'file')}>
            {g.file} <ChevronDown size={12} style={{ opacity: 0.7 }} />
          </button>
          {menu === 'file' && (
            <div role="menu" className="absolute right-0 top-full mt-1 z-40 min-w-[14rem] p-1 rounded-[0.375rem] border shadow-lg flex flex-col" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              {[
                { id: 'new', icon: <Plus size={14} />, label: g.newCircuit, run: newCircuit },
                { id: 'open', icon: <FileUp size={14} />, label: g.openFile, run: () => { setMenu(null); fileRef.current?.click(); } },
                { id: 'save', icon: <FileDown size={14} />, label: g.saveFile, run: saveFile },
                { id: 'share', icon: <Link2 size={14} />, label: g.shareLink, run: () => void copyShareLink() },
              ].map((it) => (
                <button key={it.id} type="button" role="menuitem" data-testid={`gate-file-${it.id}`} onClick={it.run} className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-[0.25rem] text-left text-[0.7812rem] hover:bg-[var(--accent-subtle)]" style={{ color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{it.icon}</span> {it.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" data-testid="gate-file-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Canvas */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="px-3 py-1.5 text-[0.7188rem] flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
            <span>{pending ? g.connectHint : g.help}</span>
            {notice && <span data-testid="gate-notice" style={{ color: notice.kind === 'ok' ? '#16a34a' : '#ef4444' }}>{notice.text}</span>}
            {ev.loop.length > 0 && <span style={{ color: '#ef4444' }}>{g.loopWarning}</span>}
            {ev.floating.length > 0 && <span style={{ color: '#d97706' }}>{fmt(g.floatingWarning, { n: ev.floating.length })}</span>}
            {mismatched.size > 0 && <span data-testid="gate-width-warning" style={{ color: '#ef4444' }}>{fmt(g.widthMismatch, { n: mismatched.size })}</span>}
          </div>
          {showGraph && (
            <div data-testid="gate-clock-bar" className="mx-3 mb-2 px-3 py-2 rounded-[0.375rem] border flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <span className="text-[0.75rem] font-semibold flex items-center gap-1.5"><Timer size={14} /> {g.clock}</span>
              <button type="button" className={btn} style={btnStyle} data-testid="gate-clock-pulse" disabled={clocks.length === 0 || running} onClick={pulse}><Zap size={13} /> {g.clockPulse}</button>
              <button type="button" className={btn} style={btnStyle} data-testid="gate-clock-run" disabled={clocks.length === 0} onClick={() => setRunning((r) => !r)}>
                {running ? <Pause size={13} /> : <Play size={13} />} {running ? g.stopClock : g.autoClock}
              </button>
              {sequential && <button type="button" className={btn} style={btnStyle} data-testid="gate-reset-ff" onClick={resetFlipFlops}><RotateCcw size={13} /> {g.resetFF}</button>}
              {sequential && (
                <span data-testid="gate-ff-state" className="text-[0.75rem] font-mono ml-1" style={{ color: 'var(--text-secondary)' }}>
                  {ffs.map((f, i) => `Q${i}=${formatBus(seq.q[f.id] ?? 0, dataWidth(f))}`).join('  ')}
                </span>
              )}
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-auto px-3 pb-3">
            <svg
              ref={svgRef}
              data-testid="gate-canvas"
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className="w-full min-w-[45rem] rounded-[0.375rem] border select-none"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-canvas, var(--bg-panel))', touchAction: 'none' }}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerDown={(e) => { setPending(null); const p = toPoint(e); marqueeRef.current = { x0: p.x, y0: p.y, moved: false }; try { svgRef.current?.setPointerCapture(e.pointerId); } catch { /* optional */ } }}
            >
              <defs>
                <pattern id="gate-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="var(--canvas-grid, rgba(128,128,128,0.18))" />
                </pattern>
              </defs>
              <rect width={CANVAS_W} height={CANVAS_H} fill="url(#gate-grid)" />

              {/* Wires */}
              {circuit.wires.map((w) => {
                const a = byId.get(w.from);
                const b = byId.get(w.to);
                if (!a || !b) return null;
                const v = shown(sig(w.from, w.fromPin ?? 0));
                const isSel = selected?.kind === 'wire' && selected.id === w.id;
                const pa = outPort(a, w.fromPin ?? 0);
                const pb = inPort(b, w.pin);
                const bends = w.bends && w.bends.length % 2 === 1 ? w.bends : autoBends(pa, pb, pinDir(a, 'o', w.fromPin ?? 0), pinDir(b, 'i', w.pin));
                const pts = routePoints(pa, pb, bends);
                const dpath = pointsPath(pts);
                // Segment k runs pts[k] -> pts[k+1]. Segments 1..n-2 belong to
                // bends[k-1] and can be dragged; the two at the ports cannot.
                const segs = pts.slice(0, -1).map((p0, k) => ({ p0, p1: pts[k + 1], index: k >= 1 && k <= bends.length ? k - 1 : -1 }));
                const startDrag = (e: React.PointerEvent, index: number) => {
                  e.stopPropagation();
                  setSelected({ kind: 'wire', id: w.id });
                  if (index < 0) return;
                  if (!w.bends) setCircuit((c) => ({ ...c, wires: c.wires.map((x) => (x.id === w.id ? { ...x, bends } : x)) }));
                  wireDrag.current = { id: w.id, index };
                  try {
                    (svgRef.current as Element | null)?.setPointerCapture?.(e.pointerId);
                  } catch {
                    /* capture is optional */
                  }
                };
                const addBend = (e: React.MouseEvent, k: number) => {
                  e.stopPropagation();
                  const pt = toPoint(e);
                  const x = Math.round(pt.x / 10) * 10;
                  const y = Math.round(pt.y / 10) * 10;
                  const s0 = segs[k];
                  const vertical = s0.p0.x === s0.p1.x;
                  let next: number[];
                  if (k === 0) next = [x, pa.y, ...bends];
                  else if (k === segs.length - 1) next = [...bends, pb.y, x];
                  else next = [...bends.slice(0, k), vertical ? y : x, bends[k - 1], ...bends.slice(k)];
                  setCircuit((c) => ({ ...c, wires: c.wires.map((x2) => (x2.id === w.id ? { ...x2, bends: next } : x2)) }));
                  setSelected({ kind: 'wire', id: w.id });
                };
                const bw = widthOf(sig(w.from, w.fromPin ?? 0));
                const bad = mismatched.has(w.id);
                // A bus is drawn thick, with its value on the longest segment.
                const longest = segs.reduce((m, sg) => (Math.abs(sg.p1.x - sg.p0.x) + Math.abs(sg.p1.y - sg.p0.y) > Math.abs(m.p1.x - m.p0.x) + Math.abs(m.p1.y - m.p0.y) ? sg : m), segs[0]);
                return (
                  <g key={w.id} data-wire={w.id} data-value={v} data-width={bw} data-mismatch={bad ? 'true' : undefined}>
                    {segs.map((sg, k) => {
                      const vertical = sg.p0.x === sg.p1.x;
                      const cursor = sg.index < 0 ? 'pointer' : vertical ? 'ew-resize' : 'ns-resize';
                      return (
                        <line key={k} data-wire-seg={`${w.id}:${k}`} x1={sg.p0.x} y1={sg.p0.y} x2={sg.p1.x} y2={sg.p1.y} stroke="transparent" strokeWidth={12}
                          onPointerDown={(e) => startDrag(e, sg.index)} onDoubleClick={(e) => addBend(e, k)} style={{ cursor: isSel ? cursor : 'pointer' }} />
                      );
                    })}
                    <path d={dpath} fill="none" stroke={bad ? '#ef4444' : isSel ? '#3b82f6' : v ? on : off} strokeWidth={bw > 1 ? (isSel ? 5 : 4.2) : isSel ? 3 : 2.2} strokeDasharray={bad ? '7 4' : undefined} strokeLinejoin="round" pointerEvents="none" />
                    {bw > 1 && longest && (
                      <text x={(longest.p0.x + longest.p1.x) / 2 + (longest.p0.x === longest.p1.x ? 6 : 0)} y={(longest.p0.y + longest.p1.y) / 2 - (longest.p0.x === longest.p1.x ? 0 : 5)} fontSize={9.5} fontWeight={700} fill="var(--text-secondary)" pointerEvents="none">
                        {formatBus(v, bw)}<tspan fontSize={8} fontWeight={400} fill="var(--text-muted)"> /{bw}</tspan>
                      </text>
                    )}
                    {isSel && segs.filter((sg) => sg.index >= 0).map((sg) => (
                      <rect key={`h${sg.index}`} x={(sg.p0.x + sg.p1.x) / 2 - 4} y={(sg.p0.y + sg.p1.y) / 2 - 4} width={8} height={8} rx={1.5} fill="#fff" stroke="#3b82f6" strokeWidth={1.5} pointerEvents="none" />
                    ))}
                  </g>
                );
              })}
              {pending && mouse && byId.get(pending.id) && (
                <path d={wirePath(outPort(byId.get(pending.id)!, pending.pin), mouse)} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />
              )}

              {circuit.nodes.map(renderNode)}
              {marquee && (
                <rect data-testid="gate-marquee" x={Math.min(marquee.x0, marquee.x1)} y={Math.min(marquee.y0, marquee.y1)} width={Math.abs(marquee.x1 - marquee.x0)} height={Math.abs(marquee.y1 - marquee.y0)} fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeDasharray="5 4" pointerEvents="none" />
              )}
            </svg>

            {/* Clocked timing diagram */}
            {showGraph && (
              <div className="mt-3 rounded-[0.375rem] border p-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-[0.7812rem] font-semibold">{g.dataGraph}</h2>
                  <span className="text-[0.7188rem]" style={{ color: 'var(--text-secondary)' }}>{g.dataGraphHint}</span>
                  {history.length > 0 && <button type="button" className="underline text-[0.7188rem] ml-auto" onClick={() => setHistory([])}>{g.clearGraph}</button>}
                </div>
                {history.length === 0 ? (
                  <p className="text-[0.75rem] mt-2" style={{ color: 'var(--text-muted)' }}>{g.dataGraphEmpty}</p>
                ) : (
                  <DataGraph history={history} rows={[...ins, ...ffs, ...outs, ...displays]} />
                )}
              </div>
            )}

            {/* Timing / glitch view */}
            <div className="mt-3 rounded-[0.375rem] border p-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 text-[0.7812rem] font-semibold">
                  <input type="checkbox" data-testid="gate-timing" checked={timingMode} onChange={(e) => { setTimingMode(e.target.checked); setTrace(null); }} />
                  <Timer size={14} /> {g.timingMode}
                </label>
                <span className="text-[0.7188rem]" style={{ color: 'var(--text-secondary)' }}>{timingMode ? g.timingHint : g.timingOff}</span>
                {trace && (
                  <span className="flex items-center gap-2 text-[0.7188rem] ml-auto">
                    t = {traceTime} / {trace.end}
                    <input type="range" min={0} max={trace.end} value={traceTime} onChange={(e) => setTraceTime(Number(e.target.value))} />
                    <button type="button" className="underline" onClick={() => setTraceTime(0)}>{g.replay}</button>
                  </span>
                )}
              </div>
              {trace && (
                <>
                  <p data-testid="gate-glitch-result" className="text-[0.75rem] mt-2" style={{ color: trace.glitches.length ? '#d97706' : '#16a34a' }}>
                    {trace.glitches.length
                      ? fmt(g.glitchFound, { names: trace.glitches.map((id) => byId.get(id)?.label || byId.get(id)?.type || id).join(', ') })
                      : g.noGlitch}
                  </p>
                  <TimingDiagram trace={trace} nodes={circuit.nodes} time={traceTime} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <aside className="lg:w-[22.5rem] shrink-0 border-t lg:border-t-0 lg:border-l overflow-y-auto p-3 flex flex-col gap-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
          {multi.length > 1 ? (
            <div className="flex flex-col gap-2" data-testid="gate-multi-panel">
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{fmt(g.selectedCount, { n: multi.length })}</h2>
              <div className="flex gap-2 flex-wrap">
                <button type="button" className={btn} style={btnStyle} onClick={() => rotateSelection(90)}><RotateCw size={13} /> {g.rotate}</button>
                <button type="button" className={btn} style={btnStyle} onClick={copySelection}><Copy size={13} /> {g.copySel}</button>
                <button type="button" className={btn} style={btnStyle} data-testid="gate-duplicate" onClick={duplicate}><CopyPlus size={13} /> {g.duplicate}</button>
                <button type="button" className={btn} style={btnStyle} disabled={!clipboard.current} onClick={() => pasteClipboard()}><ClipboardPaste size={13} /> {g.paste}</button>
                <button type="button" className={btn} style={btnStyle} onClick={removeSelected}><Trash2 size={13} /> {g.deleteSel}</button>
              </div>
            </div>
          ) : sel ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{g.selected}: {g.partNames[sel.type]}</h2>
              {labelled(sel.type) && (
                <label className="text-[0.75rem] flex flex-col gap-1">
                  {g.signalName}
                  <input value={sel.label} onChange={(e) => updateNode(sel.id, { label: e.target.value })} className="h-8 px-2 rounded-[0.25rem] border text-[0.8125rem] font-mono" style={btnStyle} />
                </label>
              )}
              {MULTI_INPUT.includes(sel.type) && (
                <label className="text-[0.75rem] flex items-center gap-2">
                  {g.inputsCount}
                  <select data-testid="gate-input-count" value={inputNames(sel).length} onChange={(e) => setInputCount(sel, Number(e.target.value))} className="h-8 px-2 rounded-[0.25rem] border text-[0.8125rem]" style={btnStyle}>
                    {[2, 3, 4].map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
              )}
              {ARITH.includes(sel.type) && (
                <>
                  <label className="text-[0.75rem] flex items-center gap-2">
                    {g.bitWidth}
                    <select data-testid="gate-bit-width" value={bitWidth(sel)} onChange={(e) => reshape(sel, { bits: Number(e.target.value) })} className="h-8 px-2 rounded-[0.25rem] border text-[0.8125rem]" style={btnStyle}>
                      {(sel.type === 'SHIFT' ? [2, 3, 4] : [1, 2, 3, 4]).map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </label>
                  {sel.type === 'SHIFT' && (
                    <label className="text-[0.75rem] flex items-center gap-2">
                      {g.shiftDir}
                      <select data-testid="gate-shift-dir" value={sel.dir ?? 'left'} onChange={(e) => reshape(sel, { dir: e.target.value as 'left' | 'right' })} className="h-8 px-2 rounded-[0.25rem] border text-[0.8125rem]" style={btnStyle}>
                        <option value="left">{g.shiftLeft}</option>
                        <option value="right">{g.shiftRight}</option>
                      </select>
                    </label>
                  )}
                  <p className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{g.arithNote}</p>
                </>
              )}
              {WIDE.includes(sel.type) && (
                <label className="text-[0.75rem] flex items-center gap-2">
                  {g.busWidth}
                  <select data-testid="gate-bus-width" value={dataWidth(sel)} onChange={(e) => reshape(sel, { width: Number(e.target.value) })} className="h-8 px-2 rounded-[0.25rem] border text-[0.8125rem]" style={btnStyle}>
                    {Array.from({ length: MAX_WIDTH }, (_, k) => k + 1).filter((k) => k > 1 || (sel.type !== 'SPLIT' && sel.type !== 'MERGE')).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
              )}
              {(sel.type === 'RAM' || sel.type === 'ROM') && (
                <label className="text-[0.75rem] flex items-center gap-2">
                  {g.addrBits}
                  <select data-testid="gate-addr-bits" value={addrWidth(sel)} onChange={(e) => reshape(sel, { addrBits: Number(e.target.value) })} className="h-8 px-2 rounded-[0.25rem] border text-[0.8125rem]" style={btnStyle}>
                    {Array.from({ length: MAX_ADDR }, (_, k) => k + 1).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <span style={{ color: 'var(--text-muted)' }}>{fmt(g.memorySize, { words: 1 << addrWidth(sel), bits: dataWidth(sel) })}</span>
                </label>
              )}
              {(sel.type === 'CONST' || (sel.type === 'IN' && dataWidth(sel) > 1)) && (
                <label className="text-[0.75rem] flex items-center gap-2">
                  {sel.type === 'CONST' ? g.constValue : g.busValue}
                  <input
                    key={`${sel.id}:${sel.type === 'CONST' ? sel.value ?? 0 : inputs[sel.id] ?? 0}`}
                    data-testid="gate-bus-value"
                    defaultValue={String(sel.type === 'CONST' ? sel.value ?? 0 : inputs[sel.id] ?? 0)}
                    onBlur={(e) => {
                      const v = parseNumber(e.target.value);
                      if (v === null) return;
                      if (sel.type === 'CONST') updateNode(sel.id, { value: v & maskOf(dataWidth(sel)) });
                      else setBusInput(sel, v);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="h-8 w-28 px-2 rounded-[0.25rem] border text-[0.8125rem] font-mono" style={btnStyle}
                  />
                </label>
              )}
              {sel.type === 'IN' && dataWidth(sel) > 1 && <p className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{g.busHint}</p>}
              {sel.type === 'ROM' && (
                <label className="text-[0.75rem] flex flex-col gap-1">
                  {g.romContents}
                  <textarea
                    key={`${sel.id}:${(sel.data ?? []).join(',')}`}
                    data-testid="gate-rom-data"
                    defaultValue={(sel.data ?? []).map((x) => formatBus(x, Math.max(5, dataWidth(sel)))).join(' ')}
                    onBlur={(e) => {
                      const words = e.target.value.split(/[\s,;]+/).filter(Boolean).map((t) => parseNumber(t) ?? 0).slice(0, 1 << addrWidth(sel)).map((x) => x & maskOf(dataWidth(sel)));
                      updateNode(sel.id, { data: words });
                    }}
                    rows={3}
                    className="px-2 py-1 rounded-[0.25rem] border text-[0.8125rem] font-mono" style={btnStyle}
                  />
                  <span className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{g.romHint}</span>
                </label>
              )}
              {sel.type === 'REG' && <p className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{g.regHint}</p>}
              {sel.type === 'RAM' && (
                <div className="flex flex-col gap-1">
                  <p className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{g.ramHint}</p>
                  <p data-testid="gate-ram-state" className="text-[0.6875rem] font-mono break-all" style={{ color: 'var(--text-secondary)' }}>
                    {g.memoryState}: {Array.from({ length: Math.min(16, 1 << addrWidth(sel)) }, (_, k) => formatBus(seq.q[`${sel.id}@${k}`] ?? 0, Math.max(5, dataWidth(sel)))).join(' ')}{(1 << addrWidth(sel)) > 16 ? ' …' : ''}
                  </p>
                </div>
              )}
              {!labelled(sel.type) && !isFlipFlop(sel.type) && !CLOCKED.includes(sel.type) && sel.type !== 'CONST0' && sel.type !== 'CONST1' && sel.type !== 'CONST' && sel.type !== 'BLOCK' && (
                <label className="text-[0.75rem] flex items-center gap-2">
                  {g.delay}
                  <input type="number" min={1} max={5} value={sel.delay} onChange={(e) => updateNode(sel.id, { delay: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })} className="h-8 w-16 px-2 rounded-[0.25rem] border text-[0.8125rem]" style={btnStyle} />
                </label>
              )}
              {sel.type === 'TUNNEL' && <p className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{g.tunnelHint}</p>}
              <div className="flex gap-2 flex-wrap">
                <button type="button" className={btn} style={btnStyle} data-testid="gate-rotate-left" title={g.rotateLeft} aria-label={g.rotateLeft} onClick={() => rotateSelection(-90)}><RotateCcw size={13} /></button>
                <button type="button" className={btn} style={btnStyle} data-testid="gate-rotate-right" title={g.rotateRight} aria-label={g.rotateRight} onClick={() => rotateSelection(90)}><RotateCw size={13} /> {g.rotate}</button>
                <button type="button" className={btn} style={btnStyle} data-testid="gate-duplicate" onClick={duplicate}><CopyPlus size={13} /> {g.duplicate}</button>
                <button type="button" className={btn} style={btnStyle} onClick={removeSelected}><Trash2 size={13} /> {g.delete}</button>
              </div>
              {sel.type === 'BLOCK' && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" className={btn} data-testid="gate-edit-pins" style={{ ...btnStyle, ...(pinEdit === sel.id ? { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' } : {}) }} onClick={() => setPinEdit(pinEdit === sel.id ? null : sel.id)}>
                      <Move size={13} /> {pinEdit === sel.id ? g.pinsDone : g.editPins}
                    </button>
                    {sel.pinLayout && Object.keys(sel.pinLayout).length > 0 && (
                      <button type="button" className={btn} style={btnStyle} data-testid="gate-reset-pins" onClick={() => updateNode(sel.id, { pinLayout: undefined })}>{g.resetPins}</button>
                    )}
                  </div>
                  {pinEdit === sel.id && <p className="text-[0.6875rem]" style={{ color: '#d97706' }}>{g.editPinsHint}</p>}
                </div>
              )}
            </div>
          ) : selected?.kind === 'wire' ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{g.selected}: {g.wire}</h2>
              <p className="text-[0.7188rem]" style={{ color: 'var(--text-secondary)' }}>{g.wireHint}</p>
              <div className="flex gap-2 flex-wrap">
                <button type="button" className={btn} style={btnStyle} data-testid="gate-wire-auto" onClick={() => setCircuit((c) => ({ ...c, wires: c.wires.map((w) => (w.id === selected.id ? { id: w.id, from: w.from, to: w.to, pin: w.pin, ...(w.fromPin ? { fromPin: w.fromPin } : {}) } : w)) }))}><RotateCcw size={13} /> {g.wireAuto}</button>
                <button type="button" className={btn} style={btnStyle} onClick={removeSelected}><Trash2 size={13} /> {g.deleteWire}</button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-[0.75rem] flex items-center gap-2">
              {g.moduleName}
              <input value={name} onChange={(e) => setName(e.target.value)} className="h-8 flex-1 px-2 rounded-[0.25rem] border text-[0.8125rem] font-mono" style={btnStyle} />
            </label>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className={btn} style={btnStyle} onClick={openInDe2} data-testid="gate-open-de2" disabled={ins.length === 0 || outs.length + displays.length === 0}><Cpu size={13} /> {g.openDe2}</button>
              <OpenInSchematicButton className={btn} labelClassName="" getFiles={() => [{ name: `${name || 'gate_design'}.sv`, content: verilog }]} />
              <button type="button" className={btn} style={btnStyle} onClick={copyCode}><Copy size={13} /> {copied ? g.copied : g.copy}</button>
            </div>
            <p className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{g.de2Note}</p>
            <pre data-testid="gate-verilog" className="text-[0.7188rem] leading-snug p-2 rounded-[0.25rem] border overflow-auto max-h-[16.25rem] font-mono" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}>{verilog}</pre>
          </div>

          <div>
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{g.truthTable}</h2>
            {table ? (
              <table data-testid="gate-truth-table" className="text-[0.75rem] font-mono border-collapse">
                <thead>
                  <tr>
                    {table.ins.map((n) => <th key={n.id} className="px-2 py-0.5 text-left">{n.label}</th>)}
                    {table.outs.map((n) => <th key={n.id} className="px-2 py-0.5 text-left" style={{ borderLeft: '1px solid var(--border-subtle)' }}>{n.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, i) => {
                    const current = table.ins.every((n, k) => (inputs[n.id] ?? 0) === r.in[k]);
                    return (
                      <tr key={i} style={{ backgroundColor: current ? 'var(--accent-subtle)' : undefined }}>
                        {r.in.map((b, k) => <td key={k} className="px-2 py-0.5">{b}</td>)}
                        {r.out.map((b, k) => (
                          <td key={k} className="px-2 py-0.5 font-semibold" style={{ borderLeft: '1px solid var(--border-subtle)', color: b ? on : undefined }}>
                            {table.outs[k].type === 'SEG7' ? b.toString(16).toUpperCase() : b}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>{sequential ? g.tableSequential : g.tableNeedsInputs}</p>
            )}
          </div>
          <div data-testid="gate-tests">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}><FlaskConical size={13} /> {g.tests}</h2>
            <p className="text-[0.6875rem] mb-1.5" style={{ color: 'var(--text-muted)' }}>{g.testHint}</p>
            <textarea data-testid="gate-test-text" value={tests} onChange={(e) => { setTests(e.target.value); setTestResult(null); }} rows={6} spellCheck={false} className="w-full px-2 py-1.5 rounded-[0.25rem] border text-[0.75rem] font-mono" style={btnStyle} placeholder={'a b | y\n0 0 | 0\n0 1 | 1'} />
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <button type="button" className={btn} style={btnStyle} data-testid="gate-test-template" onClick={() => { setTests(testTemplate(flat)); setTestResult(null); }}>{g.testTemplate}</button>
              <button type="button" className={`${btn} text-white`} style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }} data-testid="gate-test-run" onClick={runTest}><Play size={13} /> {g.testRun}</button>
            </div>
            {testResult && (
              <div className="mt-2" data-testid="gate-test-result">
                {testResult.error ? (
                  <p className="text-[0.75rem]" style={{ color: '#ef4444' }}>{testError(testResult.error)}</p>
                ) : (
                  <>
                    <p className="text-[0.75rem] font-semibold" style={{ color: testResult.failed ? '#ef4444' : '#16a34a' }}>
                      {testResult.failed ? fmt(g.testFailed, { failed: testResult.failed, total: testResult.rows.length }) : fmt(g.testPassed, { n: testResult.rows.length })}
                    </p>
                    {testResult.failed > 0 && (
                      <table className="text-[0.6875rem] font-mono border-collapse mt-1">
                        <thead>
                          <tr>
                            <th className="px-1.5 text-left" style={{ color: 'var(--text-muted)' }}>{g.testLine}</th>
                            {testResult.rows[0]?.cells.map((c) => <th key={c.name} className="px-1.5 text-left">{c.name}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {testResult.rows.filter((r) => !r.ok).slice(0, 12).map((r) => (
                            <tr key={r.line}>
                              <td className="px-1.5" style={{ color: 'var(--text-muted)' }}>{r.line}</td>
                              {r.cells.map((c) => (
                                <td key={c.name} className="px-1.5" style={{ color: c.ok ? undefined : '#ef4444', fontWeight: c.ok ? 400 : 700 }} title={c.ok ? undefined : `${g.testExpected} ${c.want}`}>
                                  {c.input ? c.want : c.ok ? c.got : `${c.got}≠${c.want}`}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Step-by-step record of sources, flip-flops and outputs (like a logic analyzer). */
function DataGraph({ history, rows }: { history: Sample[]; rows: GateNode[] }) {
  const shownRows = rows.filter((n) => history.some((s) => n.id in s));
  const nameW = 78;
  const step = Math.max(10, Math.min(28, Math.floor(560 / Math.max(1, history.length))));
  const rowH = 24;
  const width = nameW + step * history.length + 10;
  let ffIndex = 0;
  return (
    <svg data-testid="gate-data-graph" width="100%" viewBox={`0 0 ${width} ${shownRows.length * rowH + 20}`} className="mt-2" style={{ maxWidth: Math.max(360, width) }}>
      {history.map((_, i) => (
        <g key={i}>
          <line x1={nameW + i * step} x2={nameW + i * step} y1={0} y2={shownRows.length * rowH} stroke="var(--border-subtle)" strokeWidth={0.5} />
          {i % Math.max(1, Math.round(history.length / 12)) === 0 && <text x={nameW + i * step + 2} y={shownRows.length * rowH + 13} fontSize={9} fill="var(--text-muted)">{i}</text>}
        </g>
      ))}
      {shownRows.map((n, r) => {
        const top = r * rowH + 5;
        const hi = top;
        const lo = top + rowH - 10;
        const label = isFlipFlop(n.type) || n.type === 'REG' ? `Q${ffIndex++}` : n.label || n.type;
        const color = isFlipFlop(n.type) || n.type === 'REG' ? '#8b5cf6' : n.type === 'CLK' ? '#0ea5e9' : SOURCES.includes(n.type) ? '#3b82f6' : '#22c55e';
        if (dataWidth(n) > 1 || history.some((smp) => (smp[n.id] ?? 0) > 1)) {
          // A bus: one box per value, like a logic analyser's bus lane.
          const w = dataWidth(n) > 1 ? dataWidth(n) : history.some((smp) => (smp[n.id] ?? 0) > 15) ? 8 : 4;
          const runs: Array<{ from: number; to: number; v: number }> = [];
          history.forEach((smp, i) => {
            const v = smp[n.id] ?? 0;
            const last = runs[runs.length - 1];
            if (last && last.v === v) last.to = i + 1;
            else runs.push({ from: i, to: i + 1, v });
          });
          return (
            <g key={n.id} data-bus-row={n.id}>
              <text x={4} y={top + 11} fontSize={10.5} fill="var(--text-primary)" fontFamily="var(--font-mono)">{label}</text>
              {runs.map((run, k) => {
                const x0 = nameW + run.from * step;
                const x1 = nameW + run.to * step;
                const mid = (hi + lo) / 2;
                return (
                  <g key={k}>
                    <path d={`M${x0},${mid} L${x0 + 3},${hi} H${x1 - 3} L${x1},${mid} L${x1 - 3},${lo} H${x0 + 3} Z`} fill="none" stroke={color} strokeWidth={1.3} />
                    {x1 - x0 > 14 && <text x={(x0 + x1) / 2} y={mid + 3.5} fontSize={9.5} textAnchor="middle" fill="var(--text-primary)" fontFamily="var(--font-mono)">{formatBus(run.v, w)}</text>}
                  </g>
                );
              })}
            </g>
          );
        }
        if (n.type === 'SEG7') {
          return (
            <g key={n.id}>
              <text x={4} y={top + 11} fontSize={10.5} fill="var(--text-primary)" fontFamily="var(--font-mono)">{label}</text>
              {history.map((s, i) => (
                <text key={i} x={nameW + i * step + step / 2} y={top + 11} fontSize={10} textAnchor="middle" fill="#ef4444" fontFamily="var(--font-mono)">{(s[n.id] ?? 0).toString(16).toUpperCase()}</text>
              ))}
            </g>
          );
        }
        let dpath = '';
        history.forEach((s, i) => {
          const y = s[n.id] ? hi : lo;
          dpath += i === 0 ? `M${nameW},${y}` : `V${y}`;
          dpath += `H${nameW + (i + 1) * step}`;
        });
        return (
          <g key={n.id}>
            <text x={4} y={top + 11} fontSize={10.5} fill="var(--text-primary)" fontFamily="var(--font-mono)">{label}</text>
            <path d={dpath} fill="none" stroke={color} strokeWidth={1.6} />
          </g>
        );
      })}
    </svg>
  );
}

function TimingDiagram({ trace, nodes, time }: { trace: Trace; nodes: GateNode[]; time: number }) {
  const rows = nodes.flatMap((n) => {
    if (SINKS.includes(n.type)) return trace.changes[n.id] ? [{ key: n.id, node: n, label: n.label || n.type }] : [];
    if (n.type === 'SEG7' || isFlipFlop(n.type)) return [];
    const names = outputNames(n);
    return names
      .map((nm, pin) => ({ key: sig(n.id, pin), node: n, label: `${n.label || n.type}${names.length > 1 ? `.${nm}` : ''}` }))
      .filter((r) => trace.changes[r.key]);
  });
  const end = Math.max(trace.end + 2, 8);
  const nameW = 78;
  const plotW = 520;
  const rowH = 24;
  const x = (t: number) => nameW + (t / end) * plotW;
  return (
    <svg data-testid="gate-timing-diagram" width="100%" viewBox={`0 0 ${nameW + plotW + 10} ${rows.length * rowH + 22}`} className="mt-2" style={{ maxWidth: 640 }}>
      {Array.from({ length: end + 1 }, (_, t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={0} y2={rows.length * rowH} stroke="var(--border-subtle)" strokeWidth={0.5} />
          <text x={x(t)} y={rows.length * rowH + 14} fontSize={9} textAnchor="middle" fill="var(--text-muted)">{t}</text>
        </g>
      ))}
      <line x1={x(time)} x2={x(time)} y1={0} y2={rows.length * rowH} stroke="#3b82f6" strokeWidth={1.5} />
      {rows.map((r, i) => {
        const top = i * rowH + 5;
        const hi = top;
        const lo = top + rowH - 10;
        const list = trace.changes[r.key];
        let dpath = '';
        list.forEach(([t, v], k) => {
          const y = v ? hi : lo;
          dpath += k === 0 ? `M${x(0)},${y}` : `H${x(t)}V${y}`;
        });
        dpath += `H${x(end)}`;
        const glitch = list.length > 2;
        return (
          <g key={r.key}>
            <text x={4} y={top + 11} fontSize={10.5} fill={glitch ? '#d97706' : 'var(--text-primary)'} fontFamily="var(--font-mono)">{r.label}</text>
            <path d={dpath} fill="none" stroke={glitch ? '#f59e0b' : '#22c55e'} strokeWidth={1.6} />
          </g>
        );
      })}
    </svg>
  );
}
