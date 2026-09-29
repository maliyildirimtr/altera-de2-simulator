import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Cpu, FileDown, FileUp, Link2, Plus, Redo2, RotateCcw, Trash2, Undo2, X, Zap, ArrowLeftRight, FilePlus2, FolderOpen } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { fmt } from '../i18n/dictionary';
import { useBoardStore } from '../store/boardStore';
import { markWorkspaceDirty, markWorkspaceUser } from '../services/exampleHandoff';
import { decodeJson, encodeJson, MAX_SHARE_URL_LENGTH } from '../services/shareLink';
import { downloadText } from '../utils/svgExport';
import { ToolbarMenu, MENU_ITEM_CLASS, MENU_ITEM_STYLE } from '../components/common/ToolbarMenu';
import {
  FSM_PRESETS,
  MAX_INPUTS,
  MAX_OUTPUTS,
  MAX_STATES,
  analyze,
  codeText,
  comboText,
  emptyDesign,
  isDesign,
  stateBits,
  stateCodes,
  stateTable,
  step,
  toVerilog,
  type ClockSource,
  type Encoding,
  type FsmDesign,
  type FsmEdge,
  type FsmKind,
  type FsmStateNode,
} from '../fsm/fsm';

const STORAGE_KEY = 'logiclab_fsm_v1';
const SHARE_KEY = 'f';
const FILE_FORMAT = 'logiclab-fsm';
const R = 34;
const CANVAS_W = 1000;
const CANVAS_H = 560;
const HISTORY_LIMIT = 60;

type Pt = { x: number; y: number };
type Selection = { kind: 'state' | 'edge'; id: string } | null;
interface Step { from: string; input: string; to: string; outputs: string }

function load(): FsmDesign {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (isDesign(d)) return d;
    }
  } catch {
    /* storage may be blocked */
  }
  return FSM_PRESETS.seq1011.design;
}

let counter = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;
const NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/;

/** Geometry of one transition arc: path, arrow end and label position. */
function edgeGeometry(d: FsmDesign, e: FsmEdge, byId: Map<string, FsmStateNode>): { path: string; label: Pt } | null {
  const a = byId.get(e.from);
  const b = byId.get(e.to);
  if (!a || !b) return null;
  if (a.id === b.id) {
    // Self-loop above the state; several loops on one state nest.
    const k = d.edges.filter((x) => x.from === a.id && x.to === a.id).findIndex((x) => x.id === e.id);
    const h = 58 + k * 26;
    const w = 26 + k * 10;
    const s = { x: a.x - 14, y: a.y - R + 3 };
    const t = { x: a.x + 14, y: a.y - R + 3 };
    return { path: `M${s.x},${s.y} C${a.x - w - 20},${a.y - R - h} ${a.x + w + 20},${a.y - R - h} ${t.x},${t.y}`, label: { x: a.x, y: a.y - R - h * 0.78 } };
  }
  const reverse = d.edges.some((x) => x.from === b.id && x.to === a.id);
  const bend = e.bend ?? (reverse ? 0.22 : 0);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  // Normal to the left of a → b, so opposite arcs bow to opposite sides.
  const c = { x: mid.x + (dy / len) * bend * len, y: mid.y - (dx / len) * bend * len };
  const toward = (p: Pt, q: Pt, r: number) => {
    const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    return { x: p.x + ((q.x - p.x) / l) * r, y: p.y + ((q.y - p.y) / l) * r };
  };
  const s = toward(a, bend ? c : b, R);
  const t = toward(b, bend ? c : a, R + 2);
  const label = { x: 0.25 * s.x + 0.5 * c.x + 0.25 * t.x, y: 0.25 * s.y + 0.5 * c.y + 0.25 * t.y };
  return { path: bend ? `M${s.x},${s.y} Q${c.x},${c.y} ${t.x},${t.y}` : `M${s.x},${s.y} L${t.x},${t.y}`, label };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</h2>
      {children}
    </section>
  );
}

/**
 * State-machine designer: draw Moore or Mealy machines as a state diagram,
 * simulate them step by step, and get the state table, the encoding and
 * Verilog (also a DE2 version that steps on KEY1).
 */
