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
        backgroundColor: 'var(--bg-app)',
        borderTop: '1px solid var(--border-subtle)',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        overflow: 'hidden',
      }}
    >
      {/* Console Tab Bar */}
      <div
        style={{
          height: '32px',
          backgroundColor: 'var(--bg-panel-header)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '100%' }}>
          <button
            data-testid="tab-console"
            onClick={() => setActiveTab('console')}
            style={{
              padding: '4px 10px',
              background: activeTab === 'console' ? 'var(--bg-panel)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'console' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'console' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'console' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.78rem',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Terminal size={14} />
            <span>Output</span>
          </button>
          <button
            data-testid="tab-problems"
            onClick={() => setActiveTab('problems')}
            style={{
              padding: '4px 10px',
              background: activeTab === 'problems' ? 'var(--bg-panel)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'problems' ? '2px solid #ef4444' : '2px solid transparent',
              color: activeTab === 'problems' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'problems' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.78rem',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={14} className="text-amber-400" />
            <span>Problems</span>
            {errorMessages.length > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.65rem',
                  borderRadius: '10px',
                  padding: '1px 5px',
                  fontWeight: 700,
                }}
              >
                {errorMessages.length}
              </span>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={onClear}
            title="Clear Console"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '2px 6px',
            }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            title="Close Panel"
            aria-label="Close Console"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
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
