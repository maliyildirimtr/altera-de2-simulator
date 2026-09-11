// ============================================================
// SignalNamePanel.tsx — Left waveform panel (Name + Value cols)
// Columns are now resizable via a drag handle between them.
// ============================================================


import type { MouseEvent as ReactMouseEvent } from 'react';
import type { VCDSignal } from '../../services/vcdParser';
import { getSignalValueAtTime, extractBitSignal } from '../../services/waveformRenderer';
import { findEdge } from '../../services/transitionSearch';
import { ChevronRight, ChevronDown, Binary } from 'lucide-react';
import { useResizableColumns } from '../../hooks/useResizableColumns';

export interface RenderableRow {
  type: 'signal' | 'bit';
  id: string;
  signal: VCDSignal;
  displayName: string;
  scopePath?: string;
  indent: number;
  bitIndex?: number;
  parentName?: string;
}

export interface SignalNamePanelProps {
  rows: RenderableRow[];
  currentTime: number;
  selectedSignal: string | null;
  onSelectSignal: (id: string | null) => void;
  onSetCurrentTime: (t: number) => void;
  onContextMenu: (e: ReactMouseEvent, name: string, type: 'radix' | 'remove') => void;
  onToggleBusExpand: (name: string) => void;
  expandedBusses: string[];
  radixes?: Record<string, 'hex' | 'dec' | 'bin'>;
  width?: number;
}

