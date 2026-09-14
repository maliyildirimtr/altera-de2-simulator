import React, { useState, useEffect } from 'react';
import { Terminal, AlertTriangle, XCircle, X } from 'lucide-react';

interface SchematicConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  stdout: string;
  stderr: string;
  error: string | null;
  onClear: () => void;
}

export const SchematicConsole: React.FC<SchematicConsoleProps> = ({
  isOpen,
  onClose,
  stdout,
  stderr,
  error,
  onClear,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'problems'>(error ? 'problems' : 'console');

  useEffect(() => {
    if (error) {
      setActiveTab('problems');
    }
  }, [error]);

  if (!isOpen) return null;

  // Split stderr/error into readable issues
  const rawIssues = (error ? error.split('\n').map((l) => l.trim()) : []).concat(
    stderr
      ? stderr
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && (l.includes('ERROR') || l.includes('syntax error') || l.includes('failed')))
      : []
  );
  const errorMessages = Array.from(new Set(rawIssues.filter((l) => l.length > 0)));

  return (
    <div
      data-testid="schematic-console"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-input)',
        borderTop: '1px solid var(--border-subtle)',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        overflow: 'hidden',
        color: 'var(--text-primary)',
      }}
    >
      {/* Console Tab Bar */}
      <div
        className="h-8 px-3 flex items-center justify-between shrink-0 border-b select-none"
        style={{
          backgroundColor: 'var(--bg-panel-header)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-1">
          <button
            data-testid="tab-console"
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[4px] transition-colors ${
              activeTab === 'console'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Terminal size={12} />
            <span>Output</span>
          </button>
          <button
            data-testid="tab-problems"
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[4px] transition-colors ${
              activeTab === 'problems'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : errorMessages.length > 0
                ? 'text-red-500 font-semibold hover:bg-red-500/10'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <AlertTriangle size={12} className={errorMessages.length > 0 ? 'text-red-500' : 'text-[var(--text-muted)]'} />
            <span>Problems</span>
            {errorMessages.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-red-500/10 text-red-500 rounded font-semibold border border-red-500/20">
                {errorMessages.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            title="Clear Console"
            className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors text-xs font-sans"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            title="Close Panel"
            aria-label="Close Console"
            className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal View / Problems View */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          lineHeight: '1.4',
        }}
      >
        {activeTab === 'console' ? (
          <div>
            {stdout ? (
              <span style={{ color: 'var(--text-primary)' }}>{stdout}</span>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Console initialized. Synthesizer logs will stream here.
              </span>
            )}
            {stderr && (
              <div style={{ color: '#ef4444', marginTop: '6px' }}>
                [STDERR]: {stderr}
              </div>
            )}
          </div>
        ) : errorMessages.length > 0 ? (
          <div data-testid="problems-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {errorMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  borderLeft: '3px solid #ef4444',
                }}
              >
                <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{msg}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No errors detected. Synthesis succeeded or waiting for input.
          </div>
        )}
      </div>
    </div>
  );
};
