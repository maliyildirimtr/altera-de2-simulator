import { useMemo, useState } from 'react';
import { CheckCircle2, GraduationCap, Lightbulb, Play } from 'lucide-react';
import { EXERCISES, getExercise, type Lang } from '../../exercises/exercises';
import { expectedTable, gradeSubmission, type GradeResult, type TruthRow } from '../../exercises/grader';
import { toVerilog, type Circuit, type GateNode } from '../../gates/circuit';
import { fmt } from '../../i18n/dictionary';

const PROGRESS_KEY = 'logiclab_exercises_v1';

/** Marks an exercise solved in the Exercises page's own progress record. */
function markSolved(id: string) {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const p = raw ? JSON.parse(raw) : {};
    const next = { active: p.active ?? id, code: p.code ?? {}, solved: { ...(p.solved ?? {}), [id]: true }, stats: p.stats ?? {} };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    /* storage may be blocked */
  }
}
function solvedIds(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}').solved ?? {};
  } catch {
    return {};
  }
}

export interface ExerciseText {
  exercise: string;
  exerciseLead: string;
  exercisePick: string;
  exerciseStart: string;
  exerciseStartConfirm: string;
  exerciseCheck: string;
  exerciseSolved: string;
  exercisePartial: string;
  exercisePorts: string;
  exerciseError: string;
  exerciseMismatch: string;
  exerciseGoal: string;
  exerciseClock: string;
  exerciseDone: string;
}

/** Starting circuit for an exercise: its inputs on the left, outputs on the right. */
export function exerciseCircuit(id: string): Circuit | null {
  const ex = getExercise(id);
  if (!ex) return null;
  const goal = expectedTable(ex.reference, ex.sequential);
  const nodes: GateNode[] = [];
  const clock = ex.sequential?.clock;
  const ins = clock ? [...goal.inputs, { name: clock, width: 1 }] : goal.inputs;
  ins.forEach((p, i) => nodes.push({
    id: `in_${p.name}`, type: p.name === clock ? 'CLK' : 'IN', x: 40, y: 50 + i * 90, label: p.name, delay: 1, ...(p.width > 1 && p.name !== clock ? { width: p.width } : {}),
  }));
  goal.outputs.forEach((p, i) => nodes.push({ id: `out_${p.name}`, type: 'OUT', x: 900, y: 50 + i * 90, label: p.name, delay: 1 }));
  return { nodes, wires: [] };
}

const rowText = (r: TruthRow) =>
  `${Object.entries(r.inputs).map(([k, v]) => `${k}=${v}`).join(' ')} → ${Object.entries(r.expected).map(([k, v]) => `${k}=${v}`).join(' ')}${r.actual ? ` (${Object.entries(r.actual).map(([k, v]) => `${k}=${Number.isNaN(v) ? '?' : v}`).join(' ')})` : ''}`;

/**
 * Exercise mode of the gate designer: pick one of the auto-graded tasks,
 * start from its inputs and outputs, draw the circuit and check it. The
 * circuit is graded through its generated Verilog with the same grader as the
 * Exercises page, and a solved task counts there too.
 */
