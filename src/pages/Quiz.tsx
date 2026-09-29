import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { fmt } from '../i18n/dictionary';
import { checkAnswer, makeQuiz, TOPICS, type Question, type Topic } from '../quiz/quiz';

const BEST_KEY = 'logiclab_quiz_v1';
const COUNTS = [5, 10, 20];

const TEXT = {
  en: {
    eyebrow: 'Explore',
    title: 'Quiz',
    lead: 'Short quizzes with new questions every time: number systems, Boolean algebra and Karnaugh maps. Each answer is checked at once and explained.',
    topics: 'Topics',
    topicNames: { numbers: 'Number systems', boolean: 'Boolean algebra', kmap: 'Karnaugh maps' } as Record<Topic, string>,
    count: 'Questions',
    start: 'Start quiz',
    question: 'Question {n} of {total}',
    answerLabel: 'Your answer',
    check: 'Check',
    next: 'Next question',
    finish: 'See the score',
    correct: 'Correct!',
    wrong: 'Not quite — the answer is {answer}.',
    score: 'You scored {score} of {total}.',
    best: 'Best for this set: {best} of {total}.',
    newBest: 'New best score!',
    again: 'New quiz',
    review: 'Review',
    yours: 'your answer: {answer}',
    empty: '—',
    pickOne: 'Pick at least one topic.',
    hintBin: 'binary, e.g. 1011',
    hintDec: 'a decimal number',
    hintHex: 'hex, e.g. 3F',
  },
  tr: {
    eyebrow: 'Keşfet',
    title: 'Quiz',
    lead: 'Her seferinde yeni sorularla kısa quizler: sayı sistemleri, Boole cebri ve Karnaugh haritaları. Her cevap hemen kontrol edilir ve açıklanır.',
    topics: 'Konular',
    topicNames: { numbers: 'Sayı sistemleri', boolean: 'Boole cebri', kmap: 'Karnaugh haritaları' } as Record<Topic, string>,
    count: 'Soru sayısı',
    start: 'Quize başla',
    question: 'Soru {n} / {total}',
    answerLabel: 'Cevabın',
    check: 'Kontrol et',
    next: 'Sonraki soru',
    finish: 'Puanı gör',
    correct: 'Doğru!',
    wrong: 'Olmadı — doğru cevap {answer}.',
    score: '{total} sorudan {score} doğru.',
    best: 'Bu set için en iyi: {best} / {total}.',
    newBest: 'Yeni rekor!',
    again: 'Yeni quiz',
    review: 'Gözden geçir',
    yours: 'senin cevabın: {answer}',
    empty: '—',
    pickOne: 'En az bir konu seç.',
    hintBin: 'ikilik, örn. 1011',
    hintDec: 'onluk bir sayı',
    hintHex: 'onaltılık, örn. 3F',
  },
};

type Best = Record<string, number>;
function loadBest(): Best {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}
function saveBest(b: Best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(b));
  } catch {
    /* storage may be blocked */
  }
}

interface Answered { given: string; ok: boolean }

