import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import '../lib/monacoSetup';
import { Cpu, FilePlus2, RotateCcw, Save } from 'lucide-react';
import { EXAMPLES_LIST } from '../examples/registry';
import { lintVerilog } from '../core/simulator/diagnostics';
import { compileVerilog } from '../core/simulator/verilogEngine';
import { useBoardStore } from '../store/boardStore';
import { markWorkspaceDirty, markWorkspaceUser } from '../services/exampleHandoff';
import { useI18n } from '../i18n/I18nProvider';

const API = '/__logiclab/examples';
const HEADERS = { 'X-LogicLab-Dev': '1' };

const TEXT = {
  en: {
    title: 'Example sources (local)',
    lead: 'Edit the bundled examples on your own computer. Save writes the file in src/examples/source; the site reloads it at once. Commit and push to publish.',
    devOnly: 'This editor only works with the local dev server (npm run dev).',
    files: 'Files',
    usedBy: 'Used by',
    unused: 'Not referenced in src/examples/registry.ts yet',
    save: 'Save',
    saved: 'Saved to',
    revert: 'Revert',
    unsaved: 'unsaved changes',
    tryDe2: 'Try on DE2',
    newFile: 'New file',
    newPrompt: 'New file name (e.g. my_design.sv):',
    newHint: 'New files appear in the gallery after you add them to src/examples/registry.ts.',
    confirmLeave: 'Discard unsaved changes?',
    checks: 'Checks',
    noIssues: 'No issues found.',
    compileError: 'Does not compile:',
    loadError: 'Could not reach the dev server API:',
  },
  tr: {
    title: 'Örnek kaynakları (yerel)',
    lead: 'Hazır örnekleri kendi bilgisayarında düzenle. Kaydet, dosyayı src/examples/source içine yazar; site onu hemen yeniden yükler. Yayına almak için commit ve push yap.',
    devOnly: 'Bu editör yalnızca yerel geliştirme sunucusuyla (npm run dev) çalışır.',
    files: 'Dosyalar',
    usedBy: 'Kullanan örnekler',
    unused: 'Henüz src/examples/registry.ts içinde kullanılmıyor',
    save: 'Kaydet',
    saved: 'Kaydedildi:',
    revert: 'Geri al',
    unsaved: 'kaydedilmemiş değişiklik',
    tryDe2: "DE2'de dene",
    newFile: 'Yeni dosya',
    newPrompt: 'Yeni dosya adı (örn. tasarimim.sv):',
    newHint: 'Yeni dosyalar src/examples/registry.ts içine eklendikten sonra galeride görünür.',
    confirmLeave: 'Kaydedilmemiş değişiklikler silinsin mi?',
    checks: 'Kontroller',
    noIssues: 'Sorun bulunmadı.',
    compileError: 'Derlenmiyor:',
    loadError: 'Geliştirme sunucusu API\'sine ulaşılamadı:',
  },
};

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...HEADERS, ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body as T;
}

/**
 * Dev-only editor for src/examples/source (route registered only when
 * import.meta.env.DEV). Talks to the Vite plugin in vite/exampleEditorPlugin.ts.
 */
