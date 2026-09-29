import { useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, ListOrdered, Play, Wand2, X } from 'lucide-react';
import {
  defaultSpec,
  exhaustive,
  generateTestbench,
  mask,
  MAX_EXHAUSTIVE_BITS,
  MAX_STEPS,
  MIN_STEPS,
  readPorts,
  resizeSpec,
  setValue,
  type StimulusSpec,
} from '../../waveform/stimulus';
import { useI18n } from '../../i18n/I18nProvider';

const TEXT = {
  en: {
    title: 'Stimulus editor',
    lead: 'Draw the input signals over time instead of writing a testbench. Click (or drag across) a cell to set a 1-bit input high or low; type a hex value for a bus. Logic Lab writes the testbench and runs it, and the outputs appear in the waveform.',
    noPorts: 'Could not read the ports of the active source file. Open or write a module first.',
    steps: 'Steps',
    stepTime: 'Step length (ns)',
    clock: 'Clock input',
    none: 'none',
    period: 'Clock period (ns)',
    all: 'All combinations',
    allOff: `Only for up to ${MAX_EXHAUSTIVE_BITS} input bits without a clock`,
    clear: 'Set all to 0',
    step: 'step',
    clockRow: 'free-running clock',
    outputs: 'Outputs (computed by the simulator)',
    preview: 'Testbench preview',
    create: 'Create testbench',
    run: 'Create & run',
    overwrite: 'Replace the current testbench with the generated one?',
    cancel: 'Close',
  },
  tr: {
    title: 'Uyarı (stimulus) editörü',
    lead: 'Testbench yazmak yerine giriş sinyallerini zaman içinde çiz. 1 bitlik bir girişi 1 ya da 0 yapmak için hücreye tıkla (veya sürükle); çok bitli girişlere onaltılık değer yaz. Logic Lab testbench dosyasını yazar ve çalıştırır; çıkışlar dalga formunda görünür.',
    noPorts: 'Etkin kaynak dosyanın portları okunamadı. Önce bir modül aç ya da yaz.',
    steps: 'Adım',
    stepTime: 'Adım süresi (ns)',
    clock: 'Saat girişi',
    none: 'yok',
    period: 'Saat periyodu (ns)',
    all: 'Tüm kombinasyonlar',
    allOff: `Yalnızca saatsiz ve en çok ${MAX_EXHAUSTIVE_BITS} giriş bitinde`,
    clear: 'Hepsini 0 yap',
    step: 'adım',
    clockRow: 'sürekli saat',
    outputs: 'Çıkışlar (simülatör hesaplar)',
    preview: 'Testbench önizlemesi',
    create: 'Testbench oluştur',
    run: 'Oluştur ve çalıştır',
    overwrite: 'Mevcut testbench, oluşturulanla değiştirilsin mi?',
    cancel: 'Kapat',
  },
};

const CELL = 26;

export interface StimulusEditorProps {
  open: boolean;
  onClose: () => void;
  source: string;
  hasTestbench: boolean;
  onGenerate: (fileName: string, code: string, run: boolean) => void;
}

