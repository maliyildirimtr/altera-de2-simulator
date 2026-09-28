import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { BASE_EXAMPLES } from '../../examples/registry';
import {
  addedExampleErrors,
  CATEGORIES,
  diffOverride,
  DIFFICULTIES,
  normalizeMetadata,
  type AddedExample,
  type ExampleMetadata,
  type ExampleOverride,
} from '../../examples/metadata';
import type { ExampleCategory, ExampleDifficulty } from '../../examples/types';

const META_API = '/__logiclab/metadata';
const FILE_API = '/__logiclab/examples';
const HEADERS = { 'X-LogicLab-Dev': '1' };
const SELECTED_KEY = 'logiclab_dev_meta_selected';

const TEXT = {
  en: {
    examples: 'Examples',
    builtIn: 'built in',
    added: 'added',
    edited: 'edited',
    newExample: 'New example',
    title: 'Title',
    description: 'Description',
    difficulty: 'Difficulty',
    category: 'Category',
    topics: 'Topics (comma separated)',
    objectives: 'Learning objectives (one per line)',
    id: 'ID (lowercase, a–z 0–9 _)',
    sourceFile: 'Source file',
    topModule: 'Top module',
    testbenchFile: 'Testbench file (optional, enables Waveform)',
    de2File: 'DE2 file (optional, enables DE2)',
    de2TopModule: 'DE2 top module',
    none: '— none —',
    save: 'Save metadata',
    saved: 'Saved to src/examples/metadata.json. The gallery reloads with the change.',
    reset: 'Reset to original',
    remove: 'Remove example',
    confirmRemove: 'Remove this example from metadata.json? Its source files are kept.',
    noChanges: 'Nothing differs from the original, so no override is stored.',
    lead: 'Changes are stored in src/examples/metadata.json, so registry.ts never has to be edited by hand. Commit and push to publish.',
    fixFirst: 'Fix these first:',
  },
  tr: {
    examples: 'Örnekler',
    builtIn: 'hazır',
    added: 'eklenen',
    edited: 'düzenlendi',
    newExample: 'Yeni örnek',
    title: 'Başlık',
    description: 'Açıklama',
    difficulty: 'Zorluk',
    category: 'Kategori',
    topics: 'Konular (virgülle ayır)',
    objectives: 'Öğrenme hedefleri (her satıra bir tane)',
    id: 'Kimlik (küçük harf, a–z 0–9 _)',
    sourceFile: 'Kaynak dosya',
    topModule: 'Üst modül',
    testbenchFile: 'Testbench dosyası (isteğe bağlı, Waveform açılır)',
    de2File: 'DE2 dosyası (isteğe bağlı, DE2 açılır)',
    de2TopModule: 'DE2 üst modülü',
    none: '— yok —',
    save: 'Bilgileri kaydet',
    saved: 'src/examples/metadata.json dosyasına kaydedildi. Galeri değişiklikle yeniden yüklenir.',
    reset: 'Orijinale döndür',
    remove: 'Örneği kaldır',
    confirmRemove: 'Bu örnek metadata.json dosyasından kaldırılsın mı? Kaynak dosyaları silinmez.',
    noChanges: 'Orijinalden farklı bir şey yok, bu yüzden değişiklik kaydı tutulmadı.',
    lead: 'Değişiklikler src/examples/metadata.json dosyasına yazılır; registry.ts elle düzenlenmez. Yayına almak için commit ve push yap.',
    fixFirst: 'Önce bunları düzelt:',
  },
};

const DIFF_LABEL = { en: { beginner: 'Beginner', intermediate: 'Intermediate' }, tr: { beginner: 'Başlangıç', intermediate: 'Orta' } };
const CAT_LABEL = {
  en: { combinational: 'Combinational', sequential: 'Sequential', arithmetic: 'Arithmetic', routing: 'Routing', fpga: 'FPGA board' },
  tr: { combinational: 'Kombinasyonel', sequential: 'Ardışıl', arithmetic: 'Aritmetik', routing: 'Yönlendirme', fpga: 'FPGA kartı' },
};

interface Draft {
  title: string;
  description: string;
  difficulty: ExampleDifficulty;
  category: ExampleCategory;
  topics: string;
  objectives: string;
  // added examples only
  id: string;
  sourceFile: string;
  topModule: string;
  testbenchFile: string;
  de2File: string;
  de2TopModule: string;
}