export default function DevExamples() {
  const { lang } = useI18n();
  const t = TEXT[lang];
  const navigate = useNavigate();
  const [files, setFiles] = useState<Array<{ name: string; size: number }>>([]);
  const [active, setActive] = useState<string>('');
  const [original, setOriginal] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = code !== original;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ files: Array<{ name: string; size: number }> }>('');
      setFiles(r.files);
      return r.files;
    } catch (err) {
      setStatus({ kind: 'err', text: `${t.loadError} ${(err as Error).message}` });
      return [];
    }
  }, [t.loadError]);

  const open = useCallback(async (name: string) => {
    if (dirtyRef.current && !window.confirm(t.confirmLeave)) return;
    try {
      const r = await api<{ content: string }>(`/${encodeURIComponent(name)}`);
      setActive(name);
      setOriginal(r.content);
      setCode(r.content);
      setStatus(null);
    } catch (err) {
      setStatus({ kind: 'err', text: (err as Error).message });
    }
  }, [t.confirmLeave]);

  useEffect(() => {
    void refresh().then((list) => { if (list[0]) void open(list[0].name); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async () => {
    if (!active || saving) return;
    setSaving(true);
    try {
      await api(`/${encodeURIComponent(active)}`, { method: 'PUT', body: code });
      setOriginal(code);
      setStatus({ kind: 'ok', text: `${t.saved} src/examples/source/${active}` });
      void refresh();
    } catch (err) {
      setStatus({ kind: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [active, code, saving, refresh, t.saved]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [save]);

  const createFile = async () => {
    const name = window.prompt(t.newPrompt)?.trim();
    if (!name) return;
    const file = /\.(sv|v)$/.test(name) ? name : `${name}.sv`;
    const mod = file.replace(/\.(sv|v)$/, '').replace(/[^A-Za-z0-9_]/g, '_');
    try {
      await api(`/${encodeURIComponent(file)}?create=1`, { method: 'PUT', body: `module ${mod} (\n    input  logic SW0,\n    output logic LEDR0\n);\n\n    assign LEDR0 = SW0;\n\nendmodule\n` });
      await refresh();
      dirtyRef.current = false;
      await open(file);
      setStatus({ kind: 'ok', text: t.newHint });
    } catch (err) {
      setStatus({ kind: 'err', text: (err as Error).message });
    }
  };

  const usedBy = useMemo(() => {
    if (!active) return [];
    return EXAMPLES_LIST.filter((e) => [e.source?.filename, e.testbench?.filename, e.de2?.filename].includes(active)).map((e) => e.title);
  }, [active]);

  const checks = useMemo(() => {
    if (!code.trim()) return { compile: null as string | null, list: [] as string[] };
    let compile: string | null = null;
    let transpile: string | undefined;
    try {
      transpile = compileVerilog(code).transpileError;
    } catch (err) {
      compile = (err as Error).message;
    }
    return { compile, list: lintVerilog(code, transpile).map((d) => `${lang === 'tr' ? 'Satır' : 'Line'} ${d.line}: ${d.message[lang]}`) };
  }, [code, lang]);

  const tryOnDe2 = () => {
    const st = useBoardStore.getState();
    st.setHdlCode(code);
    st.setPinMappings([]);
    st.setEngine(null);
    st.resetBoard();
    markWorkspaceUser('de2');
    markWorkspaceDirty('de2');
    navigate('/de2-simulator');
  };

  const btn = 'h-8 px-3 rounded-[4px] border text-[12.5px] font-medium flex items-center gap-1.5 disabled:opacity-40';
  const btnStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' };

  return (
    <div data-testid="dev-examples" className="absolute inset-0 flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <aside className="md:w-[270px] shrink-0 border-b md:border-b-0 md:border-r flex flex-col min-h-0" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h1 className="text-[15px] font-bold">{t.title}</h1>
          <p className="text-[11.5px] mt-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>{t.lead}</p>
        </div>
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.files} ({files.length})</span>
          <button type="button" className="text-[12px] flex items-center gap-1 underline" onClick={createFile}><FilePlus2 size={13} /> {t.newFile}</button>
        </div>
        <ul className="flex-1 overflow-y-auto pb-2">
          {files.map((f) => (
            <li key={f.name}>
              <button type="button" data-testid={`dev-file-${f.name}`} onClick={() => void open(f.name)} className="w-full text-left px-4 py-1.5 text-[12.5px] font-mono hover:bg-[var(--bg-hover)]" style={{ backgroundColor: f.name === active ? 'var(--accent-subtle)' : undefined, color: f.name === active ? 'var(--accent-primary)' : undefined }}>
                {f.name}{f.name === active && dirty ? ' •' : ''}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="px-3 py-2 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
          <span className="font-mono text-[13px] font-semibold">{active || '—'}</span>
          {dirty && <span className="text-[11.5px]" style={{ color: '#d97706' }}>● {t.unsaved}</span>}
          <span className="flex-1" />
          <button type="button" className={btn} style={btnStyle} disabled={!dirty} onClick={() => setCode(original)}><RotateCcw size={13} /> {t.revert}</button>
          <button type="button" className={btn} style={btnStyle} disabled={!code.trim()} onClick={tryOnDe2}><Cpu size={13} /> {t.tryDe2}</button>
          <button type="button" data-testid="dev-save" className={`${btn} text-white`} style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }} disabled={!dirty || saving} onClick={() => void save()}><Save size={13} /> {t.save}</button>
        </div>
        {status && (
          <p data-testid="dev-status" className="px-3 py-1.5 text-[12px]" style={{ color: status.kind === 'ok' ? '#16a34a' : '#ef4444' }}>{status.text}</p>
        )}
        <div className="flex-1 min-h-0">
          <Editor height="100%" language="systemverilog" theme="vs-dark" value={code} onChange={(v) => setCode(v ?? '')} options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4 }} />
        </div>
        <div className="border-t px-3 py-2 text-[12px] max-h-[150px] overflow-y-auto" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            <b>{t.usedBy}:</b> {usedBy.length ? usedBy.join(', ') : <i>{t.unused}</i>}
          </p>
          <p className="mt-1 font-semibold">{t.checks}</p>
          {checks.compile && <p style={{ color: '#ef4444' }}>{t.compileError} {checks.compile}</p>}
          {checks.list.map((l) => <p key={l} style={{ color: '#d97706' }}>{l}</p>)}
          {!checks.compile && checks.list.length === 0 && <p style={{ color: '#16a34a' }}>{t.noIssues}</p>}
        </div>
      </main>
    </div>
  );
}
