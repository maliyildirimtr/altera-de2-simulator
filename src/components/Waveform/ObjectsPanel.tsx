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
    <div className="border-r border-[#1e293b] flex flex-col bg-[#0c0d0e] shrink-0 h-full select-none min-w-0">
      {/* Header */}
      <div className="h-7 bg-[#0a1120] border-b border-[#1e293b] flex items-center justify-between px-2.5 shrink-0">
        <span className="text-xs font-bold text-slate-300 tracking-wide uppercase text-[10px]">Objects</span>
        {selectedObjects.length > 0 && (
          <button
            onClick={handleAddSelected}
            className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded font-medium shadow-sm transition-colors"
          >
            + Add {selectedObjects.length} to Wave
          </button>
        )}
      </div>

      {/* Signal rows or Empty state */}
      {signals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs bg-[#0c0d0e] select-none">
          <Layers size={26} className="mb-2.5 opacity-30 text-blue-400" />
          <p className="font-semibold text-slate-300 mb-1 text-xs">No signals loaded</p>
          <p className="text-[11px] text-slate-500 max-w-[210px] leading-relaxed">
            Compile an HDL project or import a VCD file to inspect design signals.
          </p>
        </div>
      ) : (
        <>
          {/* ── Responsive Column Header Row ── */}
          <div className="grid grid-cols-[minmax(80px,1.5fr)_minmax(50px,1fr)_minmax(50px,1fr)] bg-[#090e1a] border-b border-[#1e293b] text-[10px] font-bold tracking-wider text-slate-400 uppercase h-6 shrink-0 px-2 items-center gap-1.5">
            <div className="truncate">Name</div>
            <div className="truncate">Value</div>
            <div className="truncate">Type</div>
          </div>

          {/* ── Responsive Signal Rows ── */}
          <div className="flex-1 overflow-auto text-gray-200 font-mono text-[12px] py-0.5 bg-[#0c0d0e]">
            {signals.map((sig, idx) => {
              const isSelected = selectedObjects.includes(sig.name);
              return (
                <div
                  key={idx}
                  onClick={e => handleSelect(e, sig)}
                  className={`grid grid-cols-[minmax(80px,1.5fr)_minmax(50px,1fr)_minmax(50px,1fr)] items-center px-2 h-7 hover:bg-[#1e3a5f]/40 border-b border-[#1e293b]/40 group cursor-pointer gap-1.5 transition-colors ${
                    isSelected ? 'bg-blue-950/40 border-blue-500/40' : ''
                  }`}
                >
                  {/* Name */}
                  <div className="flex items-center gap-1 min-w-0 overflow-hidden" title={sig.name}>
                    {sig.width > 1 ? (
                      <div className="w-1.5 h-1.5 rounded-sm bg-purple-500 shrink-0" />
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
                  <div className="min-w-0 overflow-hidden font-bold text-yellow-300 truncate text-[11px]">
                    {getSignalValueAtTime(sig, currentTime)}
                  </div>

                  {/* Type & Quick Add */}
                  <div className="flex items-center justify-between min-w-0 overflow-hidden text-slate-400 text-[10px] uppercase">
                    <span className="truncate">{sig.type}</span>
                    <button
                      onClick={e => handleAddOne(e, sig.name)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] cursor-pointer shadow-sm transition-opacity ml-1 font-sans"
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
