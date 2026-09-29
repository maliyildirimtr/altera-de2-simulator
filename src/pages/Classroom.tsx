import { useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, FileUp, Link2, Trash2 } from 'lucide-react';
import { EXERCISES } from '../exercises/exercises';
import { useI18n } from '../i18n/I18nProvider';
import { fmt } from '../i18n/dictionary';
import {
  assignmentUrl,
  newAssignmentId,
  parseResult,
  type Assignment,
  type StudentResult,
} from '../classroom/assignment';
import { downloadText } from '../utils/svgExport';

interface LoadedResult {
  file: string;
  result: StudentResult;
  checksumOk: boolean;
}

const field = 'h-9 px-2.5 rounded-[0.25rem] border text-[0.8125rem] w-full';
const fieldStyle = { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' };
const card = 'rounded-[0.375rem] border p-4 sm:p-5 flex flex-col gap-3';
const cardStyle = { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' };

/**
 * Teacher page: build an assignment link, then load the students' result
 * files to see the class. Everything happens in this browser.
 */
export default function Classroom() {
  const { d, lang } = useI18n();
  const c = d.classroom;

  // ── Create ──
  const [title, setTitle] = useState('');
  const [teacher, setTeacher] = useState('');
  const [due, setDue] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [createError, setCreateError] = useState('');

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = () => {
    if (!title.trim() || picked.length === 0) {
      setCreateError(c.needTitle);
      return;
    }
    setCreateError('');
    const ordered = EXERCISES.map((e) => e.id).filter((id) => picked.includes(id));
    const a: Assignment = { v: 1, id: newAssignmentId(), title: title.trim(), teacher: teacher.trim(), due, exercises: ordered };
    setLink(assignmentUrl(a));
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the link stays selectable in the field */
    }
  };

  // ── Collect ──
  const [loaded, setLoaded] = useState<LoadedResult[]>([]);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const errors: string[] = [];
    const next: LoadedResult[] = [];
    for (const f of Array.from(files)) {
      const parsed = await parseResult(await f.text());
      if (parsed) next.push({ file: f.name, ...parsed });
      else errors.push(fmt(c.invalidFile, { name: f.name }));
    }
    setLoaded((prev) => {
      // One row per student and assignment: a newer file replaces an older one.
      const map = new Map(prev.map((r) => [`${r.result.assignmentId}|${r.result.student.toLowerCase()}`, r]));
      for (const r of next) {
        const key = `${r.result.assignmentId}|${r.result.student.toLowerCase()}`;
        const old = map.get(key);
        if (!old || old.result.submittedAt < r.result.submittedAt) map.set(key, r);
      }
      return [...map.values()];
    });
    setLoadErrors(errors);
  };

  const assignments = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of loaded) m.set(r.result.assignmentId, r.result.assignmentTitle || r.result.assignmentId);
    return [...m.entries()];
  }, [loaded]);
  const currentId = assignments.some(([id]) => id === selectedAssignment) ? selectedAssignment : assignments[0]?.[0] ?? '';
  const rows = loaded
    .filter((r) => r.result.assignmentId === currentId)
    .sort((a, b) => a.result.student.localeCompare(b.result.student, lang));
  const exerciseIds = useMemo(() => {
    const ids = new Set<string>();
    rows.forEach((r) => Object.keys(r.result.results).forEach((id) => ids.add(id)));
    return EXERCISES.map((e) => e.id).filter((id) => ids.has(id));
  }, [rows]);
  const titleOf = (id: string) => EXERCISES.find((e) => e.id === id)?.title[lang] ?? id;

  const scoreOf = (r: StudentResult) => {
    const list = Object.values(r.results);
    const pct = list.length ? list.reduce((s, x) => s + (x.total ? x.bestPassed / x.total : 0), 0) / list.length : 0;
    return Math.round(pct * 100);
  };
  const solvedOf = (r: StudentResult) => Object.values(r.results).filter((x) => x.solved).length;

  const exportCsv = () => {
    const head = [c.student, ...exerciseIds.map(titleOf), c.solved, `${c.score} (%)`, c.attempts, c.submitted, c.checksum];
    const lines = rows.map((r) => [
      r.result.student,
      ...exerciseIds.map((id) => {
        const x = r.result.results[id];
        return x ? `${x.bestPassed}/${x.total}${x.solved ? ' ✓' : ''}` : '';
      }),
      String(solvedOf(r.result)),
      String(scoreOf(r.result)),
      String(Object.values(r.result.results).reduce((s, x) => s + x.attempts, 0)),
      r.result.submittedAt,
      r.checksumOk ? c.checksumOk : c.checksumBad,
    ]);
    const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = '﻿' + [head, ...lines].map((l) => l.map(esc).join(';')).join('\n');
    const name = (assignments.find(([id]) => id === currentId)?.[1] ?? 'results').replace(/[^\w.-]+/g, '_');
    downloadText(csv, `${name}.csv`, 'text/csv');
  };

  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + scoreOf(r.result), 0) / rows.length) : 0;

  return (
    <div data-testid="classroom-page" className="absolute inset-0 overflow-y-auto" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <header>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{c.eyebrow}</p>
          <h1 className="text-2xl font-bold mt-1">{c.title}</h1>
          <p className="text-[0.875rem] mt-2 max-w-3xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.lead}</p>
        </header>

        <section className={card} style={cardStyle} aria-labelledby="cls-create">
          <h2 id="cls-create" className="text-[0.9375rem] font-bold flex items-center gap-2"><Link2 size={16} /> {c.createTitle}</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="sm:col-span-3 flex flex-col gap-1 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
              {c.fieldTitle}
              <input data-testid="cls-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={c.fieldTitlePlaceholder} className={field} style={fieldStyle} />
            </label>
            <label className="sm:col-span-2 flex flex-col gap-1 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
              {c.fieldTeacher}
              <input data-testid="cls-teacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} className={field} style={fieldStyle} />
            </label>
            <label className="flex flex-col gap-1 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
              {c.fieldDue}
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} style={fieldStyle} />
            </label>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[0.75rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>{c.fieldExercises} ({picked.length})</span>
            <span className="flex gap-3 text-[0.75rem]">
              <button type="button" className="underline" onClick={() => setPicked(EXERCISES.map((e) => e.id))}>{c.selectAll}</button>
              <button type="button" className="underline" onClick={() => setPicked([])}>{c.selectNone}</button>
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {EXERCISES.map((e, i) => (
              <label key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[0.25rem] border text-[0.8125rem] cursor-pointer" style={{ borderColor: picked.includes(e.id) ? 'var(--accent-primary)' : 'var(--border-subtle)', backgroundColor: picked.includes(e.id) ? 'var(--accent-subtle)' : undefined }}>
                <input type="checkbox" data-testid={`cls-pick-${e.id}`} checked={picked.includes(e.id)} onChange={() => toggle(e.id)} />
                <span>{String(i + 1).padStart(2, '0')} · {e.title[lang]}</span>
              </label>
            ))}
          </div>
          {createError && <p className="text-[0.7812rem]" style={{ color: '#ef4444' }}>{createError}</p>}
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" data-testid="cls-create" onClick={create} className="h-9 px-4 rounded-[0.25rem] text-[0.8125rem] font-semibold text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
              {c.createLink}
            </button>
          </div>
          {link && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input data-testid="cls-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className={`${field} font-mono text-[0.75rem]`} style={fieldStyle} />
              <button type="button" onClick={copy} className="h-9 px-3 rounded-[0.25rem] border text-[0.8125rem] flex items-center gap-1.5 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? c.copied : c.copyLink}
              </button>
              <a href={link} target="_blank" rel="noopener noreferrer" className="h-9 px-3 rounded-[0.25rem] border text-[0.8125rem] flex items-center gap-1.5 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                <ExternalLink size={14} /> {c.openAsStudent}
              </a>
            </div>
          )}
        </section>

        <section className={card} style={cardStyle} aria-labelledby="cls-results">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 id="cls-results" className="text-[0.9375rem] font-bold flex items-center gap-2"><FileUp size={16} /> {c.resultsTitle}</h2>
            <div className="flex gap-2">
              <label className="h-9 px-3 rounded-[0.25rem] text-[0.8125rem] font-semibold text-white flex items-center gap-1.5 cursor-pointer" style={{ backgroundColor: 'var(--accent-primary)' }}>
                <FileUp size={14} /> {c.loadFiles}
                <input data-testid="cls-files" type="file" accept=".json,application/json" multiple className="hidden" onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
              </label>
              {rows.length > 0 && (
                <>
                  <button type="button" onClick={exportCsv} className="h-9 px-3 rounded-[0.25rem] border text-[0.8125rem] flex items-center gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <Download size={14} /> {c.exportCsv}
                  </button>
                  <button type="button" onClick={() => setLoaded([])} className="h-9 px-3 rounded-[0.25rem] border text-[0.8125rem] flex items-center gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <Trash2 size={14} /> {c.clearResults}
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-[0.7812rem]" style={{ color: 'var(--text-secondary)' }}>{c.loadHint}</p>
          {loadErrors.map((e) => <p key={e} className="text-[0.7812rem]" style={{ color: '#ef4444' }}>{e}</p>)}
          {assignments.length > 1 && (
            <label className="flex items-center gap-2 text-[0.7812rem]">
              {c.assignment}
              <select value={currentId} onChange={(e) => setSelectedAssignment(e.target.value)} className="h-8 px-2 rounded-[0.25rem] border" style={fieldStyle}>
                {assignments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          )}
          {rows.length === 0 ? (
            <p className="text-[0.8125rem] italic" style={{ color: 'var(--text-muted)' }}>{c.noResults}</p>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-[0.25rem]" style={{ borderColor: 'var(--border-subtle)' }}>
                <table data-testid="cls-table" className="w-full text-[0.7812rem] border-collapse">
                  <thead style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)' }}>
                    <tr>
                      <th className="px-2.5 py-2 text-left">{c.student}</th>
                      {exerciseIds.map((id) => <th key={id} className="px-2 py-2 text-left font-medium whitespace-nowrap" title={titleOf(id)}>{titleOf(id)}</th>)}
                      <th className="px-2 py-2 text-left">{c.solved}</th>
                      <th className="px-2 py-2 text-left">{c.score}</th>
                      <th className="px-2 py-2 text-left">{c.checksum}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.file + r.result.student} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <td className="px-2.5 py-1.5 font-medium whitespace-nowrap">{r.result.student}</td>
                        {exerciseIds.map((id) => {
                          const x = r.result.results[id];
                          const color = !x || x.attempts === 0 ? 'var(--text-muted)' : x.solved ? '#16a34a' : '#d97706';
                          return (
                            <td key={id} className="px-2 py-1.5 font-mono whitespace-nowrap" style={{ color }} title={x ? `${c.attempts}: ${x.attempts}` : ''}>
                              {x && x.attempts > 0 ? `${x.solved ? '✓ ' : ''}${x.bestPassed}/${x.total}` : '—'}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1.5">{solvedOf(r.result)} / {exerciseIds.length}</td>
                        <td className="px-2 py-1.5 font-semibold">{scoreOf(r.result)}%</td>
                        <td className="px-2 py-1.5" style={{ color: r.checksumOk ? '#16a34a' : '#ef4444' }}>{r.checksumOk ? c.checksumOk : c.checksumBad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[0.8125rem]"><b>{c.classAverage}:</b> {avg}% · {rows.length} {c.student.toLowerCase()}</p>
            </>
          )}
          <p className="text-[0.7188rem]" style={{ color: 'var(--text-muted)' }}>{c.checksumNote}</p>
        </section>
      </div>
    </div>
  );
}
