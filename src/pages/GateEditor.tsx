import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Copy, Cpu, Pause, Play, RotateCcw, Timer, Trash2, Zap } from 'lucide-react';
import {
  ARITH,
  EMPTY_SEQ,
  bitWidth,
  MULTI_INPUT,
  PALETTE,
  PRESETS,
  SEG7_PATTERNS,
  SINKS,
  SOURCES,
  evaluate,
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
  type PartCategory,
  type SeqState,
  type Trace,
} from '../gates/circuit';
import { useI18n } from '../i18n/I18nProvider';
import { fmt } from '../i18n/dictionary';
import { OpenInSchematicButton } from '../components/Share/OpenInToolButton';
import { useBoardStore } from '../store/boardStore';
import { markWorkspaceDirty, markWorkspaceUser } from '../services/exampleHandoff';

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
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if (s?.circuit?.nodes && s.circuit.wires) {
        return { circuit: s.circuit, inputs: s.inputs ?? {}, name: s.name || 'gate_design', timing: !!s.timing, seq: s.seq?.q ? s.seq : EMPTY_SEQ };
      }
    }
  } catch {
    /* start with a preset */
  }
  return { circuit: structuredClone(PRESETS.half_adder.circuit), inputs: {}, name: 'half_adder', seq: EMPTY_SEQ };
}

/* ── Geometry ──────────────────────────────────────────────────────── */

const BLOCK_TITLE: Partial<Record<GateType, string>> = { MUX2: 'MUX', MUX4: 'MUX', DEMUX2: 'DEMUX', DEMUX4: 'DEMUX', DEC2: 'DEC', DEC3: 'DEC', BITSEL: 'BIT', PENC4: 'PRI', ADD: 'ADD', SUB: 'SUB', MUL: 'MUL', DIV: 'DIV', SHIFT: 'SHIFT', CMP: 'CMP', NEG: 'NEG', SEXT: 'SEXT', BITCNT: 'CNT', HA: 'HA', FA: 'FA', DFF: 'D', TFF: 'T', JKFF: 'JK', SRFF: 'SR' };

/** Plexers drawn as a trapezoid (wide side = the side with more signals). */
const TRAPEZOID: GateType[] = ['MUX2', 'MUX4', 'BITSEL', 'DEMUX2', 'DEMUX4'];

function isBlock(t: GateType): boolean {
  return t in BLOCK_TITLE;
}

function nodeSize(n: Pick<GateNode, 'type' | 'inputs'>): { w: number; h: number } {
  if (isGate(n.type)) return { w: W, h: Math.max(H, inputNames(n).length * 16 + 12) };
  if (n.type === 'SEG7') return { w: 64, h: 104 };
  if (n.type === 'CONST0' || n.type === 'CONST1') return { w: 44, h: 36 };
  if (isBlock(n.type)) {
    const pins = Math.max(inputNames(n).length, outputNames(n).length);
    return { w: 76, h: pins * 22 + 18 };
  }
  return { w: W, h: H };
}

function inPort(n: GateNode, pin: number): { x: number; y: number } {
  const { h } = nodeSize(n);
  const count = inputNames(n).length;
  return { x: n.x, y: n.y + (h * (pin + 1)) / (count + 1) };
}
function outPort(n: GateNode, pin = 0): { x: number; y: number } {
  const { w, h } = nodeSize(n);
  const count = Math.max(1, outputNames(n).length);
  return { x: n.x + w, y: n.y + (h * (pin + 1)) / (count + 1) };
}

type Pt = { x: number; y: number };

