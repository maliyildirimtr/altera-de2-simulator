import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Crosshair, Download, Pause, Play, Trash2, Waves } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  MAX_SAMPLES,
  captureToVcd,
  clearCapture,
  getCapture,
  getTrigger,
  getTriggerSample,
  getTriggerStatus,
  isCapturePaused,
  setCapturePaused,
  setTrigger,
  startSignalRecorder,
  subscribeCapture,
} from '../../board/signalRecorder';
import type { TriggerCondition } from '../../board/signalRecorder';
import { downloadText } from '../../utils/svgExport';
import { setPendingVcd } from '../../services/vcdHandoff';

startSignalRecorder();

const NAME_W = 132;
const ROW_H = 26;
const PAD_Y = 6;

function useThrottledCapture() {
  // Re-render at most once per animation frame, however fast samples arrive.
  const [, force] = useState(0);
  const pending = useRef(false);
  useEffect(() => subscribeCapture(() => {
    if (pending.current) return;
    pending.current = true;
    requestAnimationFrame(() => { pending.current = false; force((n) => n + 1); });
  }), []);
  return getCapture();
}

function formatValue(v: number, width: number): string {
  if (width <= 1) return String(v);
  const hex = (v >>> 0).toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0');
  return `${hex}h`;
}

/**
 * A small logic analyzer for the DE2 simulator: every top-level port of the
 * compiled design, sampled each time the design is evaluated (switch, key or
 * clock edge). 1-bit signals draw as square waves, vectors as bus segments
 * labelled in hex.
 */
