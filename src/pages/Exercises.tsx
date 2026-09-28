import { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import '../lib/monacoSetup';
import { CheckCircle2, Circle, Lightbulb, Play, RotateCcw } from 'lucide-react';
import { EXERCISES, getExercise, type Exercise } from '../exercises/exercises';
import { expectedTable, gradeSubmission, type GradeResult, type Port, type TruthRow } from '../exercises/grader';
import { OpenInSchematicButton } from '../components/Share/OpenInToolButton';
import { useI18n } from '../i18n/I18nProvider';
import { fmt } from '../i18n/dictionary';

const STORAGE_KEY = 'logiclab_exercises_v1';
const MAX_ROWS_SHOWN = 128;

interface Progress {
  active: string;
  code: Record<string, string>;
  solved: Record<string, boolean>;
}

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (p && typeof p === 'object') {
        return {
          active: getExercise(p.active) ? p.active : EXERCISES[0].id,
          code: p.code ?? {},
          solved: p.solved ?? {},
        };
      }
    }
  } catch {
    /* start fresh */
  }
  return { active: EXERCISES[0].id, code: {}, solved: {} };
}

function bits(value: number, width: number): string {
  if (Number.isNaN(value)) return '–';
  return width === 1 ? String(value) : value.toString(2).padStart(width, '0');
}

