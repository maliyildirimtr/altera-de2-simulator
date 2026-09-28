import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Cpu, Timer, Trash2 } from 'lucide-react';
import {
  GATE_TYPES,
  PRESETS,
  evaluate,
  hasOutput,
  inputCount,
  ioNodes,
  simulateTiming,
  toDe2Verilog,
  toVerilog,
  truthTable,
  valueAt,
  type Circuit,
  type GateNode,
  type GateType,
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

interface Saved {
  circuit: Circuit;
  inputs: Record<string, number>;
  name: string;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if (s?.circuit?.nodes && s.circuit.wires) return { circuit: s.circuit, inputs: s.inputs ?? {}, name: s.name || 'gate_design' };
    }
  } catch {
    /* start with a preset */
  }
  return { circuit: structuredClone(PRESETS.half_adder.circuit), inputs: {}, name: 'half_adder' };
}

/** Port positions in canvas coordinates. */
function inPort(n: GateNode, pin: number): { x: number; y: number } {
  const count = inputCount(n.type);
  const y = count === 1 ? n.y + H / 2 : n.y + (pin === 0 ? H * 0.3 : H * 0.7);
  return { x: n.x, y };
}
function outPort(n: GateNode): { x: number; y: number } {
  return { x: n.x + W, y: n.y + H / 2 };
}

function wirePath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mid = Math.max(a.x + 18, (a.x + b.x) / 2);
  return `M${a.x},${a.y} H${mid} V${b.y} H${b.x}`;
}

/** Gate body shapes (IEEE distinctive), drawn in a W x H box. */
function GateShape({ type, fill, stroke }: { type: GateType; fill: string; stroke: string }) {
  const bubble = type === 'NAND' || type === 'NOR' || type === 'XNOR' || type === 'NOT';
  const bodyW = bubble ? W - 10 : W;
  let d = '';
  if (type === 'AND' || type === 'NAND') d = `M8,4 H${bodyW / 2} A${H / 2 - 4},${H / 2 - 4} 0 0 1 ${bodyW / 2},${H - 4} H8 Z`;
  else if (type === 'OR' || type === 'NOR' || type === 'XOR' || type === 'XNOR') d = `M10,4 Q${bodyW * 0.62},4 ${bodyW},${H / 2} Q${bodyW * 0.62},${H - 4} 10,${H - 4} Q24,${H / 2} 10,4 Z`;
  else if (type === 'NOT') d = `M10,6 L${bodyW},${H / 2} L10,${H - 6} Z`;
  return (
    <g>
      <path d={d} fill={fill} stroke={stroke} strokeWidth={1.6} />
      {(type === 'XOR' || type === 'XNOR') && <path d={`M3,4 Q17,${H / 2} 3,${H - 4}`} fill="none" stroke={stroke} strokeWidth={1.6} />}
      {bubble && <circle cx={bodyW + 5} cy={H / 2} r={4.5} fill={fill} stroke={stroke} strokeWidth={1.6} />}
    </g>
  );
}

let idCounter = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/**
 * Gate-level drawing editor: place gates, wire them, toggle inputs and watch
 * the outputs; see the generated Verilog and truth table, send the design to
 * the DE2 board or the Schematic tool, and replay an input change with gate
 * delays to see glitches.
 */
