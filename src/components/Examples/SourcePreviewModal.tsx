import React, { useState } from 'react';
import type { LearningExample } from '../../examples/types';

interface SourcePreviewModalProps {
  example: LearningExample | null;
  onClose: () => void;
}

export const SourcePreviewModal: React.FC<SourcePreviewModalProps> = ({ example, onClose }) => {
  if (!example) return null;

  type TabType = 'source' | 'testbench' | 'de2';
  const [activeTab, setActiveTab] = useState<TabType>('source');
  const [copied, setCopied] = useState(false);

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
        className="relative flex flex-col w-full max-w-4xl max-h-[88vh] bg-[#0c1322] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090f1c]">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-slate-100 tracking-tight">
              {example.title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
              {currentTab.filename}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              data-testid="source-preview-copy-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              data-testid="source-preview-close-btn"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Close Preview"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-2 border-b border-slate-800/80 bg-[#090f1c]/60">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                data-testid={`source-preview-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] text-slate-500 font-normal">({tab.filename})</span>
              </button>
            );
          })}
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-auto bg-[#070b14] p-4 font-mono text-xs text-slate-300 leading-relaxed select-text">
          <div className="min-w-full inline-block">
            {lines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-slate-800/20 px-2 rounded">
                <span className="w-10 text-right pr-4 text-slate-600 select-none font-mono text-[11px]">
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#090f1c] border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span>Module: <strong className="text-slate-200 font-mono">{example.topModule}</strong></span>
            <span>Lines: <strong className="text-slate-200 font-mono">{lines.length}</strong></span>
            <span className="capitalize">Category: <strong className="text-slate-200">{example.category}</strong></span>
          </div>
          <div className="text-slate-500">
            SystemVerilog 2012
          </div>
        </div>
      </div>
    </div>
  );
};
