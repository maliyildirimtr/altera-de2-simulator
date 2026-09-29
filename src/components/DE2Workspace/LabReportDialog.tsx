import { useEffect, useRef, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { getCapture } from '../../board/signalRecorder';
import { lcdLines } from '../../core/peripherals/lcdController';
import { buildLabReport, openLabReport } from '../../report/labReport';
import { useI18n } from '../../i18n/I18nProvider';

const STORE_KEY = 'logiclab_report_v1';

const TEXT = {
  en: {
    title: 'Lab report',
    lead: 'Creates a printable report of the current design: summary, pin assignments, checks, truth table or state machine, board state, logic analyzer timing diagram and the source code. Save it as PDF from the print dialog.',
    reportTitle: 'Report title',
    author: 'Student name',
    course: 'Course / group',
    notes: 'Notes (optional)',
    notesPh: 'Aim of the experiment, observations, answers…',
    create: 'Create report',
    cancel: 'Cancel',
    empty: 'Write or open a design first.',
    opened: 'Report opened in a new tab. Use "Print / Save as PDF" there.',
    downloaded: 'The new tab was blocked, so the report was downloaded as an HTML file. Open it and print it as PDF.',
  },
  tr: {
    title: 'Laboratuvar raporu',
    lead: 'Mevcut tasarımın yazdırılabilir raporunu oluşturur: özet, pin atamaları, kontroller, doğruluk tablosu veya durum makinesi, kart durumu, lojik analizör zamanlama diyagramı ve kaynak kod. Yazdırma penceresinden PDF olarak kaydedebilirsin.',
    reportTitle: 'Rapor başlığı',
    author: 'Öğrenci adı',
    course: 'Ders / grup',
    notes: 'Notlar (isteğe bağlı)',
    notesPh: 'Deneyin amacı, gözlemler, cevaplar…',
    create: 'Raporu oluştur',
    cancel: 'Vazgeç',
    empty: 'Önce bir tasarım yaz ya da aç.',
    opened: 'Rapor yeni sekmede açıldı. Oradaki "Yazdır / PDF olarak kaydet" düğmesini kullan.',
    downloaded: 'Yeni sekme engellendi; rapor HTML dosyası olarak indirildi. Açıp PDF olarak yazdırabilirsin.',
  },
};

interface Saved {
  author: string;
  course: string;
}

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Saved>;
      return { author: typeof p.author === 'string' ? p.author : '', course: typeof p.course === 'string' ? p.course : '' };
    }
  } catch {
    /* defaults */
  }
  return { author: '', course: '' };
}

export function safeReportName(title: string): string {
  const map: Record<string, string> = { ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' };
  const base = title.replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => map[c]).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${base || 'design'}_report.html`;
}

export function LabReportDialog({ open, onClose, defaultTitle, onMessage }: { open: boolean; onClose: () => void; defaultTitle: string; onMessage: (text: string, kind: 'info' | 'warn') => void }) {
  const { lang } = useI18n();
  const t = TEXT[lang];
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const [title, setTitle] = useState(defaultTitle);
  const [notes, setNotes] = useState('');
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setTimeout(() => firstRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, defaultTitle, onClose]);

  if (!open) return null;

  const create = () => {
    const st = useBoardStore.getState();
    if (!st.hdlCode.trim()) {
      onMessage(t.empty, 'warn');
      return;
    }
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    } catch {
      /* not important */
    }
    const html = buildLabReport({
      lang,
      source: st.hdlCode,
      mappings: st.pinMappings,
      board: {
        switches: st.switches,
        keys: st.keys,
        ledR: st.ledR,
        ledG: st.ledG,
        hex: st.hex,
        lcd: st.lcdDebug.busSeen ? lcdLines(st.lcd) : null,
      },
      capture: getCapture(),
      title,
      author: saved.author,
      course: saved.course,
      notes,
    });
    const how = openLabReport(html, safeReportName(title));
    onMessage(how === 'opened' ? t.opened : t.downloaded, 'info');
    onClose();
  };

  const field = 'w-full h-9 px-2.5 rounded-[0.25rem] border text-[0.8125rem]';
  const fieldStyle = { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' };
  const label = 'flex flex-col gap-1 text-[0.75rem] font-semibold';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="lab-report-title" data-testid="lab-report-dialog" className="w-full max-w-md rounded-[0.5rem] border shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
          <h2 id="lab-report-title" className="text-[0.875rem] font-bold flex-1">{t.title}</h2>
          <button type="button" aria-label={t.cancel} onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]"><X size={15} /></button>
        </div>
        <form className="p-4 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <p className="text-[0.75rem] leading-snug" style={{ color: 'var(--text-secondary)' }}>{t.lead}</p>
          <label className={label}>{t.reportTitle}<input ref={firstRef} data-testid="report-title" className={field} style={fieldStyle} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>{t.author}<input data-testid="report-author" className={field} style={fieldStyle} value={saved.author} maxLength={80} onChange={(e) => setSaved((s) => ({ ...s, author: e.target.value }))} /></label>
            <label className={label}>{t.course}<input data-testid="report-course" className={field} style={fieldStyle} value={saved.course} maxLength={80} onChange={(e) => setSaved((s) => ({ ...s, course: e.target.value }))} /></label>
          </div>
          <label className={label}>{t.notes}<textarea data-testid="report-notes" rows={4} className={`${field} h-auto py-2 font-normal`} style={fieldStyle} placeholder={t.notesPh} value={notes} maxLength={4000} onChange={(e) => setNotes(e.target.value)} /></label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 px-3 rounded-[0.25rem] border text-[0.8125rem]" style={{ borderColor: 'var(--border-subtle)' }}>{t.cancel}</button>
            <button type="submit" data-testid="report-create" className="h-9 px-4 rounded-[0.25rem] text-[0.8125rem] font-semibold text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>{t.create}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
