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
      className="shrink-0 flex flex-col select-none overflow-hidden h-full z-10 min-w-0 border-r"
      style={{
        width,
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      {/* ── Header with Title, Badge, and Close Button ──────────── */}
      <div
        className="h-9 px-3 border-b flex items-center justify-between shrink-0"
        style={{
          backgroundColor: 'var(--bg-panel-header)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers size={13} className="text-blue-500 shrink-0" />
          <span
            className="text-[11px] font-bold uppercase tracking-wider truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            Signals & Objects
          </span>
          <span
            className="text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            {totalSignalCount}
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            title="Collapse Objects Panel (Alt+O)"
            className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Search filter input ─────────────────────────────────── */}
      <div
        className="p-2 border-b"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter signals..."
            className="w-full text-xs pl-7 pr-6 py-1 rounded-[4px] border font-mono transition-colors"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-1.5 p-0.5 hover:text-[var(--text-primary)]"
              style={{ color: 'var(--text-muted)' }}
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