const NEW_KEY = '__new__';

function splitList(text: string, sep: RegExp): string[] {
  return text.split(sep).map((s) => s.trim()).filter(Boolean);
}

async function firstModule(file: string): Promise<string> {
  try {
    const res = await fetch(`${FILE_API}/${encodeURIComponent(file)}`, { headers: HEADERS });
    const body = (await res.json()) as { content?: string };
    const clean = (body.content ?? '').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return /\bmodule\s+([A-Za-z_][A-Za-z0-9_$]*)/.exec(clean)?.[1] ?? '';
  } catch {
    return '';
  }
}

/** Metadata form for the dev example editor (#/dev/examples, "Examples" tab). */
export default function ExampleMetaEditor({ lang, files }: { lang: 'en' | 'tr'; files: string[] }) {
  const t = TEXT[lang];
  const [meta, setMeta] = useState<ExampleMetadata | null>(null);
  const [selected, setSelected] = useState<string>(() => {
    try {
      return sessionStorage.getItem(SELECTED_KEY) ?? BASE_EXAMPLES[0].id;
    } catch {
      return BASE_EXAMPLES[0].id;
    }
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch(META_API, { headers: HEADERS })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => setMeta(normalizeMetadata(j)))
      .catch((err: Error) => setStatus({ kind: 'err', text: err.message }));
  }, []);

  useEffect(() => {
    setStatus((s) => (s?.kind === 'ok' ? null : s));
    try {
      sessionStorage.setItem(SELECTED_KEY, selected);
    } catch {
      /* not important */
    }
  }, [selected]);

  const baseIds = useMemo(() => new Set(BASE_EXAMPLES.map((e) => e.id)), []);

  // Build the form contents whenever the selection or stored metadata changes.
  useEffect(() => {
    if (!meta) return;
    if (selected === NEW_KEY) {
      setDraft({ title: '', description: '', difficulty: 'beginner', category: 'combinational', topics: '', objectives: '', id: '', sourceFile: '', topModule: '', testbenchFile: '', de2File: '', de2TopModule: '' });
      return;
    }
    const base = BASE_EXAMPLES.find((e) => e.id === selected);
    if (base) {
      const v = { ...base, ...(meta.overrides[base.id] ?? {}) };
      setDraft({ title: v.title, description: v.description, difficulty: v.difficulty, category: v.category, topics: v.topics.join(', '), objectives: v.learningObjectives.join('\n'), id: base.id, sourceFile: base.source.filename, topModule: base.topModule, testbenchFile: base.testbench?.filename ?? '', de2File: base.de2?.filename ?? '', de2TopModule: base.de2?.topModule ?? '' });
      return;
    }
    const a = meta.added.find((x) => x.id === selected);
    if (a) {
      setDraft({ title: a.title, description: a.description, difficulty: a.difficulty, category: a.category, topics: a.topics.join(', '), objectives: a.learningObjectives.join('\n'), id: a.id, sourceFile: a.sourceFile, topModule: a.topModule, testbenchFile: a.testbenchFile ?? '', de2File: a.de2File ?? '', de2TopModule: a.de2TopModule ?? '' });
    } else setSelected(BASE_EXAMPLES[0].id);
  }, [meta, selected]);

  const isBase = baseIds.has(selected);
  const isNew = selected === NEW_KEY;

  const put = useCallback(async (next: ExampleMetadata, message: string) => {
    try {
      const res = await fetch(META_API, { method: 'PUT', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setMeta(next);
      setStatus({ kind: 'ok', text: message });
      return true;
    } catch (err) {
      setStatus({ kind: 'err', text: (err as Error).message });
      return false;
    }
  }, []);

  const asAdded = (d: Draft): AddedExample => ({
    id: d.id.trim(),
    title: d.title.trim(),
    description: d.description.trim(),
    difficulty: d.difficulty,
    category: d.category,
    topics: splitList(d.topics, /,/),
    learningObjectives: splitList(d.objectives, /\n/),
    sourceFile: d.sourceFile,
    topModule: d.topModule.trim(),
    ...(d.testbenchFile ? { testbenchFile: d.testbenchFile } : {}),
    ...(d.de2File ? { de2File: d.de2File, de2TopModule: d.de2TopModule.trim() } : {}),
  });

  const problems = useMemo(() => {
    if (!draft || !meta) return [];
    if (isBase) {
      const errs: string[] = [];
      if (!draft.title.trim()) errs.push(`${t.title}`);
      if (!draft.description.trim()) errs.push(`${t.description}`);
      return errs;
    }
    const others = new Set([...baseIds, ...meta.added.map((a) => a.id).filter((id) => id !== selected)]);
    return addedExampleErrors(asAdded(draft), others);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, meta, isBase, selected, baseIds, t]);

  const save = async () => {
    if (!draft || !meta || problems.length) return;
    if (isBase) {
      const base = BASE_EXAMPLES.find((e) => e.id === selected)!;
      const edited: ExampleOverride = { title: draft.title.trim(), description: draft.description.trim(), difficulty: draft.difficulty, category: draft.category, topics: splitList(draft.topics, /,/), learningObjectives: splitList(draft.objectives, /\n/) };
      const diff = diffOverride(base, edited);
      const overrides = { ...meta.overrides };
      if (diff) overrides[selected] = diff;
      else delete overrides[selected];
      await put({ ...meta, overrides }, diff ? t.saved : t.noChanges);
      return;
    }
    const entry = asAdded(draft);
    const added = isNew ? [...meta.added, entry] : meta.added.map((a) => (a.id === selected ? entry : a));
    if (await put({ ...meta, added }, t.saved)) setSelected(entry.id);
  };

  const reset = async () => {
    if (!meta) return;
    const overrides = { ...meta.overrides };
    delete overrides[selected];
    await put({ ...meta, overrides }, t.saved);
  };

  const remove = async () => {
    if (!meta || !window.confirm(t.confirmRemove)) return;
    if (await put({ ...meta, added: meta.added.filter((a) => a.id !== selected) }, t.saved)) setSelected(BASE_EXAMPLES[0].id);
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const pickFile = async (k: 'sourceFile' | 'de2File', v: string) => {
    set(k, v);
    if (!v) return;
    const mod = await firstModule(v);
    if (mod) set(k === 'sourceFile' ? 'topModule' : 'de2TopModule', mod);
  };

  const input = 'w-full h-8 px-2 rounded-[4px] border text-[13px] bg-transparent';
  const inputStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-app)' };
  const label = 'text-[11.5px] font-semibold flex flex-col gap-1';
  const btn = 'h-8 px-3 rounded-[4px] border text-[12.5px] font-medium flex items-center gap-1.5 disabled:opacity-40';
  const btnStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' };

  const fileSelect = (k: 'sourceFile' | 'testbenchFile' | 'de2File', optional: boolean) => (
    <select data-testid={`meta-${k}`} className={input} style={inputStyle} value={draft?.[k] ?? ''} disabled={isBase} onChange={(e) => (k === 'testbenchFile' ? set(k, e.target.value) : void pickFile(k, e.target.value))}>
      {optional || !draft?.[k] ? <option value="">{t.none}</option> : null}
      {files.map((f) => <option key={f} value={f}>{f}</option>)}
    </select>
  );

  return (
    <div data-testid="meta-editor" className="flex-1 min-h-0 flex flex-col md:flex-row">
      <ul className="md:w-[250px] shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r py-1 max-h-[30vh] md:max-h-none" style={{ borderColor: 'var(--border-subtle)' }}>
        <li>
          <button type="button" data-testid="meta-new" onClick={() => setSelected(NEW_KEY)} className="w-full text-left px-4 py-1.5 text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-[var(--bg-hover)]" style={{ color: 'var(--accent-primary)', backgroundColor: isNew ? 'var(--accent-subtle)' : undefined }}>
            <Plus size={13} /> {t.newExample}
          </button>
        </li>
        {[...BASE_EXAMPLES.map((e) => ({ id: e.id, title: meta?.overrides[e.id]?.title ?? e.title, tag: meta?.overrides[e.id] ? t.edited : t.builtIn })), ...(meta?.added ?? []).map((a) => ({ id: a.id, title: a.title, tag: t.added }))].map((e) => (
          <li key={e.id}>
            <button type="button" data-testid={`meta-item-${e.id}`} onClick={() => setSelected(e.id)} className="w-full text-left px-4 py-1.5 text-[12.5px] hover:bg-[var(--bg-hover)] flex items-center gap-2" style={{ backgroundColor: e.id === selected ? 'var(--accent-subtle)' : undefined }}>
              <span className="flex-1 truncate" style={{ color: e.id === selected ? 'var(--accent-primary)' : undefined }}>{e.title}</span>
              <span className="text-[10.5px] shrink-0" style={{ color: e.tag === t.builtIn ? 'var(--text-muted)' : '#d97706' }}>{e.tag}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex-1 min-w-0 overflow-y-auto p-4">
        <p className="text-[12px] mb-3" style={{ color: 'var(--text-secondary)' }}>{t.lead}</p>
        {status && <p data-testid="meta-status" className="text-[12.5px] mb-3" style={{ color: status.kind === 'ok' ? '#16a34a' : '#ef4444' }}>{status.text}</p>}
        {draft && (
          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
            {!isBase && (
              <label className={label}>{t.id}<input data-testid="meta-id" className={`${input} font-mono`} style={inputStyle} value={draft.id} onChange={(e) => set('id', e.target.value)} /></label>
            )}
            <label className={`${label} ${isBase ? 'sm:col-span-2' : ''}`}>{t.title}<input data-testid="meta-title" className={input} style={inputStyle} value={draft.title} onChange={(e) => set('title', e.target.value)} /></label>
            <label className={`${label} sm:col-span-2`}>{t.description}<textarea data-testid="meta-description" rows={3} className={`${input} h-auto py-1.5`} style={inputStyle} value={draft.description} onChange={(e) => set('description', e.target.value)} /></label>
            <label className={label}>{t.difficulty}
              <select data-testid="meta-difficulty" className={input} style={inputStyle} value={draft.difficulty} onChange={(e) => set('difficulty', e.target.value as ExampleDifficulty)}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFF_LABEL[lang][d]}</option>)}
              </select>
            </label>
            <label className={label}>{t.category}
              <select data-testid="meta-category" className={input} style={inputStyle} value={draft.category} onChange={(e) => set('category', e.target.value as ExampleCategory)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[lang][c]}</option>)}
              </select>
            </label>
            <label className={`${label} sm:col-span-2`}>{t.topics}<input data-testid="meta-topics" className={input} style={inputStyle} value={draft.topics} onChange={(e) => set('topics', e.target.value)} /></label>
            <label className={`${label} sm:col-span-2`}>{t.objectives}<textarea data-testid="meta-objectives" rows={3} className={`${input} h-auto py-1.5`} style={inputStyle} value={draft.objectives} onChange={(e) => set('objectives', e.target.value)} /></label>
            <label className={label}>{t.sourceFile}{fileSelect('sourceFile', false)}</label>
            <label className={label}>{t.topModule}<input data-testid="meta-topModule" className={`${input} font-mono`} style={inputStyle} value={draft.topModule} disabled={isBase} onChange={(e) => set('topModule', e.target.value)} /></label>
            <label className={`${label} sm:col-span-2`}>{t.testbenchFile}{fileSelect('testbenchFile', true)}</label>
            <label className={label}>{t.de2File}{fileSelect('de2File', true)}</label>
            <label className={label}>{t.de2TopModule}<input data-testid="meta-de2TopModule" className={`${input} font-mono`} style={inputStyle} value={draft.de2TopModule} disabled={isBase || !draft.de2File} onChange={(e) => set('de2TopModule', e.target.value)} /></label>

            {problems.length > 0 && (
              <p data-testid="meta-problems" className="sm:col-span-2 text-[12px]" style={{ color: '#d97706' }}>{t.fixFirst} {problems.join(' · ')}</p>
            )}
            <div className="sm:col-span-2 flex items-center gap-2 flex-wrap">
              <button type="button" data-testid="meta-save" className={`${btn} text-white`} style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }} disabled={problems.length > 0} onClick={() => void save()}><Save size={13} /> {t.save}</button>
              {isBase && meta?.overrides[selected] && <button type="button" data-testid="meta-reset" className={btn} style={btnStyle} onClick={() => void reset()}><RotateCcw size={13} /> {t.reset}</button>}
              {!isBase && !isNew && <button type="button" data-testid="meta-remove" className={btn} style={{ ...btnStyle, color: '#ef4444' }} onClick={() => void remove()}><Trash2 size={13} /> {t.remove}</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
