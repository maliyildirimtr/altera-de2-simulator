import React, { useState } from 'react';
import {
  Terminal,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export interface ConsoleMessage {
  id: string;
  type: 'info' | 'success' | 'error' | 'warn';
  text: string;
  timestamp: string;
}

interface ConsolePanelProps {
  isOpen: boolean;
  height?: number;
  onToggle: () => void;
  messages: ConsoleMessage[];
  compileError: string | null;
  onClear: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  isOpen,
  height,
  onToggle,
  messages,
  compileError,
  onClear,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'problems'>('console');

  if (!isOpen) {
    return (
      <div
        data-testid="console-panel"
        aria-label="Simulation Console"
        className="h-8 border-t px-3 flex items-center justify-between text-xs select-none shrink-0"
        style={{
          backgroundColor: 'var(--bg-toolbar)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            data-testid="console-tab-console"
            onClick={() => {
              setActiveTab('console');
              onToggle();
            }}
            className="flex items-center gap-1.5 transition-colors hover:text-[var(--text-primary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Terminal size={13} />
            <span className="font-medium">Console</span>
            {messages.length > 0 && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.2 rounded"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {messages.length}
              </span>
            )}
          </button>
          <button
            data-testid="console-tab-problems"
            onClick={() => {
              setActiveTab('problems');
              onToggle();
            }}
            className={`flex items-center gap-1.5 transition-colors ${
              compileError ? 'text-red-500 font-semibold' : 'hover:text-[var(--text-primary)]'
            }`}
            style={{ color: compileError ? undefined : 'var(--text-secondary)' }}
          >
            <AlertCircle size={13} className={compileError ? 'text-red-500' : 'text-[var(--text-muted)]'} />
            <span className="font-medium">Problems</span>
            {compileError && (
              <span className="text-[10px] font-mono bg-red-500/10 text-red-500 px-1.5 py-0.2 rounded border border-red-500/20 font-semibold">
                1
              </span>
            )}
          </button>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title="Expand Panel"
        >
          <ChevronUp size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="console-panel"
      aria-label="Simulation Console"
      style={{
        height: height ?? 190,
        backgroundColor: 'var(--bg-input)',
      }}
      className="flex flex-col shrink-0 select-none z-10 overflow-hidden border-t border-[var(--border-subtle)]"
    >
      {/* Header Tabs */}
      <div
        className="h-8 px-3 flex items-center justify-between border-b shrink-0"
        style={{
          backgroundColor: 'var(--bg-panel-header)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-1">
          <button
            data-testid="console-tab-console"
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[4px] transition-colors ${
              activeTab === 'console'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Terminal size={13} />
            <span>Console</span>
            {messages.length > 0 && (
              <span
                className="text-[10px] font-mono px-1 rounded ml-1"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {messages.length}
              </span>
            )}
          </button>

          <button
            data-testid="console-tab-problems"
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[4px] transition-colors ${
              activeTab === 'problems'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : compileError
                ? 'text-red-500 font-semibold hover:bg-red-500/10'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <AlertCircle size={13} className={compileError ? 'text-red-500' : 'text-[var(--text-muted)]'} />
            <span>Problems</span>
            {compileError && (
              <span className="text-[10px] font-mono bg-red-500/10 text-red-500 px-1.5 rounded ml-1 border border-red-500/20 font-semibold">
                1
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Clear Messages"
            aria-label="Clear Messages"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onToggle}
            className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Collapse Panel"
            aria-label="Collapse Panel"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {activeTab === 'console' && (
          <div data-testid="console-output" className="space-y-1">
            {messages.length > 0 ? (
              messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="select-none text-[10px]" style={{ color: 'var(--text-muted)' }}>{msg.timestamp}</span>
                  {msg.type === 'error' && <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />}
                  {msg.type === 'success' && <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />}
                  <span
                    className={`whitespace-pre-wrap break-all ${
                      msg.type === 'error'
                        ? 'text-red-400 font-medium'
                        : msg.type === 'success'
                        ? 'text-emerald-400'
                        : msg.type === 'warn'
                        ? 'text-amber-400'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {msg.text}
                  </span>
                </div>
              ))
            ) : (
              <div className="italic" style={{ color: 'var(--text-muted)' }}>No output messages. Click Compile or Run to start.</div>
            )}
          </div>
        )}

        {activeTab === 'problems' && (
          <div>
            {compileError ? (
              <div className="p-2.5 rounded-[4px] bg-red-500/10 border border-red-500/30 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-red-400 mb-1">Compilation Error</div>
                  <pre data-testid="problem-error-text" className="text-red-300 whitespace-pre-wrap font-mono text-xs leading-normal">
                    {compileError}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="italic" style={{ color: 'var(--text-muted)' }}>No problems detected in the design.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
