// ============================================================
// WaveformCanvas.tsx — SVG Waveform Drawing Canvas
//
// F2.3: VIEWPORT CULLING
//   useRef + onScroll → scrollLeft izlenir → visibleStart/End
//   hesaplanır → renderSignalWaveform'a viewport penceresi
//   geçirilir → yalnızca görünür geçişler SVG'e işlenir.
//   Buffer: viewport genişliğinin %30'u kadar her iki yanda.
//
// F2.4: MARKER SYSTEM
//   Ruler'a çift tıklayarak Marker (Yer İmi) eklenebilir.
//   Her marker: dikey renkli çizgi + etiket.
//   Etikete sağ tıklayınca context-menu → Remove.
// ============================================================

import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { AlertTriangle, Activity } from 'lucide-react';
import type { SimulationData } from '../../services/vcdParser';
import {
  renderSignalWaveform,
  extractBitSignal,
  formatTime,
  BASE_PIXELS_PER_UNIT, // F2.6: Base Scale
  type ViewportWindow,
} from '../../services/waveformRenderer';
import type { RenderableRow } from './SignalNamePanel';

// ── F2.4: Marker type ─────────────────────────────────────────
export interface WaveformMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

// ── Marker color palette ──────────────────────────────────────
const MARKER_COLORS = ['#a78bfa', '#f472b6', '#38bdf8', '#4ade80', '#fb923c', '#facc15'];
let markerColorCursor = 0;
function nextMarkerColor() {
  const c = MARKER_COLORS[markerColorCursor % MARKER_COLORS.length];
  markerColorCursor++;
  return c;
}

// ── Viewport buffer factor (30% of visible width each side) ──
const VP_BUFFER = 0.3;

export interface WaveformCanvasProps {
  simulationData: SimulationData | null;
  isSimRunning: boolean;
  compileStatus?: 'idle' | 'compiling' | 'success' | 'error';
  rows: RenderableRow[];
  selectedSignal: string | null;
  zoomLevel: number;
  rulerTicks: number[];
  currentTime: number;
  cursorB: number | null;
  hoverTime: number | null;
  radixes: Record<string, 'hex' | 'dec' | 'bin'>;
  markers: WaveformMarker[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onTimeChange: (t: number) => void;
  onCursorBChange: (t: number | null) => void;
  onHoverChange: (t: number | null) => void;
  onAddMarker: (marker: WaveformMarker) => void;
  onRemoveMarker: (id: string) => void;
}

export function WaveformCanvas({
  simulationData, isSimRunning, compileStatus = 'idle', rows, selectedSignal,
  zoomLevel, rulerTicks, currentTime, cursorB, hoverTime,
  radixes, markers, containerRef,
  onTimeChange, onCursorBChange, onHoverChange,
  onAddMarker, onRemoveMarker,
}: WaveformCanvasProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const setContainerRefs = useCallback((el: HTMLDivElement | null) => {
    (waveformRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (containerRef) {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  }, [containerRef]);

  // Track container width via ResizeObserver for responsive Zoom Fit
  useEffect(() => {
    const el = waveformRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // F2.3: Track scroll position for viewport culling
  const [scrollLeft, setScrollLeft] = useState(0);
  const handleScroll = useCallback(() => {
    setScrollLeft(waveformRef.current?.scrollLeft ?? 0);
  }, []);

  // F2.4: Marker context menu state
  const [markerMenu, setMarkerMenu] = useState<{
    x: number; y: number; id: string;
  } | null>(null);

  // F2.6: Scale factor calculation
  const scale = BASE_PIXELS_PER_UNIT * zoomLevel;

  // ── Mouse handlers ───────────────────────────────────────────
  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !simulationData) return;
    setMarkerMenu(null);
    const rect   = waveformRef.current.getBoundingClientRect();
    const clickX  = e.clientX - rect.left + waveformRef.current.scrollLeft;
    // Pikselleri tekrar zaman birimine (ps) çevir
    const time    = Math.max(0, Math.min(clickX / scale, simulationData.maxTime));
    if (e.shiftKey) {
      onCursorBChange(time);
    } else {
      onTimeChange(time);
    }
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !simulationData) return;
    const rect   = waveformRef.current.getBoundingClientRect();
    const mouseX  = e.clientX - rect.left + waveformRef.current.scrollLeft;
    onHoverChange(Math.max(0, Math.min(mouseX / scale, simulationData.maxTime)));
  };

  const handleMouseLeave = () => onHoverChange(null);

  // F2.4: Double-click on ruler → add marker
  const handleRulerDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !simulationData) return;
    e.stopPropagation();
    const rect   = waveformRef.current.getBoundingClientRect();
    const clickX  = e.clientX - rect.left + waveformRef.current.scrollLeft;
    const time    = Math.max(0, Math.min(clickX / scale, simulationData.maxTime));
    const label   = `M${markers.length + 1}`;
    onAddMarker({ id: crypto.randomUUID(), time, label, color: nextMarkerColor() });
  };

