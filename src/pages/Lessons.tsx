import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Binary, BookOpenCheck, CheckCircle2, ChevronRight, Circle, Cpu, GraduationCap, Rocket, Shapes, Workflow } from 'lucide-react';
import { LESSONS, type Lesson, type LessonAction } from '../lessons/lessons';
import { PRESETS } from '../gates/circuit';
import { FSM_PRESETS } from '../fsm/fsm';
import { getExampleById } from '../examples/registry';
import { setPendingHandoff } from '../services/exampleHandoff';
import { useI18n } from '../i18n/I18nProvider';
import { fmt } from '../i18n/dictionary';

const PROGRESS_KEY = 'logiclab_lessons_v1';
const GATES_KEY = 'logiclab_gates_v1';
const EXERCISES_KEY = 'logiclab_exercises_v1';

interface LessonProgress {
  active: string;
  /** Lesson id → quiz passed (all answers correct). */
  done: Record<string, boolean>;
}

function loadProgress(): LessonProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as LessonProgress;
      return { active: LESSONS.some((l) => l.id === p.active) ? p.active : LESSONS[0].id, done: p.done ?? {} };
    }
  } catch {
    /* fresh start */
  }
  return { active: LESSONS[0].id, done: {} };
}

export default function Lessons() {
  const { d, lang } = useI18n();
  const t = d.lessons;
  const navigate = useNavigate();
  const [progress, setProgress] = useState<LessonProgress>(loadProgress);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      /* storage unavailable */
    }
  }, [progress]);

  const lesson: Lesson = LESSONS.find((l) => l.id === progress.active) ?? LESSONS[0];
  const index = LESSONS.indexOf(lesson);
  const doneCount = LESSONS.filter((l) => progress.done[l.id]).length;

  const open = (id: string) => {
    setProgress((p) => ({ ...p, active: id }));
    setAnswers({});
    setChecked(false);
    document.getElementById('lesson-main')?.scrollTo({ top: 0 });
  };

  const run = (a: LessonAction) => {
    if (a.kind === 'gates') {
      const preset = PRESETS[a.preset];
      try {
        localStorage.setItem(GATES_KEY, JSON.stringify({ circuit: preset.circuit, inputs: a.preset === 'hazard' ? { a: 1, b: 1, c: 1 } : {}, name: a.preset, timing: a.preset === 'hazard' }));
      } catch {
        /* the editor opens with its last design */
      }
      navigate('/gates');
    } else if (a.kind === 'gateExercise') {
      navigate(`/gates?exercise=${encodeURIComponent(a.id)}`);
    } else if (a.kind === 'fsm') {
      try {
        const preset = FSM_PRESETS[a.preset];
        if (preset) localStorage.setItem('logiclab_fsm_v1', JSON.stringify(preset.design));
      } catch {
        /* the designer opens with its last machine */
      }
      navigate('/fsm');
    } else if (a.kind === 'numbers') {
      navigate('/numbers');
    } else if (a.kind === 'kmap') {
      navigate(`/kmap?expr=${encodeURIComponent(a.expr)}`);
    } else if (a.kind === 'example') {
      const ex = getExampleById(a.id);
      if (ex?.de2?.supported) {
        setPendingHandoff(a.id, 'de2');
        navigate('/de2-simulator');
      } else navigate('/examples');
    } else {
      try {
        const raw = localStorage.getItem(EXERCISES_KEY);
        const p = raw ? JSON.parse(raw) : { code: {}, solved: {}, stats: {} };
        localStorage.setItem(EXERCISES_KEY, JSON.stringify({ ...p, active: a.id }));
      } catch {
        /* opens on the last exercise */
      }
      navigate('/exercises');
    }
  };

  const score = lesson.quiz.filter((q, i) => answers[i] === q.answer).length;
  const allAnswered = lesson.quiz.every((_, i) => answers[i] !== undefined);
  const check = () => {
    setChecked(true);
    if (score === lesson.quiz.length) setProgress((p) => ({ ...p, done: { ...p.done, [lesson.id]: true } }));
  };

  const actionIcon = (a: LessonAction) =>
    a.kind === 'gates' || a.kind === 'kmap' ? <Shapes size={14} />
    : a.kind === 'example' ? <Cpu size={14} />
    : a.kind === 'fsm' ? <Workflow size={14} />
    : a.kind === 'numbers' ? <Binary size={14} />
    : <GraduationCap size={14} />;
  // After a passed quiz: the lesson's first task, in Verilog and with gates.
  const nextTask = lesson.actions.find((a): a is Extract<LessonAction, { kind: 'exercise' }> => a.kind === 'exercise')
    ?? lesson.actions.find((a) => a.kind !== 'example');

  return (
    <div data-testid="lessons-page" className="absolute inset-0 flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <aside className="md:w-[16.875rem] shrink-0 border-b md:border-b-0 md:border-r flex flex-col min-h-0" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.eyebrow}</p>
          <h1 className="text-[0.9375rem] font-bold mt-0.5">{t.title}</h1>
          <p data-testid="lessons-progress" className="text-[0.75rem] mt-1" style={{ color: 'var(--text-secondary)' }}>{fmt(t.progress, { done: doneCount, total: LESSONS.length })}</p>
          <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-panel)' }}>
            <div className="h-full rounded-full" style={{ width: `${(doneCount / LESSONS.length) * 100}%`, backgroundColor: 'var(--accent-primary)' }} />
          </div>
        </div>
        <ol className="flex md:flex-col overflow-x-auto md:overflow-y-auto md:flex-1 py-1">
          {LESSONS.map((l, i) => {
            const active = l.id === lesson.id;
            return (
              <li key={l.id} className="shrink-0">
                <button type="button" data-testid={`lesson-item-${l.id}`} onClick={() => open(l.id)} className="w-full text-left px-4 py-2 flex items-start gap-2.5 hover:bg-[var(--bg-hover)]" style={{ backgroundColor: active ? 'var(--accent-subtle)' : undefined }} aria-current={active ? 'true' : undefined}>
                  {progress.done[l.id] ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" /> : <Circle size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] font-medium whitespace-nowrap md:whitespace-normal" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{i + 1}. {l.title[lang]}</span>
                    <span className="hidden md:block text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{l.summary[lang]}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <main id="lesson-main" className="flex-1 min-w-0 overflow-y-auto">
        <article className="max-w-3xl mx-auto px-5 sm:px-8 py-8 flex flex-col gap-6">
          <header>
            <p className="text-[0.75rem] font-semibold" style={{ color: 'var(--accent-primary)' }}>{fmt(t.lessonN, { n: index + 1, total: LESSONS.length })}</p>
            <h2 data-testid="lesson-title" className="text-2xl font-bold mt-1">{lesson.title[lang]}</h2>
            <p className="text-[0.875rem] mt-1" style={{ color: 'var(--text-secondary)' }}>{lesson.summary[lang]}</p>
          </header>

          <section className="flex flex-col gap-3 text-[0.9375rem] leading-relaxed">
            {lesson.body.map((p, i) => <p key={i}>{p[lang]}</p>)}
          </section>

          <section className="rounded-[0.375rem] border p-4" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
            <h3 className="text-[0.75rem] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{t.keyPoints}</h3>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[0.875rem]">
              {lesson.points.map((p, i) => <li key={i}>{p[lang]}</li>)}
            </ul>
          </section>

          <section>
            <h3 className="text-[0.75rem] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{t.tryIt}</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {lesson.actions.map((a, i) => (
                <button key={i} type="button" data-testid={`lesson-action-${i}`} onClick={() => run(a)} className="flex items-center gap-2 px-3 py-2.5 rounded-[0.375rem] border text-left text-[0.8438rem] font-medium hover:bg-[var(--bg-hover)]" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                  <span style={{ color: 'var(--accent-primary)' }}>{actionIcon(a)}</span>
                  <span className="flex-1">{a.label[lang]}</span>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[0.375rem] border p-4 flex flex-col gap-4" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
            <h3 className="text-[0.9375rem] font-bold flex items-center gap-2"><BookOpenCheck size={16} /> {t.quiz}</h3>
            {lesson.quiz.map((q, qi) => (
              <fieldset key={qi} data-testid={`lesson-q-${qi}`} className="flex flex-col gap-1.5">
                <legend className="text-[0.875rem] font-semibold mb-1">{qi + 1}. {q.q[lang]}</legend>
                {q.options.map((o, oi) => {
                  const picked = answers[qi] === oi;
                  const right = checked && oi === q.answer;
                  const wrong = checked && picked && oi !== q.answer;
                  return (
                    <label key={oi} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[0.25rem] border text-[0.8438rem] cursor-pointer" style={{ borderColor: right ? '#16a34a' : wrong ? '#ef4444' : picked ? 'var(--accent-primary)' : 'var(--border-subtle)', backgroundColor: right ? 'rgba(22,163,74,0.08)' : wrong ? 'rgba(239,68,68,0.08)' : undefined }}>
                      <input type="radio" name={`q${qi}`} checked={picked} onChange={() => { setAnswers((x) => ({ ...x, [qi]: oi })); setChecked(false); }} />
                      {o[lang]}
                    </label>
                  );
                })}
                {checked && <p className="text-[0.7812rem]" style={{ color: answers[qi] === q.answer ? '#16a34a' : '#d97706' }}>{answers[qi] === q.answer ? t.correct : t.notQuite} {q.why[lang]}</p>}
              </fieldset>
            ))}
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" data-testid="lesson-check" disabled={!allAnswered} onClick={check} className="h-9 px-4 rounded-[0.25rem] text-[0.8125rem] font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)' }}>{t.check}</button>
              {checked && (
                <span data-testid="lesson-score" className="text-[0.8438rem] font-semibold" style={{ color: score === lesson.quiz.length ? '#16a34a' : '#d97706' }}>
                  {score === lesson.quiz.length ? t.passed : fmt(t.score, { score, total: lesson.quiz.length })}
                </span>
              )}
              {checked && score === lesson.quiz.length && index < LESSONS.length - 1 && (
                <button type="button" onClick={() => open(LESSONS[index + 1].id)} className="h-9 px-3 rounded-[0.25rem] border text-[0.8125rem] flex items-center gap-1" style={{ borderColor: 'var(--border-subtle)' }}>
                  {t.next} <ChevronRight size={14} />
                </button>
              )}
            </div>
            {checked && score === lesson.quiz.length && nextTask && (
              <div data-testid="lesson-now-you" className="rounded-[0.375rem] border p-3 flex flex-col gap-2" style={{ borderColor: 'var(--accent-primary)', backgroundColor: 'var(--accent-subtle)' }}>
                <p className="text-[0.875rem] font-semibold flex items-center gap-2"><Rocket size={15} /> {t.nowYou}</p>
                <p className="text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>{nextTask.label[lang]}</p>
                <div className="flex gap-2 flex-wrap">
                  <button type="button" data-testid="lesson-now-go" onClick={() => run(nextTask)} className="h-8 px-3 rounded-[0.25rem] text-[0.8125rem] font-semibold text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>{nextTask.kind === 'exercise' ? t.solveVerilog : t.open}</button>
                  {nextTask.kind === 'exercise' && (
                    <button type="button" data-testid="lesson-now-gates" onClick={() => run({ kind: 'gateExercise', id: nextTask.id, label: nextTask.label })} className="h-8 px-3 rounded-[0.25rem] border text-[0.8125rem]" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>{t.solveGates}</button>
                  )}
                </div>
              </div>
            )}
          </section>
        </article>
      </main>
    </div>
  );
}
