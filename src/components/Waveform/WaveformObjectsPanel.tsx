import React, { useState, useMemo } from 'react';
import { Layers, Search, X } from 'lucide-react';
import type { VCDScope, VCDSignal } from '../../services/vcdParser';
import { ObjectsPanel } from './ObjectsPanel';

export interface WaveformObjectsPanelProps {
  width: number;
  activeScope: VCDScope | null;
  currentTime: number;
  waveSignalNames: string[];
  isCompiled?: boolean;
  hasSimulationData?: boolean;
  onAddSignals: (names: string[]) => void;
  onClose?: () => void;
}

export const WaveformObjectsPanel: React.FC<WaveformObjectsPanelProps> = ({
  width,
  activeScope,
  currentTime,
  waveSignalNames,
  isCompiled = true,
  hasSimulationData = true,
  onAddSignals,
  onClose,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const totalSignalCount = activeScope ? Object.keys(activeScope.signals).length : 0;

  // Filter signals by search query without mutating engine data
  const filteredScope = useMemo<VCDScope | null>(() => {
    if (!activeScope) return null;
    if (!filterQuery.trim()) return activeScope;

    const q = filterQuery.toLowerCase();
    const filteredSignals: Record<string, VCDSignal> = {};

    Object.entries(activeScope.signals).forEach(([name, sig]) => {
      if (name.toLowerCase().includes(q)) {
        filteredSignals[name] = sig;
      }
    });

    return {
      ...activeScope,
      signals: filteredSignals,
    };
  }, [activeScope, filterQuery]);

  return (
    <aside
      data-testid="wf-objects-panel"
      className="shrink-0 flex flex-col bg-[#0c0d0e] border-r border-[#1e293b] select-none overflow-hidden h-full z-10"
      style={{ width }}
    >
      {/* ── Header with Title, Badge, and Close Button ──────────── */}
      <div className="h-8 px-2.5 bg-[#0a1120] border-b border-[#1e293b] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers size={13} className="text-blue-400 shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">
            Signals & Objects
          </span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#1e293b] text-slate-400 rounded font-mono shrink-0">
            {totalSignalCount}
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            title="Collapse Objects Panel (Alt+O)"
            className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Search filter input ─────────────────────────────────── */}
      <div className="p-1.5 bg-[#0f172a] border-b border-[#1e293b]">
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter signals..."
            className="w-full bg-[#0a1120] text-slate-200 text-xs pl-6 pr-6 py-1 rounded border border-[#1e293b] focus:border-blue-500/80 focus:outline-none placeholder:text-slate-600 font-mono"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-1.5 text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Wrapped ObjectsPanel ────────────────────────────────── */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ObjectsPanel
          activeScope={filteredScope}
          currentTime={currentTime}
          waveSignalNames={waveSignalNames}
          isCompiled={isCompiled}
          hasSimulationData={hasSimulationData}
          onAddSignals={onAddSignals}
        />
      </div>
    </aside>
  );
};