/** Automatic route: one vertical segment half way between the ports. */
function autoBends(a: Pt, b: Pt): number[] {
  return [Math.max(a.x + 18, (a.x + b.x) / 2)];
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
  // Clean the polyline: drop repeated points and points on a straight line.
  const raw = routePoints(a, b, bends);
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
  const corners = pts.slice(1, -1);
  if (!corners.length) return autoBends(a, b);
  // The route must leave `a` and reach `b` horizontally.
  if (corners[0].x === a.x) corners.unshift({ ...a });
  if (corners[corners.length - 1].x === b.x) corners.push({ ...b });
  if (corners.length % 2 !== 0) return bends;
  return corners.slice(0, -1).map((c, j) => (j % 2 === 0 ? c.x : c.y));
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
  const [menu, setMenu] = useState<PartCategory | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<Sample[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  /** Dragging one segment of a wire: index into its bends. */
  const wireDrag = useRef<{ id: string; index: number } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ circuit, inputs, name, timing: timingMode, seq }));
      } catch {
        /* storage unavailable */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [circuit, inputs, name, timingMode, seq]);

  const ev = useMemo(() => evaluate(circuit, inputs, seq.q), [circuit, inputs, seq]);
  const verilog = useMemo(() => toVerilog(circuit, name), [circuit, name]);
  const table = useMemo(() => truthTable(circuit), [circuit]);
  const { ins, outs, displays } = useMemo(() => ioNodes(circuit), [circuit]);
  const byId = useMemo(() => new Map(circuit.nodes.map((n) => [n.id, n])), [circuit]);
  const ffs = useMemo(() => circuit.nodes.filter((n) => isFlipFlop(n.type)).sort((a, b) => a.x - b.x || a.y - b.y), [circuit]);
  const clocks = useMemo(() => circuit.nodes.filter((n) => n.type === 'CLK'), [circuit]);
  const sequential = ffs.length > 0;
  const showGraph = sequential || clocks.length > 0;

  // Latest state for handlers that run from timers and pointer events.
  const live = useRef({ circuit, inputs, seq, timingMode });
  live.current = { circuit, inputs, seq, timingMode };

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
      if (SOURCES.includes(n.type)) sample[n.id] = next[n.id] ? 1 : 0;
      else if (SINKS.includes(n.type) || n.type === 'SEG7') sample[n.id] = r.ev.values[n.id] ?? 0;
      else if (isFlipFlop(n.type)) sample[n.id] = r.seq.q[n.id] ?? 0;
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
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
    if (!selected) return;
    setCircuit((c) =>
      selected.kind === 'wire'
        ? { ...c, wires: c.wires.filter((w) => w.id !== selected.id) }
        : { nodes: c.nodes.filter((n) => n.id !== selected.id), wires: c.wires.filter((w) => w.from !== selected.id && w.to !== selected.id) },
    );
    setSelected(null);
    setTrace(null);
  }, [selected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') removeSelected();
      if (e.key === 'Escape') { setPending(null); setSelected(null); setMenu(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeSelected]);

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
  const setButton = (id: string, v: number) => {
    if ((live.current.inputs[id] ?? 0) !== v) apply({ ...live.current.inputs, [id]: v });
  };

  const onNodeDown = (e: React.PointerEvent, n: GateNode) => {
    e.stopPropagation();
    const p = toPoint(e);
    drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
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
    const dr = drag.current;
    if (!dr) return;
    dr.moved = true;
    const node = byId.get(dr.id);
    const { w, h } = node ? nodeSize(node) : { w: W, h: H };
    const x = Math.round(Math.min(CANVAS_W - w - 4, Math.max(4, p.x - dr.dx)) / 10) * 10;
    const y = Math.round(Math.min(CANVAS_H - h - 4, Math.max(4, p.y - dr.dy)) / 10) * 10;
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
    wireDrag.current = null;
    drag.current = null;
  };

  const loadPreset = (key: string) => {
    const p = PRESETS[key];
    const next: Record<string, number> = key === 'hazard' ? { a: 1, b: 1, c: 1 } : {};
    const r = settle(p.circuit, next, EMPTY_SEQ);
    setCircuit(structuredClone(p.circuit));
    setInputs(next);
    setSeq(r.seq);
    live.current = { ...live.current, circuit: p.circuit, inputs: next, seq: r.seq };
    setName(key);
    setSelected(null);
    setPending(null);
    setTrace(null);
    setHistory([]);
    setRunning(false);
    if (key === 'hazard') setTimingMode(true);
  };

  const updateNode = (id: string, patch: Partial<GateNode>) => setCircuit((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));

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

  const openInDe2 = () => {
    const st = useBoardStore.getState();
    st.setHdlCode(toDe2Verilog(circuit, name));
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
  const labelled = (t: GateType) => SOURCES.includes(t) || SINKS.includes(t) || t === 'SEG7';

  const renderNode = (n: GateNode) => {
    const { w, h } = nodeSize(n);
    const v = shown(n.id);
    const isSel = selected?.kind === 'node' && selected.id === n.id;
    const glitch = trace?.glitches.includes(n.id);
    const stroke = loopSet.has(n.id) ? '#ef4444' : isSel ? '#3b82f6' : 'var(--text-secondary)';
    const inNames = inputNames(n);
    const outNames = outputNames(n);
    const clockPin = isFlipFlop(n.type) ? 1 : -1;
    let body: React.ReactNode;
    if (isGate(n.type)) body = <GateShape type={n.type} fill="var(--bg-surface)" stroke={stroke} h={h} />;
    else if (TRAPEZOID.includes(n.type)) {
      const demux = n.type === 'DEMUX2' || n.type === 'DEMUX4';
      const d = demux ? `M0,${h * 0.18} L${w},0 L${w},${h} L0,${h * 0.82} Z` : `M0,0 L${w},${h * 0.18} L${w},${h * 0.82} L0,${h} Z`;
      body = (
        <>
          <path d={d} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.2 : 1.5} />
          <text x={demux ? w / 2 + 7 : w / 2} y={h / 2 + 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text-secondary)" pointerEvents="none">{BLOCK_TITLE[n.type]}</text>
        </>
      );
    } else if (isBlock(n.type)) {
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={4} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.2 : 1.5} />
          <text x={w / 2} y={13} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--text-primary)" pointerEvents="none">{n.type === 'SHIFT' ? (n.dir === 'right' ? '>>' : '<<') : BLOCK_TITLE[n.type]}{ARITH.includes(n.type) ? ` ${bitWidth(n)}b` : ''}</text>
          {isFlipFlop(n.type) && (
            <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={v ? on : 'var(--text-muted)'} pointerEvents="none">Q={v}</text>
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
    } else if (n.type === 'CONST0' || n.type === 'CONST1') {
      body = (
        <>
          <rect x={2} y={2} width={w - 4} height={h - 4} rx={4} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.2 : 1.4} />
          <text x={w / 2} y={h / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={n.type === 'CONST1' ? on : 'var(--text-secondary)'} pointerEvents="none">{n.type === 'CONST1' ? 1 : 0}</text>
        </>
      );
    } else body = <rect x={4} y={6} width={w - 8} height={h - 12} rx={8} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.4 : 1.4} />;

    return (
      <g key={n.id} data-node={n.id} data-type={n.type} data-value={v} transform={`translate(${n.x},${n.y})`}>
        <g onPointerDown={(e) => onNodeDown(e, n)} style={{ cursor: 'move' }}>
          {body}
          {glitch && <rect x={-4} y={-4} width={w + 8} height={h + 8} rx={10} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" />}
        </g>
        {n.type === 'IN' && (
          <g data-testid={`gate-toggle-${n.label || n.id}`} onPointerDown={(e) => { e.stopPropagation(); toggleInput(n.id); }} style={{ cursor: 'pointer' }}>
            <rect x={10} y={14} width={24} height={24} rx={5} fill={v ? on : 'var(--bg-panel)'} stroke="var(--text-secondary)" />
            <text x={22} y={31} textAnchor="middle" fontSize={13} fontWeight={700} fill={v ? '#fff' : 'var(--text-primary)'}>{v}</text>
          </g>
        )}
        {n.type === 'CLK' && (
          <g data-testid={`gate-toggle-${n.label || n.id}`} onPointerDown={(e) => { e.stopPropagation(); toggleInput(n.id); }} style={{ cursor: 'pointer' }}>
            <rect x={10} y={14} width={24} height={24} rx={5} fill={v ? '#0ea5e9' : 'var(--bg-panel)'} stroke="var(--text-secondary)" />
            <path d="M13,33 H17 V19 H23 V33 H27 V19 H31" fill="none" stroke={v ? '#fff' : 'var(--text-primary)'} strokeWidth={1.6} />
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
            <rect x={10} y={14} width={24} height={24} rx={5} fill="var(--bg-panel)" stroke="var(--text-secondary)" />
            <circle cx={22} cy={26} r={v ? 6.5 : 8} fill={v ? '#2563eb' : '#334155'} />
          </g>
        )}
        {n.type === 'LED' && (
          <circle data-testid={`gate-led-${n.label || n.id}`} cx={22} cy={H / 2} r={10} fill={v ? '#ef4444' : 'var(--bg-panel)'} stroke="var(--text-secondary)" style={{ filter: v ? 'drop-shadow(0 0 6px rgba(239,68,68,0.9))' : undefined }} />
        )}
        {n.type === 'OUT' && (
          <g data-testid={`gate-output-${n.label || n.id}`}>
            <rect x={10} y={14} width={24} height={24} rx={12} fill={v ? '#ef4444' : 'var(--bg-panel)'} stroke="var(--text-secondary)" />
            <text x={22} y={31} textAnchor="middle" fontSize={13} fontWeight={700} fill={v ? '#fff' : 'var(--text-primary)'} pointerEvents="none">{v}</text>
          </g>
        )}
        {labelled(n.type) && n.type !== 'SEG7' && (
          <text x={42} y={H / 2 + 4} fontSize={12} fontWeight={600} fill="var(--text-primary)" pointerEvents="none">{n.label}</text>
        )}
        {n.type === 'SEG7' && <text x={w / 2} y={h + 13} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text-primary)" pointerEvents="none">{n.label}</text>}
        {isGate(n.type) && (
          <text x={W / 2 - 4} y={h + 12} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)" pointerEvents="none">
            {n.type}{timingMode ? ` · ${n.delay}t` : ''}
          </text>
        )}
        {/* Pin labels inside blocks; the clock pin gets the edge triangle. */}
        {isBlock(n.type) && inNames.map((nm, pin) => {
          const y = inPort(n, pin).y - n.y;
          if (pin === clockPin) return <path key={`l${pin}`} d={`M7,${y - 5} L14,${y} L7,${y + 5}`} fill="none" stroke="var(--text-secondary)" strokeWidth={1.3} pointerEvents="none" />;
          return <text key={`l${pin}`} x={9} y={y + 3.5} fontSize={9} fill="var(--text-secondary)" pointerEvents="none">{nm}</text>;
        })}
        {isBlock(n.type) && outNames.length > 1 && outNames.map((nm, pin) => {
          const y = outPort(n, pin).y - n.y;
          return <text key={`o${pin}`} x={w - 9} y={y + 3.5} textAnchor="end" fontSize={9} fill="var(--text-secondary)" pointerEvents="none">{nm}</text>;
        })}
        {/* Ports */}
        {inNames.map((_, pin) => {
          const p = inPort(n, pin);
          return (
            <circle key={pin} data-port={`${n.id}:in${pin}`} cx={p.x - n.x} cy={p.y - n.y} r={6} fill={pending ? '#3b82f6' : 'var(--bg-surface)'} stroke="var(--text-secondary)" strokeWidth={1.3} style={{ cursor: 'crosshair' }}
              onPointerDown={(e) => { e.stopPropagation(); if (pending) connect(n.id, pin); }} />
          );
        })}
        {outNames.map((_, pin) => {
          const p = outPort(n, pin);
          const pv = shown(sig(n.id, pin));
          const active = pending?.id === n.id && pending.pin === pin;
          return (
            <circle key={`out${pin}`} data-port={`${n.id}:out${pin ? pin : ''}`} cx={p.x - n.x} cy={p.y - n.y} r={6} fill={active ? '#3b82f6' : pv ? on : 'var(--bg-surface)'} stroke="var(--text-secondary)" strokeWidth={1.3} style={{ cursor: 'crosshair' }}
              onPointerDown={(e) => { e.stopPropagation(); setPending(active ? null : { id: n.id, pin }); setMouse(p); }} />
          );
        })}
      </g>
    );
  };

  return (
    <div data-testid="gate-editor" className="absolute inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <h1 className="text-[0.875rem] font-bold mr-2">{g.title}</h1>
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
        </div>
        <span className="flex-1" />
        <label className="flex items-center gap-1.5 text-[0.75rem]">
          {g.presets}
          <select className="h-8 px-2 rounded-[0.25rem] border text-[0.75rem]" style={btnStyle} value="" onChange={(e) => e.target.value && loadPreset(e.target.value)} data-testid="gate-preset">
            <option value="">—</option>
            {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.title[lang]}</option>)}
          </select>
        </label>
        <button type="button" className={btn} style={btnStyle} onClick={() => { setCircuit({ nodes: [], wires: [] }); setInputs({}); setSeq(EMPTY_SEQ); setTrace(null); setSelected(null); setHistory([]); setRunning(false); }}>{g.clear}</button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Canvas */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="px-3 py-1.5 text-[0.7188rem] flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
            <span>{pending ? g.connectHint : g.help}</span>
            {ev.loop.length > 0 && <span style={{ color: '#ef4444' }}>{g.loopWarning}</span>}
            {ev.floating.length > 0 && <span style={{ color: '#d97706' }}>{fmt(g.floatingWarning, { n: ev.floating.length })}</span>}
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
                  {ffs.map((f, i) => `Q${i}=${seq.q[f.id] ?? 0}`).join('  ')}
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
              onPointerDown={() => { setSelected(null); setPending(null); }}
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
                const bends = w.bends && w.bends.length % 2 === 1 ? w.bends : autoBends(pa, pb);
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
                return (
                  <g key={w.id} data-wire={w.id} data-value={v}>
                    {segs.map((sg, k) => {
                      const vertical = sg.p0.x === sg.p1.x;
                      const cursor = sg.index < 0 ? 'pointer' : vertical ? 'ew-resize' : 'ns-resize';
                      return (
                        <line key={k} data-wire-seg={`${w.id}:${k}`} x1={sg.p0.x} y1={sg.p0.y} x2={sg.p1.x} y2={sg.p1.y} stroke="transparent" strokeWidth={12}
                          onPointerDown={(e) => startDrag(e, sg.index)} onDoubleClick={(e) => addBend(e, k)} style={{ cursor: isSel ? cursor : 'pointer' }} />
                      );
                    })}
                    <path d={dpath} fill="none" stroke={isSel ? '#3b82f6' : v ? on : off} strokeWidth={isSel ? 3 : 2.2} strokeLinejoin="round" pointerEvents="none" />
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
          {sel ? (
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
              {!labelled(sel.type) && !isFlipFlop(sel.type) && sel.type !== 'CONST0' && sel.type !== 'CONST1' && (
                <label className="text-[0.75rem] flex items-center gap-2">
                  {g.delay}
                  <input type="number" min={1} max={5} value={sel.delay} onChange={(e) => updateNode(sel.id, { delay: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })} className="h-8 w-16 px-2 rounded-[0.25rem] border text-[0.8125rem]" style={btnStyle} />
                </label>
              )}
              <button type="button" className={btn} style={btnStyle} onClick={removeSelected}><Trash2 size={13} /> {g.delete}</button>
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
        const label = isFlipFlop(n.type) ? `Q${ffIndex++}` : n.label || n.type;
        const color = isFlipFlop(n.type) ? '#8b5cf6' : n.type === 'CLK' ? '#0ea5e9' : SOURCES.includes(n.type) ? '#3b82f6' : '#22c55e';
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