export function SignalNamePanel({
  rows,
  currentTime,
  selectedSignal,
  onSelectSignal,
  onSetCurrentTime,
  onContextMenu,
  onToggleBusExpand,
  expandedBusses,
  radixes = {},
  width,
}: SignalNamePanelProps) {

  // ── Resizable columns: [Name, Value] widths in px ─────────────
  const { widths, getHandleProps } = useResizableColumns([140, 75]);
  const [nameW, valW] = widths;

  const renderValue = (row: RenderableRow) => {
    if (row.type === 'bit') {
      const bitSig = extractBitSignal(row.signal, row.bitIndex!);
      const val = getSignalValueAtTime(bitSig, currentTime);
      return (
        <span className={val === '1' ? 'text-green-400' : val === '0' ? 'text-blue-400' : 'text-red-400'}>
          {val}
        </span>
      );
    }
    const val = getSignalValueAtTime(row.signal, currentTime);
    if (row.signal.width === 1) {
      return (
        <span className={val === '1' ? 'text-green-400' : val === '0' ? 'text-blue-400' : 'text-red-400'}>
          {val}
        </span>
      );
    }
    const r = radixes[row.signal.name] || 'hex';
    let formatted = String(val);
    const strVal = String(val);
    if (r === 'hex') {
      const num = typeof val === 'number' ? val : parseInt(strVal, 2);
      formatted = isNaN(num) ? 'h' + strVal : 'h' + num.toString(16).toUpperCase();
    } else if (r === 'dec') {
      const num = typeof val === 'number' ? val : parseInt(strVal, 2);
      formatted = isNaN(num) ? 'd' + strVal : 'd' + num.toString(10);
    } else {
      formatted = 'b' + strVal;
    }
    return <span className="text-yellow-400 font-semibold">{formatted}</span>;
  };

  const handleEdgeSearch = (e: ReactMouseEvent, row: RenderableRow, dir: 'prev' | 'next') => {
    e.stopPropagation();
    const sig = row.type === 'bit' ? extractBitSignal(row.signal, row.bitIndex!) : row.signal;
    const edgeTime = findEdge(sig, currentTime, dir);
    if (edgeTime !== null) onSetCurrentTime(edgeTime);
  };

  return (
    <div
      data-testid="wf-signal-name-panel"
      className="shrink-0 border-r border-[#222222] bg-[#1e1e1e] flex flex-col z-10 shadow-[2px_0_5px_rgba(0,0,0,0.5)]"
      style={{ width: width !== undefined ? width : nameW + 3 + valW }}
    >

      {/* ── Column Headers (Resizable) ── */}
      <div className="h-6 shrink-0 bg-[#16171d] border-b border-[#222222] flex text-[11px] font-semibold text-gray-400 select-none relative">
        {/* Name header */}
        <div className="flex items-center px-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase shrink-0" style={{ width: nameW }}>
          Signal
        </div>

        {/* Drag handle */}
        <div
          className="w-[3px] h-full shrink-0 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 bg-[#333] z-10 transition-colors"
          {...getHandleProps(0)}
        />

        {/* Value header */}
        <div className="flex-1 h-full flex items-center px-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase overflow-hidden">
          Value
        </div>
      </div>

      {/* ── Scrollable Rows ── */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 right-[-20px] overflow-y-scroll pr-[20px] pt-1">
          {rows.map((row, idx) => {
            const isSelected = selectedSignal === row.id;
            const isBus = row.type === 'signal' && row.signal.width > 1;
            const isExpanded = isBus && expandedBusses.includes(row.signal.name);

            return (
              <div
                key={idx}
                data-testid="wf-name-row"
                data-signal-id={row.id}
                className={`h-[40px] flex group border-b border-[#222222]/50 cursor-pointer transition-colors
                  ${isSelected ? 'bg-[#1e3a5f]/40' : 'hover:bg-[#2a2d3e]/30'}`}
                onClick={() => onSelectSignal(row.id)}
                onContextMenu={e => onContextMenu(e, row.type === 'bit' ? row.parentName! : row.signal.name, isBus ? 'radix' : 'remove')}
              >
                {/* ── Name Column ── */}
                <div
                  className="shrink-0 border-r border-[#222222] flex items-center px-2 overflow-hidden"
                  style={{ width: nameW, paddingLeft: `${row.indent + 8}px` }}
                  title={row.signal.name}
                >
                  <div className="flex items-center gap-1.5 w-full min-w-0">
                    {isBus ? (
                      <div
                        className="p-0.5 rounded hover:bg-white/10 text-gray-400 cursor-pointer shrink-0"
                        onClick={e => { e.stopPropagation(); onToggleBusExpand(row.signal.name); }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    ) : (
                      <div className="w-[18px] shrink-0" />
                    )}
                    <Binary size={12} className={`shrink-0 ${row.type === 'bit' ? 'text-gray-500' : 'text-blue-400'}`} />
                    <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1 min-w-0 leading-tight">
                        <span className={`text-[11px] font-mono truncate select-none ${row.type === 'bit' ? 'text-gray-400' : 'text-gray-200 font-semibold'}`}>
                          {row.displayName}
                        </span>
                        {row.type === 'signal' && row.signal.width > 1 && (
                          <span className="text-[10px] text-gray-500 font-mono shrink-0">
                            [{row.signal.width - 1}:0]
                          </span>
                        )}
                      </div>
                      {row.type === 'signal' && row.scopePath && (
                        <span className="text-[9px] font-mono text-slate-500 truncate leading-tight select-none">
                          {row.scopePath}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Splitter visual bar */}
                <div className="w-[3px] shrink-0 bg-[#222]" />

                {/* ── Value Column ── */}
                <div className="flex-1 flex items-center justify-between px-3 text-[12px] font-mono font-bold tracking-tight overflow-hidden">
                  <div className="truncate">
                    {renderValue(row)}
                  </div>
                  {/* Edge Navigation (on hover) */}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      className="p-1 rounded bg-[#2a2d3e] hover:bg-[#37373d] text-gray-400 hover:text-white border border-[#444] shadow-sm"
                      onClick={e => handleEdgeSearch(e, row, 'prev')}
                      title="Previous Edge"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                    <button
                      className="p-1 rounded bg-[#2a2d3e] hover:bg-[#37373d] text-gray-400 hover:text-white border border-[#444] shadow-sm"
                      onClick={e => handleEdgeSearch(e, row, 'next')}
                      title="Next Edge"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