function TruthTable({
  inputs,
  outputs,
  rows,
  graded,
  onlyMismatches,
}: {
  inputs: Port[];
  outputs: Port[];
  rows: TruthRow[];
  graded: boolean;
  onlyMismatches: boolean;
}) {
  const { d } = useI18n();
  const t = d.exercises;
  const visible = (graded && onlyMismatches ? rows.filter((r) => !r.ok) : rows).slice(0, MAX_ROWS_SHOWN);
  const total = graded && onlyMismatches ? rows.filter((r) => !r.ok).length : rows.length;
  const th = 'px-2 py-1 text-left font-semibold whitespace-nowrap';
  const sequential = rows.some((r) => r.cycle !== undefined);
  return (
    <div className="flex flex-col gap-1 min-h-0">
      <div className="overflow-auto border rounded-[4px]" style={{ borderColor: 'var(--border-subtle)' }}>
        <table data-testid="exercise-truth-table" className="w-full text-[12px] font-mono border-collapse">
          <thead style={{ backgroundColor: 'var(--bg-panel-header, var(--bg-surface))', color: 'var(--text-secondary)' }}>
            <tr>
              {sequential && <th className={th} style={{ color: 'var(--text-muted)' }}>{t.cycle}</th>}
              {inputs.map((p) => (
                <th key={p.name} className={th}>{p.name}{p.width > 1 ? `[${p.width - 1}:0]` : ''}</th>
              ))}
              {outputs.map((p) => (
                <th key={p.name} className={th} style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                  {p.name}{p.width > 1 ? `[${p.width - 1}:0]` : ''}
                  {graded && <span className="font-normal" style={{ color: 'var(--text-muted)' }}> ({t.expected} / {t.got})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr
                key={i}
                data-ok={graded ? String(r.ok) : undefined}
                style={{
                  backgroundColor: graded && !r.ok ? 'rgba(239, 68, 68, 0.12)' : undefined,
                  borderTop: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {sequential && <td className="px-2 py-0.5" style={{ color: 'var(--text-muted)' }}>{r.cycle}</td>}
                {inputs.map((p) => (
                  <td key={p.name} className="px-2 py-0.5">{bits(r.inputs[p.name], p.width)}</td>
                ))}
                {outputs.map((p) => {
                  const exp = r.expected[p.name];
                  const got = r.actual?.[p.name];
                  const bad = graded && got !== exp;
                  return (
                    <td key={p.name} className="px-2 py-0.5" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                      {bits(exp, p.width)}
                      {graded && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}> / </span>
                          <span style={{ color: bad ? '#ef4444' : '#22c55e', fontWeight: bad ? 700 : 400 }}>
                            {bits(got ?? Number.NaN, p.width)}
                          </span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > visible.length && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {fmt(t.rowsShown, { shown: visible.length, total })}
        </p>
      )}
    </div>
  );
}

function ResultBanner({ result }: { result: GradeResult }) {
  const { d } = useI18n();
  const t = d.exercises;
  const box = (tone: 'ok' | 'warn' | 'err', children: React.ReactNode) => (
    <div
      data-testid="exercise-result"
      data-kind={result.kind}
      className="rounded-[4px] border px-3 py-2 text-[13px] leading-relaxed"
      style={{
        borderColor: tone === 'ok' ? 'rgba(34,197,94,0.4)' : tone === 'warn' ? 'rgba(234,179,8,0.4)' : 'rgba(239,68,68,0.4)',
        backgroundColor: tone === 'ok' ? 'rgba(34,197,94,0.08)' : tone === 'warn' ? 'rgba(234,179,8,0.08)' : 'rgba(239,68,68,0.08)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </div>
  );
  if (result.kind === 'compile-error') return box('err', <><b>{t.compileError}</b> <code className="font-mono">{result.message}</code></>);
  if (result.kind === 'unsupported')
    return box('err', <><b>{t.unsupported}</b> <code className="font-mono">{result.message}</code><br />{t.unsupportedHelp}</>);
  if (result.kind === 'port-mismatch')
    return box('err', <>{t.portMismatch}{result.missing.length > 0 && <><br />{fmt(t.missingPorts, { ports: result.missing.join(', ') })}</>}</>);
  const all = result.passed === result.total;
  const cycles = result.rows.some((r) => r.cycle !== undefined);
  return box(
    all ? 'ok' : 'warn',
    <>
      <b>
        {all
          ? fmt(cycles ? t.passedAllCycles : t.passedAll, { total: result.total })
          : fmt(cycles ? t.passedSomeCycles : t.passedSome, { passed: result.passed, total: result.total })}
      </b>
      {result.undriven.length > 0 && <><br />{fmt(t.undriven, { ports: result.undriven.join(', ') })}</>}
    </>
  );
}

export default function Exercises({ isDarkMode = true }: { isDarkMode?: boolean }) {
  const { d, lang } = useI18n();
  const t = d.exercises;
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [onlyMismatches, setOnlyMismatches] = useState(false);

  const exercise: Exercise = getExercise(progress.active) ?? EXERCISES[0];
  const code = progress.code[exercise.id] ?? exercise.starter;
  const goal = useMemo(() => expectedTable(exercise.reference, exercise.sequential), [exercise]);
  const solvedCount = EXERCISES.filter((e) => progress.solved[e.id]).length;

  // Persist progress (debounced) — code per exercise, solved flags, current exercise.
  const saveTimer = useRef<number | null>(null);
  const latest = useRef(progress);
  latest.current = progress;
  const flush = useRef(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current));
    } catch {
      /* storage unavailable */
    }
  });
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flush.current, 300);
  }, [progress]);
  useEffect(() => {
    const doFlush = flush.current;
    window.addEventListener('pagehide', doFlush);
    window.addEventListener('beforeunload', doFlush);
    return () => {
      window.removeEventListener('pagehide', doFlush);
      window.removeEventListener('beforeunload', doFlush);
      doFlush();
    };
  }, []);

  const select = (id: string) => {
    setProgress((p) => ({ ...p, active: id }));
    setResult(null);
    setShowHint(false);
    setOnlyMismatches(false);
  };

  const check = () => {
    const r = gradeSubmission(exercise.reference, code, exercise.sequential);
    setResult(r);
    setOnlyMismatches(r.kind === 'graded' && r.passed < r.total && r.total > 16);
    if (r.kind === 'graded' && r.passed === r.total) {
      setProgress((p) => ({ ...p, solved: { ...p.solved, [exercise.id]: true } }));
    }
  };

  const reset = () => {
    if (!window.confirm(t.resetConfirm)) return;
    setProgress((p) => {
      const next = { ...p.code };
      delete next[exercise.id];
      return { ...p, code: next };
    });
    setResult(null);
  };

  const graded = result?.kind === 'graded';
  const levelLabel = (e: Exercise) => (e.level === 'beginner' ? t.beginner : t.intermediate);
  const btn = 'flex items-center gap-1.5 px-3 h-8 rounded-[4px] text-xs font-semibold border transition-colors';

  return (
    <div
      data-testid="exercises-page"
      className="absolute inset-0 flex flex-col md:flex-row overflow-hidden"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      {/* Exercise list */}
      <aside
        className="md:w-[260px] shrink-0 border-b md:border-b-0 md:border-r flex flex-col min-h-0"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.eyebrow}</p>
          <h1 className="text-[15px] font-bold mt-0.5">{t.title}</h1>
          <p data-testid="exercise-progress" className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            {fmt(t.progress, { done: solvedCount, total: EXERCISES.length })}
          </p>
        </div>
        {/* Mobile: compact picker */}
        <div className="md:hidden p-3">
          <select
            className="w-full h-9 px-2 rounded-[4px] border text-sm"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' }}
            value={exercise.id}
            onChange={(e) => select(e.target.value)}
            aria-label={t.pageTitle}
          >
            {EXERCISES.map((e, i) => (
              <option key={e.id} value={e.id}>
                {progress.solved[e.id] ? '✓ ' : ''}{String(i + 1).padStart(2, '0')} · {e.title[lang]}
              </option>
            ))}
          </select>
        </div>
        <ol className="hidden md:block flex-1 overflow-y-auto py-1">
          {EXERCISES.map((e, i) => {
            const active = e.id === exercise.id;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  data-testid={`exercise-item-${e.id}`}
                  onClick={() => select(e.id)}
                  className="w-full text-left px-4 py-2 flex items-start gap-2.5 transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ backgroundColor: active ? 'var(--accent-subtle)' : undefined }}
                  aria-current={active ? 'true' : undefined}
                >
                  {progress.solved[e.id] ? (
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" aria-label={t.solved} />
                  ) : (
                    <Circle size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {String(i + 1).padStart(2, '0')} · {e.title[lang]}
                    </span>
                    <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{levelLabel(e)}{e.sequential ? ` · ${t.sequential}` : ''}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      {/* Task + editor + results */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row">
        <section className="flex-1 min-w-0 min-h-[320px] flex flex-col border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="px-4 py-3 border-b flex flex-col gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 data-testid="exercise-title" className="text-base font-bold">{exercise.title[lang]}</h2>
              <span className="text-[11px] px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {levelLabel(exercise)}
              </span>
              {exercise.sequential && (
                <span data-testid="exercise-sequential" className="text-[11px] px-1.5 py-0.5 rounded border" style={{ borderColor: 'rgba(96,165,250,0.45)', color: '#60a5fa' }}>
                  {t.sequential}
                </span>
              )}
              {progress.solved[exercise.id] && (
                <span className="text-[11px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-500">{t.solved}</span>
              )}
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <b style={{ color: 'var(--text-primary)' }}>{t.task}:</b> {exercise.prompt[lang]}
            </p>
            {showHint ? (
              <p className="text-[12.5px] flex gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Lightbulb size={14} className="shrink-0 mt-0.5 text-amber-500" />
                <span><b>{t.hint}:</b> {exercise.hint[lang]}</span>
              </p>
            ) : (
              <button type="button" onClick={() => setShowHint(true)} className="self-start text-[12px] underline" style={{ color: 'var(--text-secondary)' }}>
                {t.showHint}
              </button>
            )}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                data-testid="exercise-check"
                onClick={check}
                className={`${btn} text-white border-transparent`}
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Play size={13} /> {t.check}
              </button>
              <button
                type="button"
                data-testid="exercise-reset"
                onClick={reset}
                className={btn}
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              >
                <RotateCcw size={13} /> {t.reset}
              </button>
              <OpenInSchematicButton
                className={`flex ${btn}`}
                labelClassName="inline"
                label={t.openSchematic}
                getFiles={() => [{ name: `${exercise.id}.sv`, content: code }]}
              />
            </div>
          </div>
          <div className="flex-1 min-h-[240px] relative" data-testid="exercise-editor">
            <Editor
              height="100%"
              language="systemverilog"
              theme={isDarkMode ? 'vs-dark' : 'vs-light'}
              value={code}
              path={`exercise/${exercise.id}.sv`}
              onChange={(value) => {
                if (value === undefined) return;
                setProgress((p) => ({ ...p, code: { ...p.code, [exercise.id]: value } }));
              }}
              options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, tabSize: 4 }}
            />
          </div>
        </section>

        <section className="lg:w-[42%] min-w-0 min-h-0 flex flex-col gap-3 p-4 overflow-y-auto">
          {result ? <ResultBanner result={result} /> : (
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{t.notChecked}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {graded ? t.resultTable : exercise.sequential ? t.goalCycles : t.goalTable}
            </h3>
            {graded && (
              <label className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={onlyMismatches} onChange={(e) => setOnlyMismatches(e.target.checked)} />
                {t.onlyMismatches}
              </label>
            )}
          </div>
          {exercise.sequential && (
            <p className="text-[11.5px] -mt-1" style={{ color: 'var(--text-muted)' }}>
              {fmt(t.sequentialNote, { clock: exercise.sequential.clock })}
            </p>
          )}
          {result?.kind === 'graded' ? (
            <TruthTable inputs={result.inputs} outputs={result.outputs} rows={result.rows} graded onlyMismatches={onlyMismatches} />
          ) : (
            <TruthTable inputs={goal.inputs} outputs={goal.outputs} rows={goal.rows} graded={false} onlyMismatches={false} />
          )}
        </section>
      </main>
    </div>
  );
}
