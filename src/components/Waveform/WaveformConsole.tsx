import React, { useState, useRef, useEffect } from 'react';
import { Terminal, AlertTriangle, Trash2, X } from 'lucide-react';

export interface WaveformConsoleProps {
  height: number;
  logs: string[];
  isCompiling: boolean;
  onClearLogs: () => void;
  onClose?: () => void;
}

export const WaveformConsole: React.FC<WaveformConsoleProps> = ({
  height,
  logs,
  isCompiling,
  onClearLogs,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'problems'>('console');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const problems = logs.filter(
    (l) => l.toLowerCase().includes('error') || l.toLowerCase().includes('hata') || l.toLowerCase().includes('warning') || l.toLowerCase().includes('uyari')
  );

  const displayedLogs = activeTab === 'problems' ? problems : logs;

  const getLogStyle = (log: string) => {
    const lower = log.toLowerCase();
    if (lower.includes('error') || lower.includes('hata')) {
      return 'text-red-400 bg-red-950/20 px-1 py-0.5 rounded';
    }
    if (lower.includes('warning') || lower.includes('uyari')) {
      return 'text-amber-400 bg-amber-950/20 px-1 py-0.5 rounded';
    }
    if (log.includes('✓') || lower.includes('tamamlandı') || lower.includes('success')) {
      return 'text-emerald-400';
    }
    if (log.startsWith('# [VCD') || log.startsWith('[VCD]')) {
      return 'text-cyan-300';
    }
    if (log.startsWith('[ivl') || log.startsWith('[vvp]')) {
      return 'text-blue-400';
    }
    return 'text-[var(--text-primary)]';
  };

  return (
    <div
      data-testid="wf-console"
      className="shrink-0 flex flex-col border-t select-none z-10"
      style={{
        height,
        backgroundColor: 'var(--bg-input)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      {/* ── Tab & Control Header ─────────────────────────────────── */}
      <div
        className="h-8 px-3 border-b flex items-center justify-between shrink-0"
        style={{
          backgroundColor: 'var(--bg-panel-header)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-1">
          {/* Console Tab */}
          <button
            data-testid="wf-console-tab-all"
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors ${
              activeTab === 'console'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Terminal size={12} />
            <span>Console</span>
            <span
              className="text-[10px] font-mono px-1 py-0.2 rounded border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              {logs.length}
            </span>
          </button>

          {/* Problems Tab */}
          <button
            data-testid="wf-console-tab-problems"
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors ${
              activeTab === 'problems'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : problems.length > 0
                ? 'text-amber-500 font-semibold hover:bg-amber-500/10'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <AlertTriangle size={12} className={problems.length > 0 ? 'text-amber-500' : 'text-[var(--text-muted)]'} />
            <span>Problems</span>
            {problems.length > 0 && (
              <span className="text-[10px] font-mono px-1 py-0.2 bg-amber-500/10 text-amber-500 rounded font-semibold border border-amber-500/20">
                {problems.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {isCompiling && (
            <div className="flex items-center gap-1.5 text-[11px] text-blue-500 mr-2 font-mono">
              <div className="w-2.5 h-2.5 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
              <span>Compiling...</span>
            </div>
          )}

          <button
            onClick={onClearLogs}
            title="Clear Console Output"
            className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={13} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Console (Alt+T)"
              className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors ml-1"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Log Content Viewport ─────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed select-text"
        style={{ backgroundColor: 'var(--bg-input)' }}
      >
        {displayedLogs.length === 0 ? (
          <div className="italic" style={{ color: 'var(--text-muted)' }}>
            {activeTab === 'problems'
              ? 'No errors or warnings recorded.'
              : 'Console ready. Upload or write HDL files and click Compile.'}
          </div>
        ) : (
          displayedLogs.map((line, idx) => (
            <div key={idx} className={`whitespace-pre-wrap mb-0.5 ${getLogStyle(line)}`}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
