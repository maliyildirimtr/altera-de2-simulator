// ============================================================
// ObjectsPanel.tsx — Signal Objects Panel (Middle Column)
// Columns (Name / Value / Type) are now resizable via drag handles.
// ============================================================

import React, { useState } from 'react';
import type { VCDScope, VCDSignal } from '../../services/vcdParser';
import { getSignalValueAtTime } from '../../services/waveformRenderer';
import { useResizableColumns } from '../../hooks/useResizableColumns';

export interface ObjectsPanelProps {
  activeScope: VCDScope | null;
  currentTime: number;
  waveSignalNames: string[];
  onAddSignals: (names: string[]) => void;
}

export function ObjectsPanel({
  activeScope, currentTime, waveSignalNames, onAddSignals,
}: ObjectsPanelProps) {
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [lastSelected, setLastSelected]       = useState<string | null>(null);

  // ── Resizable columns: [Name, Value] widths in px ──────
  // Type column takes remaining space (flex-1) automatically.
  const { widths, getHandleProps } = useResizableColumns([120, 70, 70]);
  const [nameW, valW] = widths;

  const signals: VCDSignal[] = activeScope ? Object.values(activeScope.signals) : [];

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

  // Shared column cell style
  const cell = (extra = '') =>
    `shrink-0 overflow-hidden truncate px-1 ${extra}`;

  return (
    <div className="border-r border-[#999999] flex flex-col bg-[#0c0d0e] shrink-0 h-full select-none">
      {/* Header */}
      <div className="h-6 bg-[#0c0d0e] border-b border-[#333333] flex items-center justify-between px-2 shrink-0">
        <span className="text-xs font-bold text-gray-300">Objects</span>
        {selectedObjects.length > 0 && (
          <button
            onClick={handleAddSelected}
            className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded"
          >
            + Add {selectedObjects.length} to Wave
          </button>
        )}
      </div>

      {/* ── Column header row with drag handles ── */}
      <div className="flex bg-[#0c0d0e] border-b border-[#333333] text-xs font-bold text-gray-400 h-5 shrink-0 relative">
        {/* Name col */}
        <div className={cell('flex items-center')} style={{ width: nameW }}>Name</div>

        {/* Splitter 1 */}
        <div
          className="w-[3px] shrink-0 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 bg-[#333] z-10 transition-colors"
          {...getHandleProps(0)}
        />

        {/* Value col */}
        <div className={cell('flex items-center')} style={{ width: valW }}>Value</div>

        {/* Splitter 2 */}
        <div
          className="w-[3px] shrink-0 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 bg-[#333] z-10 transition-colors"
          {...getHandleProps(1)}
        />

        {/* Type col */}
        <div className={cell('flex-1 flex items-center')} style={{ minWidth: 40 }}>Type</div>
      </div>

      {/* Signal rows */}
      <div className="flex-1 overflow-auto text-gray-200 font-mono text-[13px] py-1 bg-[#0c0d0e]">
        {signals.map((sig, idx) => {
          const isSelected = selectedObjects.includes(sig.name);
          return (
            <div
              key={idx}
              onClick={e => handleSelect(e, sig)}
              className={`flex items-center hover:bg-[#1e3a5f] border-b border-[#222222] group cursor-pointer ${isSelected ? 'bg-[#2a3f5f]' : ''}`}
              style={{ height: 28 }}
            >
              {/* Name */}
              <div className="flex items-center gap-1 overflow-hidden px-1" style={{ width: nameW }} title={sig.name}>
                {sig.width > 1 ? (
                  <div className="w-1.5 h-1.5 rounded-sm bg-purple-500 shrink-0 mx-0.5" />
                ) : (
                  <div className="w-1.5 h-1.5 rotate-45 bg-cyan-400 shrink-0 mx-0.5" />
                )}
                <span className="truncate">{sig.name.split('.').pop()}</span>
                {sig.width > 1 && (
                  <span className="text-[10px] text-gray-500 shrink-0 ml-0.5">[{sig.width - 1}:0]</span>
                )}
              </div>

              <div className="w-[3px] shrink-0 bg-[#222]" />

              {/* Value */}
              <div className="overflow-hidden px-1 font-bold text-yellow-300 truncate" style={{ width: valW }}>
                {getSignalValueAtTime(sig, currentTime)}
              </div>

              <div className="w-[3px] shrink-0 bg-[#222]" />

              {/* Type */}
              <div className="flex-1 flex items-center justify-between overflow-hidden px-1 text-gray-500 text-[11px] uppercase min-w-0">
                <span className="truncate">{sig.type}</span>
                <button
                  onClick={e => handleAddOne(e, sig.name)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] cursor-pointer shadow-sm transition-opacity ml-1"
                  title="Add to Waveform"
                >
                  + Add
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
