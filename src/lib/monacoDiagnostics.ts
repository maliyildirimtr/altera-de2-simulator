/* eslint-disable @typescript-eslint/no-explicit-any -- structural stand-ins for the Monaco types */
/**
 * Shows diagnostics in a Monaco editor: squiggles (markers) with the message
 * in the page language, a tinted background and a margin mark on each line
 * with a problem, and a way to jump to a line. Shared by the DE2 code editor,
 * the Exercises editor and the waveform editor.
 */
import type { Diagnostic } from '../core/simulator/diagnostics';

/* Minimal structural types, so this module does not import monaco itself. */
interface Model {
  getLineCount(): number;
  getLineFirstNonWhitespaceColumn(line: number): number;
  getLineMaxColumn(line: number): number;
}
interface DecorationsCollection {
  set(decorations: readonly any[]): unknown;
  clear(): void;
}
export interface EditorLike {
  getModel(): Model | null;
  createDecorationsCollection?(decorations?: readonly any[]): DecorationsCollection;
  revealLineInCenter(line: number): void;
  setPosition(pos: { lineNumber: number; column: number }): void;
  focus(): void;
}
export interface MonacoLike {
  editor: { setModelMarkers(model: any, owner: string, markers: any[]): void };
  MarkerSeverity: { Error: number; Warning: number; Info: number };
}

const STYLE_ID = 'logiclab-diagnostic-lines';

/** Line styles for the decorations (added once to the document). */
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    .ll-line-error { background: rgba(239, 68, 68, 0.14); }
    .ll-line-warning { background: rgba(234, 179, 8, 0.12); }
    .ll-glyph-error { background: #ef4444; border-radius: 50%; width: 8px !important; height: 8px !important; margin: 6px 0 0 6px; }
    .ll-glyph-warning { background: #eab308; border-radius: 50%; width: 8px !important; height: 8px !important; margin: 6px 0 0 6px; }
  `;
  document.head.appendChild(el);
}

/**
 * Applies `list` to the editor and returns a function that clears it again.
 * Lines outside the model are clamped, so a stale list never throws.
 */
export function showDiagnostics(editor: EditorLike, monaco: MonacoLike, list: Diagnostic[], lang: 'en' | 'tr', collection?: DecorationsCollection | null): DecorationsCollection | null {
  const model = editor.getModel();
  if (!model) return collection ?? null;
  ensureStyles();
  const lines = model.getLineCount();
  const clamp = (l: number) => Math.max(1, Math.min(lines, l || 1));
  monaco.editor.setModelMarkers(model, 'logiclab', list.map((dgn) => {
    const line = clamp(dgn.line);
    return {
      severity: dgn.severity === 'error' ? monaco.MarkerSeverity.Error : dgn.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
      message: dgn.message[lang] || dgn.message.en,
      startLineNumber: line,
      endLineNumber: line,
      startColumn: model.getLineFirstNonWhitespaceColumn(line) || 1,
      endColumn: model.getLineMaxColumn(line),
    };
  }));
  const decorations = list
    .filter((d) => d.severity !== 'info')
    .map((d) => {
      const line = clamp(d.line);
      const kind = d.severity === 'error' ? 'error' : 'warning';
      return {
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: { isWholeLine: true, className: `ll-line-${kind}`, glyphMarginClassName: `ll-glyph-${kind}`, glyphMarginHoverMessage: { value: d.message[lang] || d.message.en } },
      };
    });
  const coll = collection ?? editor.createDecorationsCollection?.() ?? null;
  coll?.set(decorations);
  return coll;
}

/** Scrolls to a line, puts the cursor at its start and focuses the editor. */
export function revealLine(editor: EditorLike, line: number) {
  const model = editor.getModel();
  if (!model) return;
  const l = Math.max(1, Math.min(model.getLineCount(), line));
  editor.revealLineInCenter(l);
  editor.setPosition({ lineNumber: l, column: model.getLineFirstNonWhitespaceColumn(l) || 1 });
  editor.focus();
}

/**
 * Reads line-numbered messages from Icarus Verilog output, e.g.
 * "main.sv:12: syntax error" or "tb.sv:4: error: Unknown module type: foo".
 * Only lines for `file` are returned.
 */
export function parseCompilerLog(logs: string[], file: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  const base = file.split('/').pop() ?? file;
  // One log line can carry several messages: "/a.sv:3: syntax error /a.sv:2: error: …".
  const re = /\/?([\w.-]+\.s?v):(\d+):\s*(.*?)(?=\s+\/?[\w.-]+\.s?v:\d+:|$)/g;
  for (const raw of logs) {
    const text = raw.replace(/^\[[A-Za-z-]+\]\s*/, '');
    for (const m of text.matchAll(re)) {
      if (m[1] !== base) continue;
      const msg = m[3].trim() || 'error';
      const severity = /warning/i.test(msg) && !/error/i.test(msg) ? 'warning' : 'error';
      if (!out.some((d) => d.line === Number(m[2]) && d.message.en === msg)) out.push({ line: Number(m[2]), severity, message: { en: msg, tr: msg } });
    }
  }
  out.sort((x, y) => x.line - y.line);
  return out;
}
