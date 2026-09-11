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
      return 'text-blue-300';
    }
    return 'text-slate-300';
  };

  return (
    <div
      data-testid="wf-console"
      className="shrink-0 flex flex-col bg-[#0a1120] border-t border-[#1e293b] select-none z-10"
      style={{ height }}
    >
      {/* ── Tab & Control Header ─────────────────────────────────── */}
      <div className="h-8 px-3 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Console Tab */}
          <button
            data-testid="wf-console-tab-all"
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold tracking-wider uppercase transition-colors ${
              activeTab === 'console'
                ? 'text-blue-400 bg-[#1e293b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={12} />
            <span>Console</span>
            <span className="text-[10px] font-mono px-1 py-0.2 bg-[#0a1120] text-slate-400 rounded">
              {logs.length}
            </span>
          </button>

          {/* Problems Tab */}
          <button
            data-testid="wf-console-tab-problems"
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold tracking-wider uppercase transition-colors ${
              activeTab === 'problems'
                ? 'text-amber-400 bg-[#1e293b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle size={12} className={problems.length > 0 ? 'text-amber-400' : ''} />
            <span>Problems</span>
            {problems.length > 0 && (
              <span className="text-[10px] font-mono px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded font-bold">
                {problems.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {isCompiling && (
            <div className="flex items-center gap-1.5 text-[11px] text-blue-400 mr-2 font-mono">
              <div className="w-2.5 h-2.5 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
              <span>Compiling...</span>
            </div>
          )}

          <button
            onClick={onClearLogs}
            title="Clear Console Output"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] transition-colors"
          >
            <Trash2 size={13} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Console (Alt+T)"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] transition-colors ml-1"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Log Content Viewport ─────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed select-text bg-[#070c18]"
      >
        {displayedLogs.length === 0 ? (
          <div className="text-slate-600 italic">
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
