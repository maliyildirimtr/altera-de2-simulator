import React, { useState } from 'react';
import type { LearningExample } from '../../examples/types';

type TabType = 'source' | 'testbench' | 'de2';

interface SourcePreviewModalProps {
  example: LearningExample | null;
  onClose: () => void;
}

export const SourcePreviewModal: React.FC<SourcePreviewModalProps> = ({ example, onClose }) => {
  // Hooks run before any early return. Projects.tsx keeps this modal mounted
  // with example={null} while the preview is closed, so returning early above
  // these would change the hook count between renders and React would throw.
  const [activeTab, setActiveTab] = useState<TabType>('source');
  const [copied, setCopied] = useState(false);

  if (!example) return null;

  const tabs: { id: TabType; label: string; filename: string; code: string }[] = [
    {
      id: 'source',
      label: 'HDL Source',
      filename: example.source.filename,
      code: example.source.code,
    },
  ];

  if (example.testbench) {
    tabs.push({
      id: 'testbench',
      label: 'Testbench',
      filename: example.testbench.filename,
      code: example.testbench.code,
    });
  }

  if (example.de2) {
    tabs.push({
      id: 'de2',
      label: 'DE2 Wrapper',
      filename: example.de2.filename,
      code: example.de2.source,
    });
  }

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentTab.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = currentTab.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = currentTab.code.split('\n');

  return (
    <div
      data-testid="source-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[88vh] border rounded-xl shadow-2xl overflow-hidden font-sans"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--bg-panel-header)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-3">
            <h3
              className="text-base font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {example.title}
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded font-mono border"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {currentTab.filename}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              data-testid="source-preview-copy-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-500 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              data-testid="source-preview-close-btn"
              onClick={onClose}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="Close Preview"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex items-center gap-1 px-6 pt-2 border-b"
          style={{
            backgroundColor: 'var(--bg-panel-header)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                data-testid={`source-preview-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-subtle)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-subtle)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-75 font-normal">({tab.filename})</span>
              </button>
            );
          })}
        </div>

        {/* Code Content Area */}
        <div
          className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed select-text"
          style={{
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="min-w-full inline-block">
            {lines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-[var(--accent-subtle)] px-2 rounded">
                <span
                  className="w-10 text-right pr-4 select-none font-mono text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div
          className="flex items-center justify-between px-6 py-2.5 border-t text-[11px]"
          style={{
            backgroundColor: 'var(--bg-panel-header)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="flex items-center gap-4">
            <span>Module: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{example.topModule}</strong></span>
            <span>Lines: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{lines.length}</strong></span>
            <span className="capitalize">Category: <strong style={{ color: 'var(--text-primary)' }}>{example.category}</strong></span>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>
            SystemVerilog 2012
          </div>
        </div>
      </div>
    </div>
  );
};
