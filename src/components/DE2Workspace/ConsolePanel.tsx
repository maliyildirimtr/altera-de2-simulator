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
        className="h-8 bg-[#0a1120] border-t border-[#1e293b] px-3 flex items-center justify-between text-xs text-slate-400 select-none shrink-0"
      >
        <div className="flex items-center gap-3">
          <button
            data-testid="console-tab-console"
            onClick={() => {
              setActiveTab('console');
              onToggle();
            }}
            className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
          >
            <Terminal size={13} />
            <span>Console</span>
            {messages.length > 0 && (
              <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.2 rounded text-slate-300">
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
            className={`flex items-center gap-1.5 hover:text-slate-200 transition-colors ${
              compileError ? 'text-red-400 font-semibold' : ''
            }`}
          >
            <AlertCircle size={13} className={compileError ? 'text-red-400' : 'text-slate-500'} />
            <span>Problems</span>
            {compileError && (
              <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded">
                1
              </span>
            )}
          </button>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
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
      style={{ height: height ?? 190 }}
      className="bg-[#080d18] flex flex-col shrink-0 select-none z-10 overflow-hidden"
    >
      {/* Header Tabs */}
      <div className="h-8 px-3 flex items-center justify-between border-b border-[#1e293b] bg-[#0a1120]">
        <div className="flex items-center gap-2">
          <button
            data-testid="console-tab-console"
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-t transition-colors ${
              activeTab === 'console'
                ? 'text-white border-b-2 border-blue-500 bg-white/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={13} />
            <span>Console</span>
            {messages.length > 0 && (
              <span className="text-[10px] font-mono bg-white/10 px-1 rounded text-slate-300 ml-1">
                {messages.length}
              </span>
            )}
          </button>

          <button
            data-testid="console-tab-problems"
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-t transition-colors ${
              activeTab === 'problems'
                ? 'text-white border-b-2 border-blue-500 bg-white/5'
                : compileError
                ? 'text-red-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle size={13} className={compileError ? 'text-red-400' : 'text-slate-500'} />
            <span>Problems</span>
            {compileError && (
              <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-1.5 rounded ml-1">
                1
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClear}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Clear Messages"
            aria-label="Clear Messages"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onToggle}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
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
                  <span className="text-slate-400 select-none text-[10px]">{msg.timestamp}</span>
                  {msg.type === 'error' && <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />}
                  {msg.type === 'success' && <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />}
                  <span
                    className={`whitespace-pre-wrap break-all ${
                      msg.type === 'error'
                        ? 'text-red-300'
                        : msg.type === 'success'
                        ? 'text-emerald-300'
                        : msg.type === 'warn'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {msg.text}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-slate-400 italic">No output messages. Click Compile or Run to start.</div>
            )}
          </div>
        )}

        {activeTab === 'problems' && (
          <div>
            {compileError ? (
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-red-400 mb-1">Compilation Error</div>
                  <pre data-testid="problem-error-text" className="text-red-200 whitespace-pre-wrap font-mono text-xs leading-normal">
                    {compileError}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic">No problems detected in the design.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