export function StimulusEditor({ open, onClose, source, hasTestbench, onGenerate }: StimulusEditorProps) {
  const { lang } = useI18n();
  const t = TEXT[lang];
  const ports = useMemo(() => (open ? readPorts(source) : null), [open, source]);
  const [spec, setSpec] = useState<StimulusSpec | null>(null);
  const paint = useRef<{ name: string; value: number } | null>(null);

  // Start from a fresh default whenever the design's ports change.
  const portsKey = ports ? `${ports.top}|${ports.inputs.map((p) => `${p.name}:${p.width}`).join(',')}|${ports.outputs.map((p) => `${p.name}:${p.width}`).join(',')}` : '';
  useEffect(() => {
    setSpec(ports ? defaultSpec(ports) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portsKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const stopPaint = () => {
      paint.current = null;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerup', stopPaint);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', stopPaint);
    };
  }, [open, onClose]);

  const code = useMemo(() => {
    if (!spec) return '';
    try {
      return generateTestbench(spec);
    } catch (err) {
      return `// ${(err as Error).message}`;
    }
  }, [spec]);

  if (!open) return null;

  const data = spec ? spec.inputs.filter((p) => p.name !== spec.clock) : [];
  const dataBits = data.reduce((n, p) => n + p.width, 0);
  const canExhaust = !!spec && !spec.clock && dataBits > 0 && dataBits <= MAX_EXHAUSTIVE_BITS;

  const update = (fn: (s: StimulusSpec) => StimulusSpec) => setSpec((s) => (s ? fn(s) : s));

  const finish = (run: boolean) => {
    if (!spec || /^\/\/ Unsupported/.test(code)) return;
    if (hasTestbench && !window.confirm(t.overwrite)) return;
    onGenerate(`${spec.top}_tb.sv`, code, run);
  };

  const input = 'h-8 px-2 rounded-[0.25rem] border text-[0.7812rem] bg-transparent';
  const inputStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-app)' };
  const btn = 'h-8 px-3 rounded-[0.25rem] border text-[0.7812rem] font-medium flex items-center gap-1.5 disabled:opacity-40';
  const btnStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' };
  const nameCol = 'sticky left-0 z-[1] pr-3 font-mono text-[0.75rem] whitespace-nowrap';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="stim-title" data-testid="stimulus-editor" className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-[0.5rem] border shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <Wand2 size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 id="stim-title" className="text-[0.875rem] font-bold flex-1">{t.title}{spec ? <span className="font-mono font-normal" style={{ color: 'var(--text-muted)' }}> — {spec.top}</span> : null}</h2>
          <button type="button" aria-label={t.cancel} onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]"><X size={15} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
          <p className="text-[0.7812rem] leading-snug" style={{ color: 'var(--text-secondary)' }}>{t.lead}</p>
          {!spec ? (
            <p data-testid="stim-noports" className="text-[0.8125rem]" style={{ color: '#d97706' }}>{t.noPorts}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-[0.7188rem] font-semibold">{t.steps}
                  <input data-testid="stim-steps" type="number" min={MIN_STEPS} max={MAX_STEPS} className={`${input} w-20`} style={inputStyle} value={spec.steps} onChange={(e) => update((s) => resizeSpec(s, Number(e.target.value) || MIN_STEPS))} />
                </label>
                <label className="flex flex-col gap-1 text-[0.7188rem] font-semibold">{t.clock}
                  <select data-testid="stim-clock" className={input} style={inputStyle} value={spec.clock ?? ''} onChange={(e) => update((s) => resizeSpec({ ...s, clock: e.target.value || null, stepTime: e.target.value ? s.clockPeriod : s.stepTime }, s.steps))}>
                    <option value="">{t.none}</option>
                    {spec.inputs.filter((p) => p.width === 1).map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </label>
                {spec.clock ? (
                  <label className="flex flex-col gap-1 text-[0.7188rem] font-semibold">{t.period}
                    <input data-testid="stim-period" type="number" min={2} max={1000} step={2} className={`${input} w-24`} style={inputStyle} value={spec.clockPeriod} onChange={(e) => { const v = Math.max(2, Math.min(1000, Math.round((Number(e.target.value) || 2) / 2) * 2)); update((s) => ({ ...s, clockPeriod: v, stepTime: v })); }} />
                  </label>
                ) : (
                  <label className="flex flex-col gap-1 text-[0.7188rem] font-semibold">{t.stepTime}
                    <input data-testid="stim-steptime" type="number" min={1} max={1000} className={`${input} w-24`} style={inputStyle} value={spec.stepTime} onChange={(e) => { const v = Math.max(1, Math.min(1000, Math.round(Number(e.target.value) || 1))); update((s) => ({ ...s, stepTime: v })); }} />
                  </label>
                )}
                <span className="flex-1" />
                <button type="button" data-testid="stim-all" className={btn} style={btnStyle} disabled={!canExhaust} title={canExhaust ? undefined : t.allOff} onClick={() => update((s) => { const all = exhaustive(data); return all ? { ...s, steps: all.steps, values: all.values } : s; })}><ListOrdered size={13} /> {t.all}</button>
                <button type="button" data-testid="stim-clear" className={btn} style={btnStyle} onClick={() => update((s) => ({ ...s, values: Object.fromEntries(data.map((p) => [p.name, Array(s.steps).fill(0)])) }))}><Eraser size={13} /> {t.clear}</button>
              </div>

              <div className="overflow-x-auto border rounded-[0.375rem] p-2 select-none" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-app)' }}>
                <table className="border-separate" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th className={nameCol} style={{ backgroundColor: 'var(--bg-app)' }} />
                      {Array.from({ length: spec.steps }, (_, i) => (
                        <th key={i} className="text-[0.5938rem] font-normal text-center" style={{ width: CELL, minWidth: CELL, color: 'var(--text-muted)' }}>{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {spec.clock && (
                      <tr>
                        <td className={nameCol} style={{ backgroundColor: 'var(--bg-app)' }} title={t.clockRow}>{spec.clock} <span style={{ color: 'var(--text-muted)' }}>⏱</span></td>
                        {Array.from({ length: spec.steps }, (_, i) => (
                          <td key={i} style={{ height: 26, padding: 0 }}>
                            <svg width={CELL} height={24} viewBox="0 0 26 24" aria-hidden><path d="M0,20 L13,20 L13,4 L26,4 L26,20" fill="none" stroke="#0ea5e9" strokeWidth={1.5} /></svg>
                          </td>
                        ))}
                      </tr>
                    )}
                    {data.map((p) => {
                      const row = spec.values[p.name] ?? [];
                      return (
                        <tr key={p.name} data-testid={`stim-row-${p.name}`}>
                          <td className={nameCol} style={{ backgroundColor: 'var(--bg-app)' }}>{p.name}{p.width > 1 ? <span style={{ color: 'var(--text-muted)' }}>[{p.width - 1}:0]</span> : null}</td>
                          {Array.from({ length: spec.steps }, (_, i) => {
                            const v = row[i] ?? 0;
                            if (p.width === 1) {
                              const prev = i > 0 ? row[i - 1] ?? 0 : v;
                              return (
                                <td key={i} style={{ height: 30, padding: 0 }}>
                                  <button
                                    type="button"
                                    data-testid={`stim-cell-${p.name}-${i}`}
                                    aria-label={`${p.name} ${t.step} ${i} = ${v}`}
                                    aria-pressed={v === 1}
                                    onPointerDown={(e) => { e.preventDefault(); const nv = v ? 0 : 1; paint.current = { name: p.name, value: nv }; update((s) => setValue(s, p.name, i, nv)); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); update((s) => setValue(s, p.name, i, v ? 0 : 1)); } }}
                                    onPointerEnter={() => { const pt = paint.current; if (pt && pt.name === p.name) update((s) => setValue(s, p.name, i, pt.value)); }}
                                    className="block hover:bg-[var(--bg-hover)]"
                                    style={{ width: CELL, height: 30, padding: 0, background: 'transparent', cursor: 'pointer', touchAction: 'none' }}
                                  >
                                    <svg width={CELL} height={30} viewBox="0 0 26 30" aria-hidden>
                                      {v === 1 && <rect x={0} y={5} width={26} height={20} fill="rgba(16,185,129,0.14)" />}
                                      {prev !== v && <line x1={0.75} y1={5} x2={0.75} y2={25} stroke="#10b981" strokeWidth={1.5} />}
                                      <line x1={0} y1={v ? 5 : 25} x2={26} y2={v ? 5 : 25} stroke="#10b981" strokeWidth={1.8} />
                                    </svg>
                                  </button>
                                </td>
                              );
                            }
                            const digits = Math.ceil(p.width / 4);
                            return (
                              <td key={i} style={{ padding: '2px 1px' }}>
                                <input
                                  data-testid={`stim-cell-${p.name}-${i}`}
                                  aria-label={`${p.name} ${t.step} ${i}`}
                                  className="font-mono text-[0.6875rem] text-center rounded-[0.1875rem] border"
                                  style={{ width: CELL - 2, height: 24, borderColor: i > 0 && row[i - 1] !== v ? '#10b981' : 'var(--border-subtle)', backgroundColor: v ? 'rgba(16,185,129,0.10)' : 'transparent', color: 'var(--text-primary)', fontSize: digits > 2 ? 9 : 11 }}
                                  value={v.toString(16).toUpperCase()}
                                  maxLength={digits}
                                  onChange={(e) => { const txt = e.target.value.replace(/[^0-9a-fA-F]/g, ''); update((s) => setValue(s, p.name, i, txt ? parseInt(txt, 16) & mask(p.width) : 0)); }}
                                  onFocus={(e) => e.target.select()}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {spec.outputs.length > 0 && (
                  <p className="text-[0.7188rem] mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>{t.outputs}: {spec.outputs.map((p) => `${p.name}${p.width > 1 ? `[${p.width - 1}:0]` : ''}`).join(', ')}</p>
                )}
              </div>

              <details>
                <summary className="text-[0.75rem] font-semibold cursor-pointer">{t.preview}</summary>
                <pre data-testid="stim-code" className="mt-2 p-3 rounded-[0.375rem] border text-[0.7188rem] font-mono overflow-auto max-h-[16.25rem]" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-app)' }}>{code}</pre>
              </details>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <button type="button" onClick={onClose} className={btn} style={btnStyle}>{t.cancel}</button>
          <button type="button" data-testid="stim-create" disabled={!spec} onClick={() => finish(false)} className={btn} style={btnStyle}>{t.create}</button>
          <button type="button" data-testid="stim-run" disabled={!spec} onClick={() => finish(true)} className={`${btn} text-white`} style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}><Play size={13} /> {t.run}</button>
        </div>
      </div>
    </div>
  );
}