export default function Quiz() {
  const { lang } = useI18n();
  const t = TEXT[lang];
  const [topics, setTopics] = useState<Topic[]>([...TOPICS]);
  const [count, setCount] = useState(10);
  const [quiz, setQuiz] = useState<Question[] | null>(null);
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [typed, setTyped] = useState('');
  const [best, setBest] = useState<Best>(loadBest);
  const [newBest, setNewBest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const setKey = `${[...topics].sort().join('+')}:${count}`;
  const q = quiz?.[at];
  const current = answers[at];
  const score = answers.filter((a) => a.ok).length;
  const finished = quiz !== null && at >= quiz.length;

  useEffect(() => {
    if (q?.kind === 'input' && !current) inputRef.current?.focus();
  }, [q, current]);

  const start = () => {
    if (!topics.length) return;
    setQuiz(makeQuiz(topics, count, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0));
    setAt(0);
    setAnswers([]);
    setTyped('');
    setNewBest(false);
  };
  const answer = (given: string) => {
    if (!q || current) return;
    setAnswers((a) => [...a, { given, ok: checkAnswer(q, given) }]);
  };
  const next = () => {
    if (!quiz) return;
    setTyped('');
    if (at + 1 >= quiz.length) {
      const prev = best[setKey] ?? -1;
      if (score > prev) {
        const b = { ...best, [setKey]: score };
        setBest(b);
        saveBest(b);
        setNewBest(true);
      }
    }
    setAt(at + 1);
  };
  const toggle = (topic: Topic) => setTopics((l) => (l.includes(topic) ? l.filter((x) => x !== topic) : [...l, topic]));

  const card = 'rounded-[0.5rem] border p-4 sm:p-5';
  const cardStyle = { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)' };
  const btn = 'min-h-10 px-4 rounded-[0.375rem] border text-[0.875rem] font-medium flex items-center justify-center gap-1.5';
  const primary = { backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: '#fff' };
  const placeholder = q?.format === 'bin' ? t.hintBin : q?.format === 'hex' ? t.hintHex : t.hintDec;
  const reviewList = useMemo(() => (quiz ?? []).map((x, i) => ({ q: x, a: answers[i] })), [quiz, answers]);

  return (
    <div data-testid="quiz-page" className="absolute inset-0 overflow-y-auto" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-5">
        <header>
          <p className="text-[0.75rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.eyebrow}</p>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><CircleHelp size={22} style={{ color: 'var(--accent-primary)' }} /> {t.title}</h1>
          <p className="text-[0.9375rem] mt-1.5" style={{ color: 'var(--text-secondary)' }}>{t.lead}</p>
        </header>

        {!quiz && (
          <section className={`${card} flex flex-col gap-4`} style={cardStyle}>
            <div>
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{t.topics}</h2>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <button key={topic} type="button" data-testid={`quiz-topic-${topic}`} aria-pressed={topics.includes(topic)} onClick={() => toggle(topic)} className={btn}
                    style={{ borderColor: topics.includes(topic) ? 'var(--accent-primary)' : 'var(--border-subtle)', backgroundColor: topics.includes(topic) ? 'var(--accent-subtle)' : 'transparent' }}>
                    {t.topicNames[topic]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{t.count}</h2>
              <div className="flex gap-2">
                {COUNTS.map((n) => (
                  <button key={n} type="button" data-testid={`quiz-count-${n}`} aria-pressed={count === n} onClick={() => setCount(n)} className={`${btn} min-w-12`}
                    style={{ borderColor: count === n ? 'var(--accent-primary)' : 'var(--border-subtle)', backgroundColor: count === n ? 'var(--accent-subtle)' : 'transparent' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {!topics.length && <p className="text-[0.8125rem]" style={{ color: '#d97706' }}>{t.pickOne}</p>}
            {best[setKey] !== undefined && <p className="text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>{fmt(t.best, { best: best[setKey], total: count })}</p>}
            <div>
              <button type="button" data-testid="quiz-start" disabled={!topics.length} onClick={start} className={`${btn} disabled:opacity-50`} style={primary}>{t.start}</button>
            </div>
          </section>
        )}

        {quiz && q && (
          <section data-testid="quiz-question" className={`${card} flex flex-col gap-3`} style={cardStyle}>
            <div className="flex items-center justify-between gap-3 text-[0.75rem]" style={{ color: 'var(--text-muted)' }}>
              <span className="font-semibold uppercase tracking-wider">{fmt(t.question, { n: at + 1, total: quiz.length })} · {t.topicNames[q.topic]}</span>
              <span data-testid="quiz-running-score">{score} ✓</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
              <div className="h-full" style={{ width: `${((at + (current ? 1 : 0)) / quiz.length) * 100}%`, backgroundColor: 'var(--accent-primary)', transition: 'width 200ms' }} />
            </div>
            <p className="text-[1rem] font-medium">{q.text[lang]}</p>
            {q.detail && <p data-testid="quiz-detail" className="font-mono text-[1.25rem] px-3 py-2 rounded-[0.375rem] break-all" style={{ backgroundColor: 'var(--bg-app)' }}>{q.detail}</p>}
            {q.kind === 'choice' ? (
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options!.map((o, i) => {
                  const picked = current?.given === o;
                  const right = current && o === q.answer;
                  return (
                    <button key={o} type="button" data-testid={`quiz-option-${i}`} disabled={!!current} onClick={() => answer(o)} className={`${btn} font-mono justify-start text-left min-h-12`}
                      style={{ borderColor: right ? '#16a34a' : picked ? '#ef4444' : 'var(--border-subtle)', backgroundColor: right ? 'rgba(22,163,74,0.12)' : picked ? 'rgba(239,68,68,0.1)' : 'var(--bg-app)' }}>
                      {o}
                    </button>
                  );
                })}
              </div>
            ) : (
              <form className="flex gap-2 flex-wrap" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) answer(typed); }}>
                <input ref={inputRef} data-testid="quiz-input" aria-label={t.answerLabel} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!current} placeholder={placeholder}
                  inputMode={q.format === 'dec' ? 'numeric' : 'text'} autoComplete="off" spellCheck={false}
                  className="h-11 px-3 rounded-[0.375rem] border font-mono text-[1rem] flex-1 min-w-[10rem]" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }} />
                {!current && <button type="submit" data-testid="quiz-check" disabled={!typed.trim()} className={`${btn} disabled:opacity-50`} style={primary}>{t.check}</button>}
              </form>
            )}
            {current && (
              <div data-testid="quiz-feedback" data-ok={current.ok} className="flex flex-col gap-1.5 p-3 rounded-[0.375rem]" style={{ backgroundColor: current.ok ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.08)' }}>
                <span className="flex items-center gap-1.5 font-semibold text-[0.875rem]" style={{ color: current.ok ? '#16a34a' : '#ef4444' }}>
                  {current.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {current.ok ? t.correct : fmt(t.wrong, { answer: q.answer })}
                </span>
                <span className="text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>{q.explain[lang]}</span>
                <div className="mt-1">
                  <button type="button" data-testid="quiz-next" onClick={next} className={btn} style={primary}>{at + 1 >= quiz.length ? t.finish : t.next}</button>
                </div>
              </div>
            )}
          </section>
        )}

        {finished && quiz && (
          <section data-testid="quiz-result" className={`${card} flex flex-col gap-3`} style={cardStyle}>
            <p className="text-xl font-bold flex items-center gap-2"><Trophy size={20} style={{ color: '#d97706' }} /> <span data-testid="quiz-score">{fmt(t.score, { score, total: quiz.length })}</span></p>
            {newBest ? <p className="text-[0.875rem] font-semibold" style={{ color: '#16a34a' }}>{t.newBest}</p> : best[setKey] !== undefined && <p className="text-[0.8125rem]" style={{ color: 'var(--text-secondary)' }}>{fmt(t.best, { best: best[setKey], total: quiz.length })}</p>}
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider mt-2" style={{ color: 'var(--text-muted)' }}>{t.review}</h2>
            <ol className="flex flex-col gap-2 text-[0.8125rem]">
              {reviewList.map(({ q: x, a }, i) => (
                <li key={i} className="flex gap-2 items-start">
                  {a?.ok ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: '#16a34a' }} /> : <XCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />}
                  <span>
                    {x.text[lang]} {x.detail && <span className="font-mono">{x.detail}</span>} → <span className="font-mono font-semibold">{x.answer}</span>
                    {a && !a.ok && <span style={{ color: 'var(--text-muted)' }}> ({fmt(t.yours, { answer: a.given || t.empty })})</span>}
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex gap-2 flex-wrap">
              <button type="button" data-testid="quiz-again" onClick={start} className={btn} style={primary}><RotateCcw size={15} /> {t.again}</button>
              <button type="button" onClick={() => setQuiz(null)} className={btn} style={{ borderColor: 'var(--border-subtle)' }}>{t.topics}</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