export function GateExercisePanel({ flat, lang, text, active, onPick, onStart, btn, btnStyle }: {
  flat: Circuit;
  lang: Lang;
  text: ExerciseText;
  active: string;
  onPick: (id: string) => void;
  onStart: (c: Circuit, name: string) => void;
  btn: string;
  btnStyle: React.CSSProperties;
}) {
  const ex = getExercise(active) ?? EXERCISES[0];
  const [result, setResult] = useState<GradeResult | null>(null);
  const [hint, setHint] = useState(false);
  const [solved, setSolved] = useState(solvedIds);
  const goal = useMemo(() => expectedTable(ex.reference, ex.sequential), [ex]);

  const check = () => {
    const r = gradeSubmission(ex.reference, toVerilog(flat, ex.id), ex.sequential);
    setResult(r);
    if (r.kind === 'graded' && r.passed === r.total) {
      markSolved(ex.id);
      setSolved(solvedIds());
    }
  };
  const start = () => {
    const c = exerciseCircuit(ex.id);
    if (c && (flat.nodes.length === 0 || window.confirm(text.exerciseStartConfirm))) {
      onStart(c, ex.id);
      setResult(null);
    }
  };
  const wrong = result?.kind === 'graded' ? result.rows.find((r) => !r.ok) : undefined;

  return (
    <div data-testid="gate-exercise" className="flex flex-col gap-2 p-2.5 rounded-[0.375rem] border" style={{ borderColor: 'var(--accent-border, var(--border-subtle))', backgroundColor: 'var(--accent-subtle)' }}>
      <h2 className="flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}><GraduationCap size={14} /> {text.exercise}</h2>
      <p className="text-[0.6875rem]" style={{ color: 'var(--text-secondary)' }}>{text.exerciseLead}</p>
      <label className="text-[0.75rem] flex items-center gap-2">
        {text.exercisePick}
        <select data-testid="gate-exercise-pick" value={ex.id} onChange={(e) => { onPick(e.target.value); setResult(null); setHint(false); }} className="h-8 px-2 rounded-[0.25rem] border text-[0.8125rem] flex-1 min-w-0" style={btnStyle}>
          {EXERCISES.map((x) => <option key={x.id} value={x.id}>{solved[x.id] ? '✓ ' : ''}{x.title[lang]}</option>)}
        </select>
      </label>
      <p className="text-[0.8125rem]">{ex.prompt[lang]}</p>
      {ex.sequential && <p className="text-[0.6875rem]" style={{ color: 'var(--text-secondary)' }}>{fmt(text.exerciseClock, { clock: ex.sequential.clock })}</p>}
      <p className="text-[0.6875rem] font-mono" style={{ color: 'var(--text-secondary)' }}>
        {goal.inputs.map((p) => `${p.name}${p.width > 1 ? `[${p.width - 1}:0]` : ''}`).join(', ')} → {goal.outputs.map((p) => `${p.name}${p.width > 1 ? `[${p.width - 1}:0]` : ''}`).join(', ')}
      </p>
      <div className="flex gap-2 flex-wrap">
        <button type="button" className={btn} style={btnStyle} data-testid="gate-exercise-start" onClick={start}>{text.exerciseStart}</button>
        <button type="button" className={btn} style={{ ...btnStyle, backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: '#fff' }} data-testid="gate-exercise-check" onClick={check}><Play size={13} /> {text.exerciseCheck}</button>
        <button type="button" className={btn} style={btnStyle} onClick={() => setHint((h) => !h)} aria-pressed={hint}><Lightbulb size={13} /></button>
      </div>
      {hint && <p className="text-[0.7188rem]" style={{ color: '#d97706' }}>{ex.hint[lang]}</p>}
      {result && (
        <div data-testid="gate-exercise-result" className="text-[0.75rem] flex flex-col gap-1">
          {result.kind === 'graded' ? (
            result.passed === result.total ? (
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#16a34a' }}><CheckCircle2 size={14} /> {fmt(text.exerciseSolved, { total: result.total })}</span>
            ) : (
              <>
                <span style={{ color: '#d97706' }}>{fmt(text.exercisePartial, { passed: result.passed, total: result.total })}</span>
                {wrong && <span className="font-mono text-[0.6875rem]" style={{ color: 'var(--text-secondary)' }}>{fmt(text.exerciseMismatch, { row: rowText(wrong) })}</span>}
              </>
            )
          ) : result.kind === 'port-mismatch' ? (
            <span style={{ color: '#ef4444' }}>{fmt(text.exercisePorts, { ports: result.missing.join(', ') || '—' })}</span>
          ) : (
            <span style={{ color: '#ef4444' }}>{fmt(text.exerciseError, { msg: result.message })}</span>
          )}
        </div>
      )}
      {solved[ex.id] && !result && <span className="text-[0.6875rem]" style={{ color: '#16a34a' }}>✓ {text.exerciseDone}</span>}
    </div>
  );
}
