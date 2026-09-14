// ============================================================
// ObjectsPanel.tsx — Signal Objects Panel (Middle Column)
// Columns (Name / Value / Type) are now resizable via drag handles.
// ============================================================

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import type { VCDScope, VCDSignal } from '../../services/vcdParser';
import { getSignalValueAtTime } from '../../services/waveformRenderer';

export interface ObjectsPanelProps {
  activeScope: VCDScope | null;
  currentTime: number;
  waveSignalNames: string[];
  isCompiled?: boolean;
  hasSimulationData?: boolean;
  onAddSignals: (names: string[]) => void;
}

export function ObjectsPanel({
  activeScope, currentTime, waveSignalNames, isCompiled = false, hasSimulationData = false, onAddSignals,
}: ObjectsPanelProps) {
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [lastSelected, setLastSelected]       = useState<string | null>(null);

  const signals: VCDSignal[] = (hasSimulationData && isCompiled && activeScope)
    ? Object.values(activeScope.signals)
    : [];

  const handleSelect = (e: React.MouseEvent, sig: VCDSignal) => {
    e.stopPropagation();
    if (e.shiftKey && lastSelected) {
      const allNames = signals.map(s => s.name);
      const i1 = allNames.indexOf(lastSelected);
      const i2 = allNames.indexOf(sig.name);
      const range = allNames.slice(Math.min(i1, i2), Math.max(i1, i2) + 1);
      setSelectedObjects(prev => Array.from(new Set([...prev, ...range])));
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedObjects(prev =>
        prev.includes(sig.name) ? prev.filter(n => n !== sig.name) : [...prev, sig.name]
      );
      setLastSelected(sig.name);
    } else {
      setSelectedObjects([sig.name]);
      setLastSelected(sig.name);
    }
  };

  const handleAddSelected = () => { onAddSignals(selectedObjects); setSelectedObjects([]); };
  const handleAddOne = (e: React.MouseEvent, sigName: string) => {
    e.stopPropagation();
    if (!waveSignalNames.includes(sigName)) onAddSignals([sigName]);
  };

  return (
    <div
      className="flex flex-col shrink-0 h-full select-none min-w-0"
      style={{
        backgroundColor: 'var(--bg-panel)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Dynamic Action Bar (only visible when multiple objects are selected) */}
      {selectedObjects.length > 0 && (
        <div
          className="h-7 border-b flex items-center justify-between px-2.5 shrink-0"
          style={{
            backgroundColor: 'var(--accent-subtle)',
            borderColor: 'var(--accent-border)',
          }}
        >
          <span className="text-[10px] font-mono text-[var(--accent-primary)] font-semibold">
            {selectedObjects.length} selected
          </span>
          <button
            onClick={handleAddSelected}
            className="text-[10px] bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-2 py-0.5 rounded font-medium shadow-xs transition-colors"
          >
            + Add to Wave
          </button>
        </div>
      )}

      {/* Signal rows or Empty state */}
      {signals.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none"
          style={{ backgroundColor: 'var(--bg-panel)' }}
        >
          <Layers size={24} className="mb-2.5 opacity-30 text-blue-400" />
          <p className="font-semibold text-slate-300 mb-1 text-xs">No signals loaded</p>
          <p className="text-[11px] text-slate-500 max-w-[210px] leading-relaxed">
            Compile an HDL project or import a VCD file to inspect design signals.
          </p>
        </div>
      ) : (
        <>
          {/* ── Responsive Column Header Row ── */}
          <div
            className="grid grid-cols-[minmax(80px,1.5fr)_minmax(50px,1fr)_minmax(50px,1fr)] border-b text-[10px] font-bold tracking-wider uppercase h-6 shrink-0 px-2 items-center gap-1.5"
            style={{
              backgroundColor: 'var(--bg-panel-header)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <div className="truncate">Name</div>
            <div className="truncate">Value</div>
            <div className="truncate">Type</div>
          </div>

          {/* ── Responsive Signal Rows ── */}
          <div
            className="flex-1 overflow-auto text-slate-200 font-mono text-[11px] py-0.5"
            style={{ backgroundColor: 'var(--bg-panel)' }}
          >
            {signals.map((sig, idx) => {
              const isSelected = selectedObjects.includes(sig.name);
              return (
                <div
                  key={idx}
                  onClick={e => handleSelect(e, sig)}
                  className={`grid grid-cols-[minmax(80px,1.5fr)_minmax(50px,1fr)_minmax(50px,1fr)] items-center px-2 h-7 border-b group cursor-pointer gap-1.5 transition-colors ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/30'
                      : 'hover:bg-[var(--bg-hover)] border-[var(--border-subtle)]/40'
                  }`}
                >
                  {/* Name */}
                  <div className="flex items-center gap-1 min-w-0 overflow-hidden" title={sig.name}>
                    {sig.width > 1 ? (
                      <div className="w-1.5 h-1.5 rounded-xs bg-purple-400 shrink-0" />
                    ) : (
                      <div className="w-1.5 h-1.5 rotate-45 bg-cyan-400 shrink-0" />
                    )}
                    <span className="truncate text-slate-200 group-hover:text-blue-300 font-medium">
                      {sig.name.split('.').pop()}
                    </span>
                    {sig.width > 1 && (
                      <span className="text-[9px] text-slate-500 shrink-0">[{sig.width - 1}:0]</span>
                    )}
                  </div>

                  {/* Value */}
                  <div className="min-w-0 overflow-hidden font-semibold text-yellow-300 truncate text-[11px] tabular-nums">
                    {getSignalValueAtTime(sig, currentTime)}
                  </div>

                  {/* Type & Quick Add */}
                  <div className="flex items-center justify-between min-w-0 overflow-hidden text-slate-400 text-[10px] uppercase">
                    <span className="truncate">{sig.type}</span>
                    <button
                      onClick={e => handleAddOne(e, sig.name)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded text-[9px] cursor-pointer shadow-xs transition-opacity ml-1 font-sans"
                      title="Add to Waveform"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
