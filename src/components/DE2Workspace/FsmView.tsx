import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { extractFsm, type FsmModel } from '../../board/fsmExtract';
import { useBoardStore } from '../../store/boardStore';

import { useT } from '../../i18n/toolText';
const NODE_R = 30;

/** Current numeric value of the state register (flattened names tolerated). */
function useStateValue(stateVar: string | null): number | null {
  return useBoardStore((s) => {
    if (!stateVar || !s.engine) return null;
    const direct = s.simState[stateVar];
    if (typeof direct === 'number') return direct;
    const key = Object.keys(s.simState).find((k) => k.endsWith(`_${stateVar}`) && !k.startsWith('__prev_'));
    return key ? s.simState[key] : null;
  });
}

function truncate(text: string, max = 22): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function layout(model: FsmModel, width: number, height: number) {
  const n = model.states.length;
  const cx = width / 2;
  const cy = height / 2;
  // An ellipse uses the wide, short console panel better than a circle.
  const rx = Math.max(70, Math.min(width / 2 - NODE_R - 50, (height / 2 - NODE_R - 26) * 2.2));
  const ry = Math.max(50, height / 2 - NODE_R - 26);
  const pos = new Map<string, { x: number; y: number }>();
  model.states.forEach((s, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    pos.set(s.name, { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  });
  return { pos, cx, cy };
}

/**
 * State diagram of the FSM found in the compiled design, with the live state
 * highlighted as the board runs. Read-only: it reads the board store and the
 * source text, and never drives the simulation.
 */
export function FsmView({ source }: { source: string }) {
  const t = useT();
  const model = useMemo(() => (source ? extractFsm(source) : null), [source]);
  const value = useStateValue(model?.stateVar ?? null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 260 });
  const prevRef = useRef<string | null>(null);
  const [lastEdge, setLastEdge] = useState<{ from: string; to: string } | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: Math.max(320, el.clientWidth), h: Math.max(220, el.clientHeight) });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = model?.states.find((s) => s.value !== null && s.value === value)?.name ?? null;

  useEffect(() => {
    if (current && prevRef.current && prevRef.current !== current) setLastEdge({ from: prevRef.current, to: current });
    prevRef.current = current;
  }, [current]);

  if (!source) {
    return <div data-testid="fsm-view" className="italic text-xs" style={{ color: 'var(--text-muted)' }}>{t("Compile a design to see its state machine.")}</div>;
  }
  if (!model) {
    return (
      <div data-testid="fsm-view" className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        No state machine found. The diagram appears for designs with a <code className="font-mono">case (state)</code> whose items assign the next
        state, e.g. <code className="font-mono">S0: if (go) state &lt;= S1;</code> or <code className="font-mono">next = S1;</code> with <code className="font-mono">state &lt;= next;</code>.
      </div>
    );
  }

  const { w, h } = size;
  const { pos, cx, cy } = layout(model, w, h);
  const pairCount = new Map<string, number>();
  for (const t of model.transitions) {
    const k = [t.from, t.to].sort().join('|');
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
  }
  const seenPair = new Map<string, number>();

  return (
    <div data-testid="fsm-view" data-fsm-state-var={model.stateVar} data-fsm-current={current ?? ''} className="flex flex-col gap-1 h-full">
      <div className="text-[0.6875rem] font-sans" style={{ color: 'var(--text-muted)' }}>
        State register <code className="font-mono" style={{ color: 'var(--text-primary)' }}>{model.stateVar}</code>
        {' · '}{model.states.length} states · {model.transitions.length} transitions
        {current ? <> · now <b style={{ color: '#f59e0b' }}>{current}</b></> : value !== null ? <> · value {value} (unnamed)</> : null}
      </div>
      <div ref={wrapRef} className="flex-1 min-h-0">
        <svg width={w} height={h} role="img" aria-label={t("State diagram")} style={{ display: 'block' }}>
          <defs>
            <marker id="fsm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--text-secondary)" />
            </marker>
            <marker id="fsm-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#f59e0b" />
            </marker>
          </defs>

          {model.transitions.map((t, i) => {
            const a = pos.get(t.from)!;
            const b = pos.get(t.to)!;
            const hot = lastEdge?.from === t.from && lastEdge?.to === t.to;
            const stroke = hot ? '#f59e0b' : 'var(--text-secondary)';
            const label = t.condition ? truncate(t.condition === 'else' ? 'else' : t.condition) : '';
            if (t.from === t.to) {
              // Self-loop drawn on the outside of the ring.
              const dx = a.x - cx;
              const dy = a.y - cy;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len;
              const uy = dy / len;
              const px = -uy;
              const py = ux;
              const s1 = { x: a.x + (ux * 0.7 + px * 0.7) * NODE_R, y: a.y + (uy * 0.7 + py * 0.7) * NODE_R };
              const s2 = { x: a.x + (ux * 0.7 - px * 0.7) * NODE_R, y: a.y + (uy * 0.7 - py * 0.7) * NODE_R };
              const c1 = { x: a.x + (ux * 2.6 + px * 1.3) * NODE_R, y: a.y + (uy * 2.6 + py * 1.3) * NODE_R };
              const c2 = { x: a.x + (ux * 2.6 - px * 1.3) * NODE_R, y: a.y + (uy * 2.6 - py * 1.3) * NODE_R };
              return (
                <g key={i} data-fsm-edge={`${t.from}->${t.to}`}>
                  <path d={`M${s1.x},${s1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${s2.x},${s2.y}`} fill="none" stroke={stroke} strokeWidth={hot ? 2 : 1.3} markerEnd={`url(#${hot ? 'fsm-arrow-hot' : 'fsm-arrow'})`} />
                  {label && <text x={a.x + ux * 2.35 * NODE_R} y={a.y + uy * 2.35 * NODE_R} fontSize={10} textAnchor="middle" fill="var(--text-primary)" style={{ fontFamily: 'var(--font-mono)' }}>{label}</text>}
                </g>
              );
            }
            const key = [t.from, t.to].sort().join('|');
            const k = seenPair.get(key) ?? 0;
            seenPair.set(key, k + 1);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            // Bend so A→B and B→A (and parallel guards) do not overlap.
            const multi = (pairCount.get(key) ?? 1) > 1;
            const bend = multi ? 26 + 16 * Math.floor(k / 2) : 0;
            // The unit vector flips with direction, so A→B and B→A bend to opposite sides.
            const nx = -uy * bend;
            const ny = ux * bend;
            const start = { x: a.x + ux * NODE_R, y: a.y + uy * NODE_R };
            const end = { x: b.x - ux * (NODE_R + 2), y: b.y - uy * (NODE_R + 2) };
            const ctrl = { x: (start.x + end.x) / 2 + nx, y: (start.y + end.y) / 2 + ny };
            const mid = { x: (start.x + 2 * ctrl.x + end.x) / 4, y: (start.y + 2 * ctrl.y + end.y) / 4 };
            return (
              <g key={i} data-fsm-edge={`${t.from}->${t.to}`}>
                <path d={`M${start.x},${start.y} Q${ctrl.x},${ctrl.y} ${end.x},${end.y}`} fill="none" stroke={stroke} strokeWidth={hot ? 2 : 1.3} markerEnd={`url(#${hot ? 'fsm-arrow-hot' : 'fsm-arrow'})`} />
                {label && (
                  <text x={mid.x} y={mid.y - 4} fontSize={10} textAnchor="middle" fill="var(--text-primary)" stroke="var(--bg-panel)" strokeWidth={3} paintOrder="stroke" style={{ fontFamily: 'var(--font-mono)' }}>
                    {label}
                    <title>{t.condition}</title>
                  </text>
                )}
              </g>
            );
          })}

          {model.states.map((s) => {
            const p = pos.get(s.name)!;
            const active = s.name === current;
            return (
              <g key={s.name} data-fsm-state={s.name} data-active={active ? 'true' : 'false'}>
                {model.initial === s.name && (
                  <circle cx={p.x} cy={p.y} r={NODE_R + 4} fill="none" stroke="var(--text-muted)" strokeWidth={1} />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={NODE_R}
                  fill={active ? 'rgba(245, 158, 11, 0.22)' : 'var(--bg-surface)'}
                  stroke={active ? '#f59e0b' : 'var(--border-strong, #64748b)'}
                  strokeWidth={active ? 2.5 : 1.3}
                />
                <text x={p.x} y={p.y + 4} fontSize={11} fontWeight={600} textAnchor="middle" fill="var(--text-primary)" style={{ fontFamily: 'var(--font-mono)' }}>
                  {truncate(s.name, 9)}
                  <title>{`${s.name}${s.value !== null ? ` = ${s.value}` : ''}${model.initial === s.name ? ' (reset state)' : ''}`}</title>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