export default function GateEditor() {
  const { d, lang } = useI18n();
  const g = d.gates;
  const navigate = useNavigate();
  const initial = useMemo(load, []);
  const [circuit, setCircuit] = useState<Circuit>(initial.circuit);
  const [inputs, setInputs] = useState<Record<string, number>>(initial.inputs);
  const [name, setName] = useState(initial.name);
  const [selected, setSelected] = useState<{ kind: 'node' | 'wire'; id: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [timingMode, setTimingMode] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [traceTime, setTraceTime] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ circuit, inputs, name }));
      } catch {
        /* storage unavailable */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [circuit, inputs, name]);

  const ev = useMemo(() => evaluate(circuit, inputs), [circuit, inputs]);
  const verilog = useMemo(() => toVerilog(circuit, name), [circuit, name]);
  const table = useMemo(() => truthTable(circuit), [circuit]);
  const { ins, outs } = useMemo(() => ioNodes(circuit), [circuit]);
  const byId = useMemo(() => new Map(circuit.nodes.map((n) => [n.id, n])), [circuit]);

  // Value shown on a node/wire: live value, or the replayed value at traceTime.
  const shown = useCallback(
    (id: string) => (trace ? valueAt(trace.changes[id] ?? [[0, 0]], traceTime) : ev.values[id] ?? 0),
    [trace, traceTime, ev],
  );

  // Replay animation.
  useEffect(() => {
    if (!trace || traceTime >= trace.end) return;
    const t = window.setTimeout(() => setTraceTime((x) => x + 1), 450);
    return () => window.clearTimeout(t);
  }, [trace, traceTime]);

  const toPoint = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * CANVAS_W, y: ((e.clientY - r.top) / r.height) * CANVAS_H };
  };

  const addNode = (type: GateType) => {
    const count = circuit.nodes.filter((n) => n.type === type).length;
    const col = type === 'IN' ? 40 : type === 'OUT' ? CANVAS_W - 140 : 260 + (circuit.nodes.length % 5) * 120;
    const label = type === 'IN' ? String.fromCharCode(97 + (ins.length % 26)) : type === 'OUT' ? (outs.length ? `y${outs.length}` : 'y') : '';
    const n: GateNode = { id: newId(type.toLowerCase()), type, x: col, y: 40 + ((count * 90 + (type === 'IN' || type === 'OUT' ? 0 : circuit.nodes.length * 17)) % (CANVAS_H - 110)), label, delay: 1 };
    setCircuit((c) => ({ ...c, nodes: [...c.nodes, n] }));
    setSelected({ kind: 'node', id: n.id });
    setTrace(null);
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
      if (e.key === 'Escape') { setPending(null); setSelected(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeSelected]);

  const connect = (to: string, pin: number) => {
    if (!pending || pending === to) { setPending(null); return; }
    setCircuit((c) => ({
      ...c,
      wires: [...c.wires.filter((w) => !(w.to === to && w.pin === pin)), { id: newId('w'), from: pending, to, pin }],
    }));
    setPending(null);
    setTrace(null);
  };

  const toggleInput = (id: string) => {
    const before = { ...inputs };
    const after = { ...inputs, [id]: inputs[id] ? 0 : 1 };
    setInputs(after);
    if (timingMode) {
      setTrace(simulateTiming(circuit, before, after));
      setTraceTime(0);
    } else setTrace(null);
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
    const dr = drag.current;
    if (!dr) return;
    dr.moved = true;
    const x = Math.round(Math.min(CANVAS_W - W - 4, Math.max(4, p.x - dr.dx)) / 10) * 10;
    const y = Math.round(Math.min(CANVAS_H - H - 4, Math.max(4, p.y - dr.dy)) / 10) * 10;
    setCircuit((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === dr.id ? { ...n, x, y } : n)) }));
  };
  const onUp = () => {
    drag.current = null;
  };

  const loadPreset = (key: string) => {
    const p = PRESETS[key];
    setCircuit(structuredClone(p.circuit));
    setInputs(key === 'hazard' ? { a: 1, b: 1, c: 1 } : {});
    setName(key);
    setSelected(null);
    setPending(null);
    setTrace(null);
    if (key === 'hazard') setTimingMode(true);
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
  const btn = 'h-8 px-2.5 rounded-[4px] border text-[12px] font-medium flex items-center gap-1.5 transition-colors hover:bg-[var(--bg-hover)]';
  const btnStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' };
  const loopSet = new Set(ev.loop);

  return (
    <div data-testid="gate-editor" className="absolute inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <h1 className="text-[14px] font-bold mr-2">{g.title}</h1>
        <button type="button" className={btn} style={btnStyle} onClick={() => addNode('IN')} data-testid="gate-add-IN">+ {g.input}</button>
        <button type="button" className={btn} style={btnStyle} onClick={() => addNode('OUT')} data-testid="gate-add-OUT">+ {g.output}</button>
        <span className="w-px h-6" style={{ backgroundColor: 'var(--border-subtle)' }} />
        {GATE_TYPES.map((t) => (
          <button key={t} type="button" className={btn} style={btnStyle} onClick={() => addNode(t)} data-testid={`gate-add-${t}`} title={fmt(g.addGate, { gate: t })}>
            <svg width="26" height="18" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><GateShape type={t} fill="none" stroke="currentColor" /></svg>
            {t}
          </button>
        ))}
        <span className="flex-1" />
        <label className="flex items-center gap-1.5 text-[12px]">
          {g.presets}
          <select className="h-8 px-2 rounded-[4px] border text-[12px]" style={btnStyle} value="" onChange={(e) => e.target.value && loadPreset(e.target.value)} data-testid="gate-preset">
            <option value="">—</option>
            {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.title[lang]}</option>)}
          </select>
        </label>
        <button type="button" className={btn} style={btnStyle} onClick={() => { setCircuit({ nodes: [], wires: [] }); setInputs({}); setTrace(null); setSelected(null); }}>{g.clear}</button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Canvas */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="px-3 py-1.5 text-[11.5px] flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
            <span>{pending ? g.connectHint : g.help}</span>
            {ev.loop.length > 0 && <span style={{ color: '#ef4444' }}>{g.loopWarning}</span>}
            {ev.floating.length > 0 && <span style={{ color: '#d97706' }}>{fmt(g.floatingWarning, { n: ev.floating.length })}</span>}
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-3 pb-3">
            <svg
              ref={svgRef}
              data-testid="gate-canvas"
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className="w-full min-w-[720px] rounded-[6px] border select-none"
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
                const v = shown(w.from);
                const isSel = selected?.kind === 'wire' && selected.id === w.id;
                const dpath = wirePath(outPort(a), inPort(b, w.pin));
                return (
                  <g key={w.id} data-wire={w.id} data-value={v}>
                    <path d={dpath} fill="none" stroke="transparent" strokeWidth={12} onPointerDown={(e) => { e.stopPropagation(); setSelected({ kind: 'wire', id: w.id }); }} style={{ cursor: 'pointer' }} />
                    <path d={dpath} fill="none" stroke={isSel ? '#3b82f6' : v ? on : off} strokeWidth={isSel ? 3 : 2.2} pointerEvents="none" />
                  </g>
                );
              })}
              {pending && mouse && byId.get(pending) && (
                <path d={wirePath(outPort(byId.get(pending)!), mouse)} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />
              )}

              {/* Nodes */}
              {circuit.nodes.map((n) => {
                const v = shown(n.id);
                const isSel = selected?.kind === 'node' && selected.id === n.id;
                const glitch = trace?.glitches.includes(n.id);
                const stroke = loopSet.has(n.id) ? '#ef4444' : isSel ? '#3b82f6' : 'var(--text-secondary)';
                return (
                  <g key={n.id} data-node={n.id} data-type={n.type} data-value={v} transform={`translate(${n.x},${n.y})`}>
                    <g onPointerDown={(e) => onNodeDown(e, n)} style={{ cursor: 'move' }}>
                      {n.type === 'IN' || n.type === 'OUT' ? (
                        <rect x={4} y={6} width={W - 8} height={H - 12} rx={8} fill="var(--bg-surface)" stroke={stroke} strokeWidth={isSel ? 2.4 : 1.4} />
                      ) : (
                        <GateShape type={n.type} fill="var(--bg-surface)" stroke={stroke} />
                      )}
                      {glitch && <rect x={-4} y={-4} width={W + 8} height={H + 8} rx={10} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" />}
                    </g>
                    {n.type === 'IN' && (
                      <g data-testid={`gate-toggle-${n.label || n.id}`} onPointerDown={(e) => { e.stopPropagation(); toggleInput(n.id); }} style={{ cursor: 'pointer' }}>
                        <rect x={10} y={14} width={24} height={24} rx={5} fill={v ? on : 'var(--bg-panel)'} stroke="var(--text-secondary)" />
                        <text x={22} y={31} textAnchor="middle" fontSize={13} fontWeight={700} fill={v ? '#fff' : 'var(--text-primary)'}>{v}</text>
                      </g>
                    )}
                    {n.type === 'OUT' && (
                      <circle cx={24} cy={H / 2} r={10} fill={v ? '#ef4444' : 'var(--bg-panel)'} stroke="var(--text-secondary)" style={{ filter: v ? 'drop-shadow(0 0 6px rgba(239,68,68,0.9))' : undefined }} />
                    )}
                    {(n.type === 'IN' || n.type === 'OUT') && (
                      <text x={n.type === 'IN' ? 42 : 40} y={H / 2 + 4} fontSize={12} fontWeight={600} fill="var(--text-primary)" pointerEvents="none">{n.label}</text>
                    )}
                    {n.type !== 'IN' && n.type !== 'OUT' && (
                      <text x={W / 2 - 4} y={H + 12} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)" pointerEvents="none">
                        {n.type}{timingMode ? ` · ${n.delay}t` : ''}
                      </text>
                    )}
                    {/* Ports */}
                    {Array.from({ length: inputCount(n.type) }, (_, pin) => {
                      const p = inPort(n, pin);
                      return (
                        <circle key={pin} data-port={`${n.id}:in${pin}`} cx={p.x - n.x} cy={p.y - n.y} r={6} fill={pending ? '#3b82f6' : 'var(--bg-surface)'} stroke="var(--text-secondary)" strokeWidth={1.3} style={{ cursor: 'crosshair' }}
                          onPointerDown={(e) => { e.stopPropagation(); if (pending) connect(n.id, pin); }} />
                      );
                    })}
                    {hasOutput(n.type) && (
                      <circle data-port={`${n.id}:out`} cx={W} cy={H / 2} r={6} fill={pending === n.id ? '#3b82f6' : v ? on : 'var(--bg-surface)'} stroke="var(--text-secondary)" strokeWidth={1.3} style={{ cursor: 'crosshair' }}
                        onPointerDown={(e) => { e.stopPropagation(); setPending(pending === n.id ? null : n.id); setMouse(outPort(n)); }} />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Timing / glitch view */}
            <div className="mt-3 rounded-[6px] border p-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                  <input type="checkbox" data-testid="gate-timing" checked={timingMode} onChange={(e) => { setTimingMode(e.target.checked); setTrace(null); }} />
                  <Timer size={14} /> {g.timingMode}
                </label>
                <span className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>{timingMode ? g.timingHint : g.timingOff}</span>
                {trace && (
                  <span className="flex items-center gap-2 text-[11.5px] ml-auto">
                    t = {traceTime} / {trace.end}
                    <input type="range" min={0} max={trace.end} value={traceTime} onChange={(e) => setTraceTime(Number(e.target.value))} />
                    <button type="button" className="underline" onClick={() => setTraceTime(0)}>{g.replay}</button>
                  </span>
                )}
              </div>
              {trace && (
                <>
                  <p data-testid="gate-glitch-result" className="text-[12px] mt-2" style={{ color: trace.glitches.length ? '#d97706' : '#16a34a' }}>
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
        <aside className="lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l overflow-y-auto p-3 flex flex-col gap-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
          {sel ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{g.selected}: {sel.type}</h2>
              {(sel.type === 'IN' || sel.type === 'OUT') && (
                <label className="text-[12px] flex flex-col gap-1">
                  {g.signalName}
                  <input value={sel.label} onChange={(e) => setCircuit((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === sel.id ? { ...n, label: e.target.value } : n)) }))} className="h-8 px-2 rounded-[4px] border text-[13px] font-mono" style={btnStyle} />
                </label>
              )}
              {GATE_TYPES.includes(sel.type) && (
                <label className="text-[12px] flex items-center gap-2">
                  {g.delay}
                  <input type="number" min={1} max={5} value={sel.delay} onChange={(e) => setCircuit((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === sel.id ? { ...n, delay: Math.max(1, Math.min(5, Number(e.target.value) || 1)) } : n)) }))} className="h-8 w-16 px-2 rounded-[4px] border text-[13px]" style={btnStyle} />
                </label>
              )}
              <button type="button" className={btn} style={btnStyle} onClick={removeSelected}><Trash2 size={13} /> {g.delete}</button>
            </div>
          ) : selected?.kind === 'wire' ? (
            <button type="button" className={btn} style={btnStyle} onClick={removeSelected}><Trash2 size={13} /> {g.deleteWire}</button>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-[12px] flex items-center gap-2">
              {g.moduleName}
              <input value={name} onChange={(e) => setName(e.target.value)} className="h-8 flex-1 px-2 rounded-[4px] border text-[13px] font-mono" style={btnStyle} />
            </label>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className={btn} style={btnStyle} onClick={openInDe2} data-testid="gate-open-de2" disabled={ins.length === 0 || outs.length === 0}><Cpu size={13} /> {g.openDe2}</button>
              <OpenInSchematicButton className={btn} labelClassName="" getFiles={() => [{ name: `${name || 'gate_design'}.sv`, content: verilog }]} />
              <button type="button" className={btn} style={btnStyle} onClick={copyCode}><Copy size={13} /> {copied ? g.copied : g.copy}</button>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{g.de2Note}</p>
            <pre data-testid="gate-verilog" className="text-[11.5px] leading-snug p-2 rounded-[4px] border overflow-auto max-h-[260px] font-mono" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}>{verilog}</pre>
          </div>

          <div>
            <h2 className="text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{g.truthTable}</h2>
            {table ? (
              <table data-testid="gate-truth-table" className="text-[12px] font-mono border-collapse">
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
                        {r.out.map((b, k) => <td key={k} className="px-2 py-0.5 font-semibold" style={{ borderLeft: '1px solid var(--border-subtle)', color: b ? on : undefined }}>{b}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{g.tableNeedsInputs}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function TimingDiagram({ trace, nodes, time }: { trace: Trace; nodes: GateNode[]; time: number }) {
  const rows = nodes.filter((n) => trace.changes[n.id]);
  const end = Math.max(trace.end + 2, 8);
  const nameW = 70;
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
      {rows.map((n, i) => {
        const top = i * rowH + 5;
        const hi = top;
        const lo = top + rowH - 10;
        const list = trace.changes[n.id];
        let dpath = '';
        list.forEach(([t, v], k) => {
          const y = v ? hi : lo;
          dpath += k === 0 ? `M${x(0)},${y}` : `H${x(t)}V${y}`;
        });
        dpath += `H${x(end)}`;
        const glitch = trace.glitches.includes(n.id);
        return (
          <g key={n.id}>
            <text x={4} y={top + 11} fontSize={10.5} fill={glitch ? '#d97706' : 'var(--text-primary)'} fontFamily="var(--font-mono)">{n.label || n.type}</text>
            <path d={dpath} fill="none" stroke={glitch ? '#f59e0b' : '#22c55e'} strokeWidth={1.6} />
          </g>
        );
      })}
    </svg>
  );
}