export default function FsmDesigner() {
  const { d: dict, lang } = useI18n();
  const t = dict.fsm;
  const navigate = useNavigate();
  const location = useLocation();
  const [design, setDesign] = useState<FsmDesign>(load);
  const [sel, setSel] = useState<Selection>(null);
  const [cur, setCur] = useState<string>(design.initial);
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<Step[]>([]);
  const [clock, setClock] = useState<ClockSource>('KEY1');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [newIn, setNewIn] = useState('');
  const [newOut, setNewOut] = useState('');
  const [link, setLink] = useState<{ from: string; at: Pt } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const undoStack = useRef<FsmDesign[]>([]);
  const redoStack = useRef<FsmDesign[]>([]);
  const drag = useRef<{ id: string; dx: number; dy: number; before: FsmDesign; moved: boolean } | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
    } catch {
      /* ignore */
    }
  }, [design]);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  /** Replaces the design as one undoable step. */
  const commit = useCallback((next: FsmDesign | ((d: FsmDesign) => FsmDesign), before?: FsmDesign) => {
    setDesign((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (value === prev) return prev;
      undoStack.current = [...undoStack.current, before ?? prev].slice(-60);
      redoStack.current = [];
      return value;
    });
    bump((x) => x + 1);
  }, []);
  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(design);
    setDesign(prev);
    bump((x) => x + 1);
  };
  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(design);
    setDesign(next);
    bump((x) => x + 1);
  };

  const byId = useMemo(() => new Map(design.states.map((s) => [s.id, s])), [design.states]);
  const checks = useMemo(() => analyze(design), [design]);
  const table = useMemo(() => stateTable(design), [design]);
  const codes = useMemo(() => stateCodes(design), [design]);
  const bits = stateBits(design);
  const verilog = useMemo(() => toVerilog(design), [design]);
  const env = useMemo(() => Object.fromEntries(design.inputs.map((n) => [n, inputs[n] ? 1 : 0])), [design.inputs, inputs]);
  const current = byId.has(cur) ? cur : design.initial;
  const now = useMemo(() => step(design, current, env), [design, current, env]);
  const stateName = (id: string) => byId.get(id)?.name ?? '?';

  const selState = sel?.kind === 'state' ? byId.get(sel.id) : undefined;
  const selEdge = sel?.kind === 'edge' ? design.edges.find((e) => e.id === sel.id) : undefined;

  const toPoint = (e: { clientX: number; clientY: number }): Pt => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * CANVAS_W, y: ((e.clientY - r.top) / r.height) * CANVAS_H };
  };
  const stateAt = (p: Pt) => design.states.find((s) => Math.hypot(s.x - p.x, s.y - p.y) <= R + 6);

  /* ── Editing ─────────────────────────────────────────────────────── */

  const addState = (at?: Pt) => {
    if (design.states.length >= MAX_STATES) return setNotice({ kind: 'err', text: fmt(t.maxStates, { n: MAX_STATES }) });
    let k = design.states.length;
    while (design.states.some((s) => s.name === `S${k}`)) k++;
    const id = newId('s');
    const p = at ?? { x: 120 + ((design.states.length * 170) % 760), y: 120 + Math.floor(design.states.length / 5) * 150 };
    commit((d) => ({ ...d, states: [...d.states, { id, name: `S${k}`, x: Math.round(p.x), y: Math.round(p.y), out: {} }], initial: d.states.length ? d.initial : id }));
    setSel({ kind: 'state', id });
  };
  const updateState = (id: string, patch: Partial<FsmStateNode>) => commit((d) => ({ ...d, states: d.states.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const updateEdge = (id: string, patch: Partial<FsmEdge>) => commit((d) => ({ ...d, edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const removeSelected = () => {
    if (!sel) return;
    if (sel.kind === 'edge') commit((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== sel.id) }));
    else
      commit((d) => {
        const states = d.states.filter((s) => s.id !== sel.id);
        return { ...d, states, edges: d.edges.filter((e) => e.from !== sel.id && e.to !== sel.id), initial: d.initial === sel.id ? states[0]?.id ?? '' : d.initial };
      });
    setSel(null);
  };
  const addEdge = (from: string, to: string) => {
    const id = newId('e');
    commit((d) => ({ ...d, edges: [...d.edges, { id, from, to, cond: d.inputs[0] ?? '1', out: {} }] }));
    setSel({ kind: 'edge', id });
  };
  const addSignal = (which: 'inputs' | 'outputs') => {
    const text = (which === 'inputs' ? newIn : newOut).trim();
    const max = which === 'inputs' ? MAX_INPUTS : MAX_OUTPUTS;
    if (!NAME_RE.test(text)) return setNotice({ kind: 'err', text: t.badName });
    if ([...design.inputs, ...design.outputs].includes(text)) return setNotice({ kind: 'err', text: t.nameTaken });
    if (design[which].length >= max) return setNotice({ kind: 'err', text: fmt(t.tooMany, { n: max }) });
    commit((d) => ({ ...d, [which]: [...d[which], text] }));
    if (which === 'inputs') setNewIn('');
    else setNewOut('');
  };
  const removeSignal = (which: 'inputs' | 'outputs', name: string) => commit((d) => ({ ...d, [which]: d[which].filter((x) => x !== name) }));

  const loadDesign = (d: FsmDesign) => {
    commit(d);
    setSel(null);
    setCur(d.initial);
    setInputs({});
    setHistory([]);
  };

  /* ── Simulation ──────────────────────────────────────────────────── */

  const pulse = () => {
    const r = step(design, current, env);
    setHistory((h) => [...h, { from: current, input: comboText(env, design.inputs), to: r.next, outputs: design.outputs.map((o) => r.outputs[o]).join('') }].slice(-HISTORY_LIMIT));
    setCur(r.next);
  };
  const reset = () => {
    setCur(design.initial);
    setHistory([]);
  };

  /* ── Pointer handling ────────────────────────────────────────────── */

  const onStateDown = (e: React.PointerEvent, s: FsmStateNode) => {
    e.stopPropagation();
    setSel({ kind: 'state', id: s.id });
    const p = toPoint(e);
    drag.current = { id: s.id, dx: p.x - s.x, dy: p.y - s.y, before: design, moved: false };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onHandleDown = (e: React.PointerEvent, s: FsmStateNode) => {
    e.stopPropagation();
    setLink({ from: s.id, at: toPoint(e) });
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const p = toPoint(e);
    if (link) return setLink({ ...link, at: p });
    const dr = drag.current;
    if (!dr) return;
    dr.moved = true;
    const x = Math.round(Math.max(R, Math.min(CANVAS_W - R, p.x - dr.dx)));
    const y = Math.round(Math.max(R + 40, Math.min(CANVAS_H - R, p.y - dr.dy)));
    setDesign((d) => ({ ...d, states: d.states.map((s) => (s.id === dr.id ? { ...s, x, y } : s)) }));
  };
  const onUp = (e: React.PointerEvent) => {
    if (link) {
      const target = stateAt(toPoint(e));
      if (target) addEdge(link.from, target.id);
      setLink(null);
    }
    const dr = drag.current;
    drag.current = null;
    if (dr?.moved) {
      // One undo step for the whole drag.
      undoStack.current = [...undoStack.current, dr.before].slice(-60);
      redoStack.current = [];
      bump((x) => x + 1);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault();
        removeSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ── Files, links, DE2 ───────────────────────────────────────────── */

  const safeName = (design.name || 'fsm').replace(/[^A-Za-z0-9_-]+/g, '_');
  const saveFile = () => downloadText(JSON.stringify({ format: FILE_FORMAT, version: 1, design }, null, 2), `${safeName}.fsm.json`, 'application/json');
  const readFile = (data: unknown): FsmDesign | null => {
    const obj = data as { format?: string; design?: unknown };
    if (obj && obj.format === FILE_FORMAT && isDesign(obj.design)) return obj.design;
    return isDesign(data) ? data : null;
  };
  const openFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      let d: FsmDesign | null = null;
      try {
        d = readFile(JSON.parse(String(reader.result)));
      } catch {
        d = null;
      }
      if (!d) return setNotice({ kind: 'err', text: t.openFailed });
      loadDesign(d);
    };
    reader.readAsText(file);
  };
  const copyShareLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#/fsm?${SHARE_KEY}=${await encodeJson({ format: FILE_FORMAT, version: 1, design })}`;
      if (url.length > MAX_SHARE_URL_LENGTH) return setNotice({ kind: 'err', text: t.tooLong });
      await navigator.clipboard.writeText(url);
      setNotice({ kind: 'ok', text: t.linkCopied });
    } catch (err) {
      setNotice({ kind: 'err', text: (err as Error).message });
    }
  };
  useEffect(() => {
    const code = new URLSearchParams(location.search).get(SHARE_KEY);
    if (!code) return;
    let cancelled = false;
    decodeJson(code)
      .then((data) => {
        if (cancelled) return;
        const d = readFile(data);
        if (!d) throw new Error(t.openFailed);
        if (!window.confirm(t.replace)) return;
        loadDesign(d);
      })
      .catch((err: Error) => { if (!cancelled) setNotice({ kind: 'err', text: err.message }); })
      .finally(() => { if (!cancelled) navigate(location.pathname, { replace: true }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const openInDe2 = () => {
    const st = useBoardStore.getState();
    st.setHdlCode(toVerilog(design, { de2: true, clock }));
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
      setNotice({ kind: 'ok', text: t.copied });
    } catch (err) {
      setNotice({ kind: 'err', text: (err as Error).message });
    }
  };

  /* ── Rendering ───────────────────────────────────────────────────── */

  const btn = 'flex items-center gap-1.5 px-2.5 h-[1.875rem] rounded-[0.25rem] border text-xs font-medium transition-colors disabled:opacity-40';
  const btnStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' };
  const field = 'h-8 px-2 rounded-[0.25rem] border text-[0.8125rem]';
  const accent = 'var(--accent-primary)';
  const edgeLabel = (e: FsmEdge) => {
    const c = e.cond.trim() || '1';
    if (design.kind === 'moore') return c;
    const on = design.outputs.filter((o) => e.out[o]);
    return `${c} / ${on.length ? on.join(',') : '–'}`;
  };
  const warnings: Array<{ kind: 'err' | 'warn' | 'info'; text: string }> = [];
  for (const e of design.edges) if (checks.errors[e.id]) warnings.push({ kind: 'err', text: fmt(t.condError, { state: stateName(e.from), to: stateName(e.to), msg: checks.errors[e.id] }) });
  for (const [id, list] of Object.entries(checks.overlapping)) warnings.push({ kind: 'warn', text: fmt(t.overlap, { state: stateName(id), list: list.join(', ') }) });
  for (const id of checks.unreachable) warnings.push({ kind: 'warn', text: fmt(t.unreachable, { state: stateName(id) }) });
  for (const [id, list] of Object.entries(checks.uncovered)) warnings.push({ kind: 'info', text: fmt(t.stays, { state: stateName(id), list: list.join(', ') }) });

  return (
    <div data-testid="fsm-designer" className="absolute inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <h1 className="text-[0.875rem] font-bold mr-2">{t.title}</h1>
        <button type="button" className={btn} style={btnStyle} data-testid="fsm-undo" title={t.undo} aria-label={t.undo} disabled={!undoStack.current.length} onClick={undo}><Undo2 size={14} /></button>
        <button type="button" className={btn} style={btnStyle} data-testid="fsm-redo" title={t.redo} aria-label={t.redo} disabled={!redoStack.current.length} onClick={redo}><Redo2 size={14} /></button>
        <span className="w-px h-6" style={{ backgroundColor: 'var(--border-subtle)' }} />
        <button type="button" className={btn} style={btnStyle} data-testid="fsm-add-state" onClick={() => addState()}><Plus size={14} /> {t.addState}</button>
        <label className="flex items-center gap-1.5 text-xs">
          {t.kind}
          <select data-testid="fsm-kind" value={design.kind} onChange={(e) => commit((d) => ({ ...d, kind: e.target.value as FsmKind }))} className={field} style={btnStyle}>
            <option value="moore">{t.moore}</option>
            <option value="mealy">{t.mealy}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          {t.encoding}
          <select data-testid="fsm-encoding" value={design.encoding} onChange={(e) => commit((d) => ({ ...d, encoding: e.target.value as Encoding }))} className={field} style={btnStyle}>
            <option value="binary">{t.binary}</option>
            <option value="gray">{t.gray}</option>
            <option value="onehot">{t.onehot}</option>
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            {t.examples}
            <select data-testid="fsm-preset" value="" onChange={(e) => { const p = FSM_PRESETS[e.target.value]; if (p) loadDesign(p.design); }} className={field} style={btnStyle}>
              <option value="">—</option>
              {Object.entries(FSM_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.title[lang]}</option>)}
            </select>
          </label>
          <ToolbarMenu label={t.file} icon={<FolderOpen size={14} />} testId="fsm-menu-file">
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} style={MENU_ITEM_STYLE} data-testid="fsm-file-new" onClick={() => loadDesign(emptyDesign())}><FilePlus2 size={14} /> {t.newDesign}</button>
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} style={MENU_ITEM_STYLE} data-testid="fsm-file-open" onClick={() => fileRef.current?.click()}><FileUp size={14} /> {t.openFile}</button>
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} style={MENU_ITEM_STYLE} data-testid="fsm-file-save" onClick={saveFile}><FileDown size={14} /> {t.saveFile}</button>
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} style={MENU_ITEM_STYLE} data-testid="fsm-file-share" onClick={copyShareLink}><Link2 size={14} /> {t.shareLink}</button>
          </ToolbarMenu>
          <input ref={fileRef} data-testid="fsm-file-input" type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Canvas and simulation */}
        <div className="flex-1 min-w-0 flex flex-col">
          <p className="px-3 pt-2 text-[0.7188rem]" style={{ color: 'var(--text-secondary)' }}>{t.lead}</p>
          <div className="flex items-center gap-2 flex-wrap mx-3 mt-2 px-3 py-2 rounded-[0.375rem] border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
            <span className="text-[0.75rem] font-semibold">{t.simulate}</span>
            {design.inputs.map((n) => (
              <button key={n} type="button" data-testid={`fsm-input-${n}`} aria-pressed={!!inputs[n]} className={btn} style={{ ...btnStyle, ...(inputs[n] ? { backgroundColor: '#22c55e', borderColor: '#22c55e', color: '#fff' } : {}) }} onClick={() => setInputs((v) => ({ ...v, [n]: v[n] ? 0 : 1 }))}>
                <span className="font-mono">{n}={inputs[n] ? 1 : 0}</span>
              </button>
            ))}
            <button type="button" className={btn} style={{ ...btnStyle, backgroundColor: accent, borderColor: accent, color: '#fff' }} data-testid="fsm-clock" onClick={pulse}><Zap size={13} /> {t.clockPulse}</button>
            <button type="button" className={btn} style={btnStyle} data-testid="fsm-reset" onClick={reset}><RotateCcw size={13} /> {t.reset}</button>
            <span className="text-[0.75rem] ml-1" data-testid="fsm-current">{t.current}: <b className="font-mono">{stateName(current)}</b></span>
            {design.outputs.map((o) => (
              <span key={o} data-testid={`fsm-output-${o}`} data-value={now.outputs[o]} className="flex items-center gap-1 text-[0.75rem] font-mono">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: now.outputs[o] ? '#ef4444' : 'var(--bg-panel)', border: '1px solid var(--text-secondary)' }} />
                {o}
              </span>
            ))}
          </div>
          <div className="flex-1 min-h-0 p-3">
            <svg
              ref={svgRef}
              data-testid="fsm-canvas"
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className="w-full h-full rounded-[0.375rem] border select-none"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-canvas, var(--bg-app))', touchAction: 'none' }}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerDown={() => setSel(null)}
              onDoubleClick={(e) => { if (!stateAt(toPoint(e))) addState(toPoint(e)); }}
            >
              <defs>
                <marker id="fsm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 Z" fill="var(--text-secondary)" />
                </marker>
                <marker id="fsm-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 Z" fill={accent} />
                </marker>
              </defs>
              {/* Initial-state arrow */}
              {byId.get(design.initial) && (() => {
                const s = byId.get(design.initial)!;
                return <path d={`M${s.x - R - 36},${s.y} L${s.x - R - 2},${s.y}`} stroke="var(--text-secondary)" strokeWidth={2} markerEnd="url(#fsm-arrow)" />;
              })()}
              {design.edges.map((e) => {
                const g = edgeGeometry(design, e, byId);
                if (!g) return null;
                const isSel = sel?.kind === 'edge' && sel.id === e.id;
                const next = now.edge === e.id;
                const bad = !!checks.errors[e.id];
                const color = bad ? '#ef4444' : isSel ? '#3b82f6' : next ? accent : 'var(--text-secondary)';
                const label = edgeLabel(e);
                return (
                  <g key={e.id} data-edge={e.id} data-next={next ? 'true' : undefined} onPointerDown={(ev) => { ev.stopPropagation(); setSel({ kind: 'edge', id: e.id }); }} style={{ cursor: 'pointer' }}>
                    <path d={g.path} fill="none" stroke="transparent" strokeWidth={14} />
                    <path d={g.path} fill="none" stroke={color} strokeWidth={isSel || next ? 2.6 : 1.8} strokeDasharray={bad ? '6 4' : undefined} markerEnd={`url(#${next ? 'fsm-arrow-on' : 'fsm-arrow'})`} />
                    <rect x={g.label.x - label.length * 3.4 - 5} y={g.label.y - 10} width={label.length * 6.8 + 10} height={18} rx={4} fill="var(--bg-surface)" stroke={isSel ? '#3b82f6' : 'var(--border-subtle)'} />
                    <text x={g.label.x} y={g.label.y + 3.5} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill={bad ? '#ef4444' : 'var(--text-primary)'}>{label}</text>
                  </g>
                );
              })}
              {link && byId.get(link.from) && (
                <path d={`M${byId.get(link.from)!.x},${byId.get(link.from)!.y} L${link.at.x},${link.at.y}`} stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" markerEnd="url(#fsm-arrow)" pointerEvents="none" />
              )}
              {design.states.map((s) => {
                const isSel = sel?.kind === 'state' && sel.id === s.id;
                const active = s.id === current;
                const outs = design.kind === 'moore' ? design.outputs.filter((o) => s.out[o]) : [];
                return (
                  <g key={s.id} data-state={s.id} data-active={active ? 'true' : undefined}>
                    <g onPointerDown={(e) => onStateDown(e, s)} style={{ cursor: 'move' }}>
                      <circle cx={s.x} cy={s.y} r={R} fill={active ? 'rgba(59,130,246,0.18)' : 'var(--bg-surface)'} stroke={isSel ? '#3b82f6' : active ? accent : 'var(--text-secondary)'} strokeWidth={isSel || active ? 2.6 : 1.6} />
                      {s.id === design.initial && <circle cx={s.x} cy={s.y} r={R - 5} fill="none" stroke="var(--text-muted)" strokeWidth={1} />}
                      <text x={s.x} y={outs.length || design.kind === 'moore' ? s.y - 2 : s.y + 4} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="var(--text-primary)" pointerEvents="none">{s.name}</text>
                      {design.kind === 'moore' && (
                        <text x={s.x} y={s.y + 14} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--text-secondary)" pointerEvents="none">
                          {design.outputs.map((o) => (s.out[o] ? 1 : 0)).join('') || '–'}
                        </text>
                      )}
                      <text x={s.x} y={s.y + R + 13} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--text-muted)" pointerEvents="none">{codeText(codes[s.id] ?? 0, bits)}</text>
                    </g>
                    {/* Drag from the handle to another state to add a transition. */}
                    <circle data-handle={s.id} cx={s.x + R} cy={s.y} r={7} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} opacity={isSel ? 1 : 0.55} style={{ cursor: 'crosshair' }} onPointerDown={(e) => onHandleDown(e, s)} />
                  </g>
                );
              })}
            </svg>
          </div>
          {/* Step history */}
          <div className="mx-3 mb-3 px-3 py-2 rounded-[0.375rem] border max-h-[9rem] overflow-auto" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[0.75rem] font-semibold">{t.history}</span>
              {history.length > 0 && <button type="button" className="text-[0.7188rem] underline" style={{ color: 'var(--text-secondary)' }} onClick={() => setHistory([])}>{t.clearHistory}</button>}
            </div>
            {history.length === 0 ? (
              <p className="text-[0.7188rem]" style={{ color: 'var(--text-muted)' }}>{t.historyEmpty}</p>
            ) : (
              <div data-testid="fsm-history" className="flex flex-wrap gap-1.5 text-[0.7188rem] font-mono">
                {history.map((h, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border-subtle)' }}>
                    {i + 1}. {stateName(h.from)} —{h.input}{design.kind === 'mealy' && h.outputs ? `/${h.outputs}` : ''}→ {stateName(h.to)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <aside className="w-[24rem] shrink-0 border-l overflow-y-auto p-3 flex flex-col gap-4" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
          {notice && <p data-testid="fsm-notice" className="text-[0.75rem]" style={{ color: notice.kind === 'err' ? '#ef4444' : '#16a34a' }}>{notice.text}</p>}
          <label className="text-[0.75rem] flex items-center gap-2">
            {t.moduleName}
            <input value={design.name} onChange={(e) => setDesign((d) => ({ ...d, name: e.target.value }))} className={`${field} flex-1 font-mono`} style={btnStyle} />
          </label>
          {(['inputs', 'outputs'] as const).map((which) => (
            <Section key={which} title={which === 'inputs' ? t.inputs : t.outputs}>
              <div className="flex flex-wrap gap-1.5">
                {design[which].map((n) => (
                  <span key={n} className="flex items-center gap-1 pl-2 pr-1 h-7 rounded-full border text-[0.75rem] font-mono" style={{ borderColor: 'var(--border-subtle)' }}>
                    {n}
                    <button type="button" aria-label={`${t.delete} ${n}`} className="p-0.5 rounded hover:bg-[var(--bg-hover)]" onClick={() => removeSignal(which, n)}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); addSignal(which); }}>
                <input data-testid={`fsm-new-${which}`} value={which === 'inputs' ? newIn : newOut} onChange={(e) => (which === 'inputs' ? setNewIn : setNewOut)(e.target.value)} className={`${field} flex-1 font-mono`} style={btnStyle} placeholder={which === 'inputs' ? 'x' : 'z'} />
                <button type="submit" className={btn} style={btnStyle}><Plus size={13} /> {t.add}</button>
              </form>
            </Section>
          ))}

          {selState ? (
            <Section title={t.state}>
              <label className="text-[0.75rem] flex items-center gap-2">
                {t.stateName}
                <input data-testid="fsm-state-name" value={selState.name} onChange={(e) => updateState(selState.id, { name: e.target.value })} className={`${field} flex-1 font-mono`} style={btnStyle} />
              </label>
              <label className="text-[0.75rem] flex items-center gap-2">
                <input type="checkbox" data-testid="fsm-state-initial" checked={design.initial === selState.id} onChange={() => commit((d) => ({ ...d, initial: selState.id }))} />
                {t.initial}
              </label>
              {design.kind === 'moore' && design.outputs.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[0.75rem]">{t.stateOutputs}</span>
                  <div className="flex flex-wrap gap-3">
                    {design.outputs.map((o) => (
                      <label key={o} className="text-[0.75rem] flex items-center gap-1 font-mono">
                        <input type="checkbox" data-testid={`fsm-state-out-${o}`} checked={!!selState.out[o]} onChange={(e) => updateState(selState.id, { out: { ...selState.out, [o]: e.target.checked ? 1 : 0 } })} />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" className={btn} style={btnStyle} onClick={removeSelected}><Trash2 size={13} /> {t.delete}</button>
              </div>
            </Section>
          ) : selEdge ? (
            <Section title={`${t.transition}: ${stateName(selEdge.from)} → ${stateName(selEdge.to)}`}>
              <label className="text-[0.75rem] flex flex-col gap-1">
                {t.condition}
                <input data-testid="fsm-edge-cond" value={selEdge.cond} onChange={(e) => updateEdge(selEdge.id, { cond: e.target.value })} className={`${field} font-mono`} style={{ ...btnStyle, ...(checks.errors[selEdge.id] ? { borderColor: '#ef4444' } : {}) }} />
                {checks.errors[selEdge.id] && <span className="text-[0.6875rem]" style={{ color: '#ef4444' }}>{checks.errors[selEdge.id]}</span>}
                <span className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{t.conditionHint}</span>
              </label>
              {design.kind === 'mealy' && design.outputs.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[0.75rem]">{t.transitionOutputs}</span>
                  <div className="flex flex-wrap gap-3">
                    {design.outputs.map((o) => (
                      <label key={o} className="text-[0.75rem] flex items-center gap-1 font-mono">
                        <input type="checkbox" data-testid={`fsm-edge-out-${o}`} checked={!!selEdge.out[o]} onChange={(e) => updateEdge(selEdge.id, { out: { ...selEdge.out, [o]: e.target.checked ? 1 : 0 } })} />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {selEdge.from !== selEdge.to && (
                <label className="text-[0.75rem] flex items-center gap-2">
                  {t.bend}
                  <input type="range" min={-0.6} max={0.6} step={0.05} value={selEdge.bend ?? 0} onChange={(e) => updateEdge(selEdge.id, { bend: Number(e.target.value) })} className="flex-1" />
                </label>
              )}
              <div className="flex gap-2 flex-wrap">
                {selEdge.from !== selEdge.to && <button type="button" className={btn} style={btnStyle} onClick={() => updateEdge(selEdge.id, { from: selEdge.to, to: selEdge.from })}><ArrowLeftRight size={13} /> {t.reverse}</button>}
                <button type="button" className={btn} style={btnStyle} onClick={removeSelected}><Trash2 size={13} /> {t.delete}</button>
              </div>
            </Section>
          ) : (
            <p className="text-[0.7188rem]" style={{ color: 'var(--text-muted)' }}>{t.selectHint}</p>
          )}

          <Section title={t.checks}>
            {warnings.length === 0 ? (
              <p data-testid="fsm-checks-ok" className="text-[0.7188rem]" style={{ color: '#16a34a' }}>{t.allGood}</p>
            ) : (
              <ul data-testid="fsm-checks" className="flex flex-col gap-1 text-[0.7188rem]">
                {warnings.map((w, i) => <li key={i} style={{ color: w.kind === 'err' ? '#ef4444' : w.kind === 'warn' ? '#d97706' : 'var(--text-secondary)' }}>{w.text}</li>)}
              </ul>
            )}
          </Section>

          <Section title={t.stateTable}>
            <div className="overflow-x-auto">
              <table data-testid="fsm-table" className="w-full text-[0.7188rem] font-mono border-collapse">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }}>
                    <th className="text-left px-1 py-0.5">{t.present}</th>
                    <th className="text-left px-1">{t.code}</th>
                    <th className="text-left px-1">{t.input} {design.inputs.join('')}</th>
                    <th className="text-left px-1">{t.next}</th>
                    <th className="text-left px-1">{t.code}</th>
                    <th className="text-left px-1">{t.output} {design.outputs.join(',')}</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: r.state === current && r.input === comboText(env, design.inputs) ? 'var(--accent-subtle)' : undefined }}>
                      <td className="px-1 py-0.5">{stateName(r.state)}</td>
                      <td className="px-1">{codeText(codes[r.state] ?? 0, bits)}</td>
                      <td className="px-1">{r.input}</td>
                      <td className="px-1" style={{ color: r.implicit ? 'var(--text-muted)' : undefined }}>{stateName(r.next)}{r.implicit ? ` (${t.stay})` : ''}</td>
                      <td className="px-1">{codeText(codes[r.next] ?? 0, bits)}</td>
                      <td className="px-1">{r.outputs.join('') || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={t.verilog}>
            <label className="text-[0.75rem] flex items-center gap-2">
              {t.de2Clock}
              <select data-testid="fsm-de2-clock" value={clock} onChange={(e) => setClock(e.target.value as ClockSource)} className={field} style={btnStyle}>
                <option value="KEY1">{t.clockKey}</option>
                <option value="CLOCK_50">{t.clock50}</option>
              </select>
            </label>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className={btn} style={{ ...btnStyle, backgroundColor: accent, borderColor: accent, color: '#fff' }} data-testid="fsm-open-de2" disabled={!design.states.length || Object.keys(checks.errors).length > 0} onClick={openInDe2}><Cpu size={13} /> {t.openDe2}</button>
              <button type="button" className={btn} style={btnStyle} onClick={copyCode}><Copy size={13} /> {t.copy}</button>
            </div>
            <p className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{t.de2Hint}</p>
            <pre data-testid="fsm-verilog" className="text-[0.6875rem] p-2 rounded-[0.25rem] border overflow-auto max-h-[22rem]" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-app)' }}>{verilog}</pre>
          </Section>
        </aside>
      </div>
    </div>
  );
}

