import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Cpu, Shapes } from 'lucide-react';
import {
  ParseError,
  cellMinterm,
  covers,
  kmapLayout,
  minimize,
  parseExpression,
  sopText,
  sopToCircuit,
  sopVerilog,
  tableOf,
  termText,
  variablesOf,
} from '../logic/boolean';
import { toDe2Verilog } from '../gates/circuit';
import { useI18n } from '../i18n/I18nProvider';
import { fmt } from '../i18n/dictionary';
import { useBoardStore } from '../store/boardStore';
import { markWorkspaceDirty, markWorkspaceUser } from '../services/exampleHandoff';

const GATES_KEY = 'logiclab_gates_v1';
const GROUP_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#65a30d'];
const DEFAULT_VARS = ['a', 'b', 'c', 'd'];

/** 0, 1 or 2 (= X, don't care) per truth-table row. */
type Cell = 0 | 1 | 2;

function bitsOf(m: number, n: number): string {
  return m.toString(2).padStart(n, '0');
}

/**
 * Karnaugh map and Boolean expression tool: type an expression or click the
 * truth table, see the K-map with its groups, the minimal sum of products,
 * the Verilog, and send the result to the gate designer or the DE2 board.
 */
export default function KMap() {
  const { d } = useI18n();
  const k = d.kmap;
  const navigate = useNavigate();
  const [vars, setVars] = useState<string[]>(['a', 'b', 'c']);
  const [cells, setCells] = useState<Cell[]>(() => tableOf(parseExpression("ab + a'c"), ['a', 'b', 'c']) as Cell[]);
  const [expr, setExpr] = useState("ab + a'c");
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const n = vars.length;
  const location = useLocation();

  const applyExpression = (text: string) => {
    setExpr(text);
    try {
      const ast = parseExpression(text);
      const used = variablesOf(ast);
      if (used.length > 4) {
        setError(k.tooManyVars);
        return;
      }
      const nextVars = used.length >= 2 ? used : [...used, ...DEFAULT_VARS.filter((v) => !used.includes(v))].slice(0, 2).sort();
      setVars(nextVars);
      setCells(tableOf(ast, nextVars) as Cell[]);
      setError('');
    } catch (err) {
      const pos = err instanceof ParseError ? err.position : 0;
      setError(fmt(k.parseError, { msg: (err as Error).message, pos: pos + 1 }));
    }
  };

  // #/kmap?expr=… (used by the lessons) preloads an expression.
  useEffect(() => {
    const incoming = new URLSearchParams(location.search).get('expr');
    if (incoming) applyExpression(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const setVarCount = (count: number) => {
    const next = DEFAULT_VARS.slice(0, count);
    setVars(next);
    setCells(Array(1 << count).fill(0));
    setError('');
  };

  const cycle = (m: number) => setCells((c) => c.map((v, i) => (i === m ? (((v + 1) % 3) as Cell) : v)));

  const ones = useMemo(() => cells.flatMap((v, i) => (v === 1 ? [i] : [])), [cells]);
  const dcs = useMemo(() => cells.flatMap((v, i) => (v === 2 ? [i] : [])), [cells]);
  const cover = useMemo(() => minimize(n, ones, dcs), [n, ones, dcs]);
  const sop = sopText(cover, vars);
  const verilog = `module kmap_design (\n${vars.map((v) => `    input  logic ${v},`).join('\n')}\n    output logic y\n);\n\n    // y = ${sop}\n    assign y = ${sopVerilog(cover, vars)};\n\nendmodule\n`;
  const layout = kmapLayout(n);
  const rowVarNames = vars.slice(0, layout.rowVars).join('');
  const colVarNames = vars.slice(layout.rowVars).join('');
  const literals = cover.reduce((s, p) => s + termText(p, vars).replace(/'/g, '').length, 0);

  const openInGates = () => {
    try {
      localStorage.setItem(GATES_KEY, JSON.stringify({ circuit: sopToCircuit(cover, vars), inputs: {}, name: 'kmap_design' }));
    } catch {
      /* the editor opens with its last design */
    }
    navigate('/gates');
  };
  const runOnDe2 = () => {
    const st = useBoardStore.getState();
    st.setHdlCode(toDe2Verilog(sopToCircuit(cover, vars), 'kmap_design'));
    st.setPinMappings([]);
    st.setEngine(null);
    st.resetBoard();
    markWorkspaceUser('de2');
    markWorkspaceDirty('de2');
    navigate('/de2-simulator');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(verilog);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const card = 'rounded-[6px] border p-4 flex flex-col gap-3';
  const cardStyle = { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' };
  const btn = 'h-8 px-3 rounded-[4px] border text-[12.5px] font-medium flex items-center gap-1.5 hover:bg-[var(--bg-hover)]';
  const btnStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' };
  const cellText = (v: Cell) => (v === 2 ? 'X' : String(v));

  return (
    <div data-testid="kmap-page" className="absolute inset-0 overflow-y-auto" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold">{k.title}</h1>
          <p className="text-[14px] mt-1 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>{k.lead}</p>
        </header>

        <section className={card} style={cardStyle}>
          <label className="text-[12.5px] font-semibold" htmlFor="kmap-expr">{k.expression}</label>
          <div className="flex gap-2 flex-wrap">
            <input
              id="kmap-expr"
              data-testid="kmap-expr"
              value={expr}
              onChange={(e) => applyExpression(e.target.value)}
              className="flex-1 min-w-[240px] h-10 px-3 rounded-[4px] border font-mono text-[15px]"
              style={{ borderColor: error ? '#ef4444' : 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' }}
              spellCheck={false}
            />
            <label className="flex items-center gap-2 text-[12.5px]">
              {k.variables}
              <select value={n} onChange={(e) => setVarCount(Number(e.target.value))} className="h-10 px-2 rounded-[4px] border" style={btnStyle} data-testid="kmap-nvars">
                {[2, 3, 4].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[11.5px]" style={{ color: error ? '#ef4444' : 'var(--text-muted)' }}>{error || k.syntax}</p>
        </section>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* K-map */}
          <section className={card} style={cardStyle}>
            <h2 className="text-[14px] font-bold">{k.kmap}</h2>
            <div className="overflow-x-auto">
              <table data-testid="kmap-grid" className="border-collapse font-mono text-[14px]">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-[11px] text-right" style={{ color: 'var(--text-muted)' }}>{rowVarNames}\{colVarNames}</th>
                    {layout.cols.map((c) => <th key={c} className="px-3 py-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>{bitsOf(c, layout.colVars)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {layout.rows.map((r) => (
                    <tr key={r}>
                      <th className="px-2 py-1 text-[12px] text-right" style={{ color: 'var(--text-secondary)' }}>{bitsOf(r, layout.rowVars)}</th>
                      {layout.cols.map((c) => {
                        const m = cellMinterm(n, r, c);
                        const groups = cover.map((p, gi) => (covers(p, m) ? gi : -1)).filter((gi) => gi >= 0);
                        const shadow = groups.map((gi, j) => `inset 0 0 0 ${3 + j * 3}px ${GROUP_COLORS[gi % GROUP_COLORS.length]}`).join(', ');
                        return (
                          <td key={c} className="p-0">
                            <button
                              type="button"
                              data-testid={`kmap-cell-${m}`}
                              onClick={() => { cycle(m); setExpr(''); }}
                              className="w-14 h-14 border text-[18px] font-bold relative"
                              style={{ borderColor: 'var(--border-subtle)', boxShadow: shadow || undefined, color: cells[m] === 1 ? 'var(--text-primary)' : 'var(--text-muted)', backgroundColor: 'var(--bg-panel)' }}
                              title={`m${m} (${vars.map((v, i) => `${v}=${(m >> (n - 1 - i)) & 1}`).join(', ')})`}
                            >
                              {cellText(cells[m])}
                              <span className="absolute left-1 top-0.5 text-[9px] font-normal" style={{ color: 'var(--text-muted)' }}>{m}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{k.cellHint}</p>
          </section>

          {/* Result */}
          <section className={card} style={cardStyle}>
            <h2 className="text-[14px] font-bold">{k.result}</h2>
            <p className="font-mono text-[18px]" data-testid="kmap-sop">
              y = {cover.length === 0 ? '0' : cover.map((p, gi) => (
                <span key={gi}>
                  {gi > 0 && ' + '}
                  <span style={{ color: GROUP_COLORS[gi % GROUP_COLORS.length], fontWeight: 700 }}>{termText(p, vars)}</span>
                </span>
              ))}
            </p>
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              {fmt(k.stats, { terms: cover.length, literals })} · Σm({ones.join(', ') || '—'}){dcs.length ? ` + d(${dcs.join(', ')})` : ''}
            </p>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className={btn} style={btnStyle} onClick={openInGates} data-testid="kmap-to-gates"><Shapes size={13} /> {k.toGates}</button>
              <button type="button" className={btn} style={btnStyle} onClick={runOnDe2} data-testid="kmap-to-de2"><Cpu size={13} /> {k.toDe2}</button>
              <button type="button" className={btn} style={btnStyle} onClick={copy}><Copy size={13} /> {copied ? k.copied : k.copyVerilog}</button>
            </div>
            <pre className="text-[12px] p-2 rounded-[4px] border overflow-auto font-mono" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}>{verilog}</pre>
          </section>
        </div>

        {/* Truth table */}
        <section className={card} style={cardStyle}>
          <h2 className="text-[14px] font-bold">{k.truthTable}</h2>
          <div className="overflow-x-auto">
            <table data-testid="kmap-truth" className="font-mono text-[13px] border-collapse">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left" style={{ color: 'var(--text-muted)' }}>m</th>
                  {vars.map((v) => <th key={v} className="px-2 py-1">{v}</th>)}
                  <th className="px-3 py-1" style={{ borderLeft: '1px solid var(--border-subtle)' }}>y</th>
                </tr>
              </thead>
              <tbody>
                {cells.map((v, m) => (
                  <tr key={m} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td className="px-2 py-0.5" style={{ color: 'var(--text-muted)' }}>{m}</td>
                    {bitsOf(m, n).split('').map((b, i) => <td key={i} className="px-2 py-0.5 text-center">{b}</td>)}
                    <td className="px-1 py-0.5" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                      <button type="button" onClick={() => { cycle(m); setExpr(''); }} className="w-8 h-6 rounded-[3px] font-bold" style={{ backgroundColor: v === 1 ? 'rgba(34,197,94,0.18)' : v === 2 ? 'rgba(217,119,6,0.15)' : 'transparent', color: v === 1 ? '#16a34a' : v === 2 ? '#d97706' : 'var(--text-muted)' }}>{cellText(v)}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