export function LogicAnalyzer() {
  const cap = useThrottledCapture();
  const paused = useSyncExternalStore(subscribeCapture, isCapturePaused);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const triggerStatus = useSyncExternalStore(subscribeCapture, getTriggerStatus);
  const armed = getTrigger();
  const triggerN = getTriggerSample();
  const [trigSignal, setTrigSignal] = useState('');
  const [trigCondition, setTrigCondition] = useState<TriggerCondition>('rise');
  const [trigValue, setTrigValue] = useState('0');

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const signals = cap.signals.filter((s) => !hidden[s]);
  const samples = cap.samples;
  const plotW = Math.max(120, width - NAME_W - 8);
  const step = plotW / Math.max(32, Math.min(MAX_SAMPLES, samples.length));
  const x0 = NAME_W;

  if (cap.signals.length === 0) {
    return (
      <div data-testid="logic-analyzer" className="italic text-xs" style={{ color: 'var(--text-muted)' }}>
        Compile a design to probe its ports. Every switch, key or clock change adds a sample.
      </div>
    );
  }

  const selectedSignal = cap.signals.includes(trigSignal) ? trigSignal : cap.signals[0];
  const selectedWidth = cap.widths[selectedSignal] ?? 1;
  const parseTrigValue = (text: string): number => {
    const t = text.trim().toLowerCase();
    const v = t.startsWith('0x') ? parseInt(t.slice(2), 16) : t.startsWith('0b') ? parseInt(t.slice(2), 2) : parseInt(t, 10);
    return Number.isFinite(v) ? v : 0;
  };
  const toggleTrigger = () => {
    if (armed) setTrigger(null);
    else {
      const condition = selectedWidth > 1 && (trigCondition === 'rise' || trigCondition === 'fall') ? 'change' : trigCondition;
      setTrigger({ signal: selectedSignal, condition, value: parseTrigValue(trigValue) });
    }
  };
  const exportVcd = () => downloadText(captureToVcd(), 'de2_capture.vcd', 'text/plain');
  const openInWaveform = () => {
    if (setPendingVcd({ name: 'de2_capture.vcd', content: captureToVcd() })) navigate('/waveform');
  };
  const triggerText =
    triggerStatus === 'armed' ? 'Armed — waiting for trigger'
    : triggerStatus === 'triggered' ? 'Triggered — capturing post-trigger samples'
    : triggerStatus === 'done' ? 'Triggered — capture stopped'
    : '';
  const triggerIndex = triggerN === null ? -1 : samples.findIndex((sample) => sample.n === triggerN);
  const btn = 'flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-[11px] disabled:opacity-40';
  const btnStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' };
  const field = 'px-1.5 py-0.5 rounded-[4px] border text-[11px]';
  const fieldStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-input)' };

  return (
    <div data-testid="logic-analyzer" className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2 flex-wrap font-sans">
        <button
          type="button"
          onClick={() => setCapturePaused(!paused)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-[11px]"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
          data-testid="analyzer-pause"
        >
          {paused ? <Play size={11} /> : <Pause size={11} />}
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={clearCapture}
          className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-[11px]"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}
          data-testid="analyzer-clear"
        >
          <Trash2 size={11} /> Clear
        </button>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {samples.length} / {MAX_SAMPLES} samples · click a name to hide it
        </span>
        {Object.keys(hidden).some((k) => hidden[k]) && (
          <button type="button" className="text-[11px] underline" style={{ color: 'var(--text-secondary)' }} onClick={() => setHidden({})}>
            Show all
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={exportVcd} disabled={samples.length === 0} className={btn} style={btnStyle} data-testid="analyzer-export-vcd" title="Download the capture as a .vcd file">
          <Download size={11} /> VCD
        </button>
        <button type="button" onClick={openInWaveform} disabled={samples.length === 0} className={btn} style={btnStyle} data-testid="analyzer-open-waveform" title="Open the capture in the Waveform tool">
          <Waves size={11} /> Open in Waveform
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap font-sans" data-testid="analyzer-trigger">
        <Crosshair size={12} style={{ color: 'var(--text-muted)' }} />
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Trigger</span>
        <select
          value={armed ? armed.signal : selectedSignal}
          disabled={!!armed}
          onChange={(e) => setTrigSignal(e.target.value)}
          className={field}
          style={fieldStyle}
          data-testid="analyzer-trigger-signal"
          aria-label="Trigger signal"
        >
          {cap.signals.map((sig) => <option key={sig} value={sig}>{sig}</option>)}
        </select>
        <select
          value={armed ? armed.condition : selectedWidth > 1 && (trigCondition === 'rise' || trigCondition === 'fall') ? 'change' : trigCondition}
          disabled={!!armed}
          onChange={(e) => setTrigCondition(e.target.value as TriggerCondition)}
          className={field}
          style={fieldStyle}
          data-testid="analyzer-trigger-condition"
          aria-label="Trigger condition"
        >
          {selectedWidth === 1 && <option value="rise">rising edge</option>}
          {selectedWidth === 1 && <option value="fall">falling edge</option>}
          <option value="change">any change</option>
          <option value="equals">equals</option>
        </select>
        {(armed ? armed.condition : trigCondition) === 'equals' && (
          <input
            value={armed ? String(armed.value) : trigValue}
            disabled={!!armed}
            onChange={(e) => setTrigValue(e.target.value)}
            className={`${field} w-16`}
            style={fieldStyle}
            data-testid="analyzer-trigger-value"
            aria-label="Trigger value (decimal, 0x hex or 0b binary)"
            placeholder="0x0F"
          />
        )}
        <button type="button" onClick={toggleTrigger} className={btn} style={btnStyle} data-testid="analyzer-trigger-arm">
          {armed ? 'Disarm' : 'Arm'}
        </button>
        {triggerText && (
          <span className="text-[11px]" data-testid="analyzer-trigger-status" data-status={triggerStatus} style={{ color: triggerStatus === 'armed' ? 'var(--state-warning)' : 'var(--state-success)' }}>
            {triggerText}
          </span>
        )}
      </div>

      <div ref={wrapRef} className="flex-1 min-h-0 overflow-y-auto">
        <svg
          width={width}
          height={signals.length * ROW_H + 4}
          role="img"
          aria-label="Logic analyzer traces"
          style={{ display: 'block' }}
        >
          {signals.map((sig, row) => {
            const w = cap.widths[sig] ?? 1;
            const top = row * ROW_H;
            const hi = top + PAD_Y;
            const lo = top + ROW_H - PAD_Y;
            const mid = (hi + lo) / 2;
            const last = samples.length ? samples[samples.length - 1].values[sig] ?? 0 : 0;
            let path = '';
            const labels: Array<{ x: number; text: string }> = [];
            if (w === 1) {
              samples.forEach((s, i) => {
                const y = s.values[sig] ? hi : lo;
                const x = x0 + i * step;
                path += i === 0 ? `M${x},${y}` : `V${y}`;
                path += `H${x + step}`;
              });
            } else {
              let segStart = 0;
              for (let i = 0; i <= samples.length; i++) {
                const changed = i === samples.length || (i > 0 && samples[i].values[sig] !== samples[i - 1].values[sig]);
                if (i > 0 && changed) {
                  const xa = x0 + segStart * step;
                  const xb = x0 + i * step;
                  const e = Math.min(3, (xb - xa) / 2);
                  path += `M${xa},${mid}L${xa + e},${hi}H${xb - e}L${xb},${mid}L${xb - e},${lo}H${xa + e}Z`;
                  if (xb - xa > 26) labels.push({ x: (xa + xb) / 2, text: formatValue(samples[segStart].values[sig] ?? 0, w) });
                  segStart = i;
                }
              }
            }
            return (
              <g key={sig}>
                <line x1={0} x2={width} y1={top + ROW_H} y2={top + ROW_H} stroke="var(--border-subtle)" strokeWidth={0.5} />
                <text
                  x={6}
                  y={mid + 4}
                  fontSize={11}
                  fill="var(--text-primary)"
                  style={{ cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                  onClick={() => setHidden((h) => ({ ...h, [sig]: true }))}
                >
                  {sig.length > 12 ? `${sig.slice(0, 11)}…` : sig}
                  <title>{`${sig}${w > 1 ? ` [${w - 1}:0]` : ''} = ${formatValue(last, w)} (click to hide)`}</title>
                </text>
                <text x={NAME_W - 6} y={mid + 4} fontSize={10} textAnchor="end" fill="var(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatValue(last, w)}
                </text>
                <path
                  d={path}
                  fill={w > 1 ? 'rgba(96, 165, 250, 0.12)' : 'none'}
                  stroke={w > 1 ? '#60a5fa' : '#34d399'}
                  strokeWidth={1.4}
                />
                {labels.map((l, i) => (
                  <text key={i} x={l.x} y={mid + 3.5} fontSize={9.5} textAnchor="middle" fill="var(--text-primary)" style={{ fontFamily: 'var(--font-mono)' }}>
                    {l.text}
                  </text>
                ))}
              </g>
            );
          })}
          {triggerIndex >= 0 && (
            <line
              data-testid="analyzer-trigger-marker"
              x1={x0 + triggerIndex * step}
              x2={x0 + triggerIndex * step}
              y1={0}
              y2={signals.length * ROW_H + 4}
              stroke="#f59e0b"
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
