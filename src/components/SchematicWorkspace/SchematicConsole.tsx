import React, { useState } from 'react';

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

  if (!isOpen) return null;

  const errorMessages: string[] = [];
  if (error) {
    errorMessages.push(error);
  }
  if (stderr.trim()) {
    const lines = stderr.split('\n').filter((l) => l.trim().length > 0);
    lines.forEach((l) => {
      if (!errorMessages.includes(l)) {
        errorMessages.push(l);
      }
    });
  }

  return (
    <div
      data-testid="schematic-console"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontSize: '0.82rem',
      }}
    >
      {/* Console Tab Header */}
      <div
        style={{
          padding: '0 10px',
          height: '32px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '4px', height: '100%', alignItems: 'center' }}>
          <button
            data-testid="tab-console"
            onClick={() => setActiveTab('console')}
            style={{
              padding: '4px 10px',
              background: activeTab === 'console' ? 'var(--bg-primary)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'console' ? '2px solid var(--accent-color)' : '2px solid transparent',
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
            <span>📟 Output</span>
          </button>
          <button
            data-testid="tab-problems"
            onClick={() => setActiveTab('problems')}
            style={{
              padding: '4px 10px',
              background: activeTab === 'problems' ? 'var(--bg-primary)' : 'transparent',
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
            <span>⚠️ Problems</span>
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
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Console Tab Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '0.78rem',
          lineHeight: 1.5,
          backgroundColor: '#0b0f19',
          color: '#e2e8f0',
        }}
      >
        {activeTab === 'console' ? (
          stdout.trim() ? (
            <pre data-testid="console-output" style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {stdout}
            </pre>
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic' }}>
              No synthesis output yet. Click Synthesize to run Yosys.
            </div>
          )
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
                <span>❌</span>
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{msg}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontStyle: 'italic' }}>
            No errors detected. Synthesis succeeded or waiting for input.
          </div>
        )}
      </div>
    </div>
  );
};