  // ── Early returns for empty and error states ──────────────
  if (compileStatus === 'error') {
    return (
      <div
        ref={setContainerRefs}
        data-testid="wf-canvas-container"
        className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair"
        style={{ backgroundColor: 'var(--bg-canvas-waveform, #080C14)' }}
      >
        <div data-testid="wf-error-state" className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3 text-rose-400 shadow-xs">
            <AlertTriangle size={20} />
          </div>
          <div className="text-slate-200 font-semibold text-sm mb-1">
            Compilation Failed
          </div>
          <div className="text-slate-400 text-xs max-w-sm font-sans">
            Fix the errors reported in the Problems tab below and recompile to generate waveforms.
          </div>
        </div>
      </div>
    );
  }

  if (compileStatus === 'compiling') {
    return (
      <div
        ref={setContainerRefs}
        data-testid="wf-canvas-container"
        className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair"
        style={{ backgroundColor: 'var(--bg-canvas-waveform, #080C14)' }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-2.5 select-none">
          <div className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          <span>Compiling HDL &amp; Generating VCD...</span>
        </div>
      </div>
    );
  }

  if (!simulationData || simulationData.maxTime <= 0) {
    return (
      <div
        ref={setContainerRefs}
        data-testid="wf-canvas-container"
        className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair select-none"
        style={{ backgroundColor: 'var(--bg-canvas-waveform, #080C14)' }}
      >
        {/* Inactive logic analyzer grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="h-6 border-b border-slate-800/40 bg-slate-900/30" />
          <div className="h-[40px] border-b border-slate-800/25" />
          <div className="h-[40px] border-b border-slate-800/25" />
          <div className="h-[40px] border-b border-slate-800/25" />
          <div className="h-[40px] border-b border-slate-800/25" />
          <div className="absolute top-0 bottom-0 left-1/4 border-l border-slate-800/30" />
          <div className="absolute top-0 bottom-0 left-2/4 border-l border-slate-800/30" />
          <div className="absolute top-0 bottom-0 left-3/4 border-l border-slate-800/30" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 text-blue-400 shadow-xs">
            <Activity size={20} />
          </div>
          <div className="text-slate-200 font-semibold text-sm mb-1">
            No Simulation Data
          </div>
          <div className="text-slate-400 text-xs max-w-sm font-sans leading-relaxed">
            Add HDL sources and a testbench in the Project panel, then click Compile to generate timing waveforms.
          </div>
        </div>
      </div>
    );
  }

  if (!isSimRunning) {
    return (
      <div
        ref={setContainerRefs}
        data-testid="wf-canvas-container"
        className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair"
        style={{ backgroundColor: 'var(--bg-canvas-waveform, #080C14)' }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 font-mono text-xs select-none">
          <div className="text-slate-200 font-semibold text-sm mb-1 font-sans">
            Simulation Compiled
          </div>
          <div className="text-slate-400 text-xs max-w-sm font-sans">
            Select signals from the Objects panel and click &apos;Run&apos; to view waveforms.
          </div>
        </div>
      </div>
    );
  }

  const ts          = simulationData.timescale;
  const maxTime     = simulationData.maxTime;
  const scaledWidth = Math.max(100, maxTime * scale);
  const totalWidth  = Math.max(containerWidth, scaledWidth);

  // ── F2.3: Compute viewport window ────────────────────────────
  const viewportWidth = waveformRef.current?.clientWidth ?? window.innerWidth * 0.5;
  const bufferPx      = viewportWidth * VP_BUFFER;
  const vpStart       = Math.max(0,       (scrollLeft - bufferPx) / scale);
  const vpEnd         = Math.min(maxTime, (scrollLeft + viewportWidth + bufferPx) / scale);
  const viewport: ViewportWindow = { startTime: vpStart, endTime: vpEnd };

  return (
    <>
      {/* F2.4: Marker context menu — rendered outside scroll container */}
      {markerMenu && (
        <div
          className="fixed z-[60] bg-[#1e1e1e] border border-[#555] shadow-xl py-1 rounded w-28"
          style={{ top: markerMenu.y, left: markerMenu.x }}
          onMouseLeave={() => setMarkerMenu(null)}
        >
          <div className="px-3 py-1 text-[10px] text-gray-400 border-b border-[#333] mb-1">Marker</div>
          <button
            className="w-full text-left px-3 py-1 text-xs text-red-400 hover:bg-[#2a2d3e]"
            onClick={() => { onRemoveMarker(markerMenu.id); setMarkerMenu(null); }}
          >Remove</button>
        </div>
      )}

      <div
        ref={setContainerRefs}
        data-testid="wf-canvas-container"
        className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair group"
        style={{ backgroundColor: 'var(--bg-canvas-waveform, #080C14)' }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onScroll={handleScroll}  // F2.3: track scroll
      >
        <div className="relative h-full min-w-full" style={{ width: totalWidth }}>

          {/* ── Top Ruler (ΔT badge + tick marks + double-click markers) ── */}
          <div
            className="absolute top-0 left-0 right-0 h-6 border-b"
            style={{
              backgroundColor: 'rgba(10, 16, 30, 0.95)',
              borderColor: 'rgba(51, 65, 85, 0.35)',
            }}
            onDoubleClick={handleRulerDoubleClick}  // F2.4
          >
            {/* ΔT indicator */}
            {cursorB !== null && (
              <div
                className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none"
                style={{
                  left:  Math.min(currentTime, cursorB) * scale,
                  width: Math.abs(cursorB - currentTime) * scale,
                }}
              >
                <div className="bg-amber-500/90 text-white text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap shadow-xs">
                  ΔT = {formatTime(Math.abs(cursorB - currentTime), ts)}
                </div>
              </div>
            )}
            {/* Ruler ticks */}
            {rulerTicks.map(t => (
              <div key={t}
                className="absolute top-0 bottom-0 border-l pointer-events-none"
                style={{ left: t * scale, borderColor: 'rgba(148, 163, 184, 0.25)' }}
              >
                <span className="text-[9px] text-slate-400 font-mono ml-1 top-1 absolute tabular-nums">
                  {formatTime(t, ts)}
                </span>
              </div>
            ))}
            {/* F2.4: Marker pins on ruler */}
            {markers.map(mk => (
              <div key={mk.id}
                className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-auto z-30"
                style={{ left: mk.time * scale }}
              >
                <div
                  className="absolute top-0 flex items-center cursor-pointer select-none"
                  onContextMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMarkerMenu({ x: e.clientX, y: e.clientY, id: mk.id });
                  }}
                >
                  <div
                    className="text-[10px] font-bold px-1 py-0.5 rounded-sm shadow-xs whitespace-nowrap leading-none font-mono"
                    style={{ backgroundColor: mk.color, color: '#000' }}
                  >
                    {mk.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Vertical tick lines (full height subtle grid) ───────── */}
          <div className="absolute top-6 bottom-6 left-0 right-0 pointer-events-none">
            {rulerTicks.map(t => (
              <div key={t}
                className="absolute top-0 bottom-0 border-l"
                style={{ left: t * scale, borderColor: 'rgba(148, 163, 184, 0.08)' }}
              />
            ))}
          </div>

          {/* ── Row background highlights ────────────────────────────── */}
          <div className="absolute top-6 bottom-6 left-0 right-0 pointer-events-none pt-1">
            {rows.map((row, idx) => (
              <div key={idx}
                data-testid="wf-row-highlight"
                className={`h-[40px] w-full border-b ${
                  selectedSignal === row.id
                    ? 'bg-blue-600/15 border-blue-500/25'
                    : 'border-slate-800/30'
                }`}
              />
            ))}
          </div>

          {/* ── SVG Waveforms (F2.3: viewport-culled) ───────────────── */}
          <div className="absolute top-6 bottom-6 left-0 right-0 pt-1">
            {rows.map((row, idx) => {
              const sig = row.type === 'bit'
                ? extractBitSignal(row.signal, row.bitIndex!)
                : row.signal;
              return (
                <div key={idx} className="h-[40px] relative w-full pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full overflow-visible">
                    {renderSignalWaveform(
                      sig,
                      maxTime,
                      zoomLevel,
                      radixes[row.signal.name] || 'hex',
                      viewport,   // F2.3: only draw visible transitions
                    )}
                  </svg>
                </div>
              );
            })}
          </div>

          {/* ── F2.4: Marker vertical lines (full height, below ruler) ─ */}
          {markers.map(mk => (
            <div key={mk.id}
              className="absolute top-6 bottom-6 pointer-events-none z-25"
              style={{
                left:           mk.time * scale,
                borderLeft:     `1.5px dashed ${mk.color}`,
              }}
            />
          ))}

          {/* ── Hover ghost cursor ──────────────────────────────────── */}
          {hoverTime !== null && (
            <div
              className="absolute top-0 bottom-6 border-l border-white/20 z-10 pointer-events-none"
              style={{ left: hoverTime * scale }}
            >
              <div className="absolute -top-1 -translate-x-1/2 bg-slate-900/90 text-slate-300 text-[9px] px-1 py-0.5 rounded border border-slate-700 whitespace-nowrap font-mono tabular-nums">
                {formatTime(hoverTime, ts)}
              </div>
            </div>
          )}

          {/* ── Cursor B (orange) — Shift+Click ─────────────────────── */}
          {cursorB !== null && (
            <div
              className="absolute top-0 bottom-0 border-l border-amber-500 z-20 pointer-events-none transition-all duration-75 ease-out"
              style={{ left: cursorB * scale }}
            >
              <div className="absolute top-[2px] -translate-x-1/2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 font-mono font-bold whitespace-nowrap rounded-sm shadow-xs flex items-center gap-1">
                <span>B</span>
                <span className="tabular-nums">{formatTime(cursorB, ts)}</span>
                <button
                  className="pointer-events-auto text-white/70 hover:text-white leading-none ml-0.5"
                  onClick={e => { e.stopPropagation(); onCursorBChange(null); }}
                  title="Clear Cursor B"
                >×</button>
              </div>
            </div>
          )}

          {/* ── Cursor A (yellow) ────────────────────────────────────── */}
          <div
            className="absolute top-0 bottom-0 border-l border-yellow-400 z-20 pointer-events-none transition-all duration-75 ease-out"
            style={{ left: currentTime * scale }}
          >
            <div className="absolute top-[2px] -translate-x-1/2 bg-yellow-400 text-black text-[10px] px-1.5 py-0.5 font-mono font-bold whitespace-nowrap rounded-sm shadow-xs tabular-nums">
              {formatTime(currentTime, ts)}
            </div>
          </div>

          {/* ── Bottom Ruler (Restrained technical timeline) ─────────── */}
          <div
            className="absolute bottom-0 left-0 right-0 h-6 border-t"
            style={{
              backgroundColor: 'rgba(10, 16, 30, 0.95)',
              borderColor: 'rgba(51, 65, 85, 0.35)',
            }}
          >
            {rulerTicks.map((t, i) => {
              const showLabel = zoomLevel < 0.5 ? i % 4 === 0 : zoomLevel < 1 ? i % 2 === 0 : true;
              return (
                <React.Fragment key={t}>
                  <div
                    className="absolute top-0 h-2 border-l"
                    style={{ left: t * scale, borderColor: 'rgba(148, 163, 184, 0.25)' }}
                  />
                  {showLabel && (
                    <div
                      className="absolute top-1 text-slate-400 text-[9px] font-mono whitespace-nowrap tabular-nums"
                      style={{ left: t * scale + 2 }}
                    >
                      {formatTime(t, ts)}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {/* F2.4: Marker ticks on bottom ruler */}
            {markers.map(mk => (
              <div key={mk.id}
                className="absolute top-0 h-full flex items-center"
                style={{ left: mk.time * scale + 2 }}
              >
                <span
                  className="text-[9px] font-bold font-mono"
                  style={{ color: mk.color }}
                >
                  {mk.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
