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

import React, { useRef, useState, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
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
  rows: RenderableRow[];
  selectedSignal: string | null;
  zoomLevel: number;
  rulerTicks: number[];
  currentTime: number;
  cursorB: number | null;
  hoverTime: number | null;
  radixes: Record<string, 'hex' | 'dec' | 'bin'>;
  markers: WaveformMarker[];
  onTimeChange: (t: number) => void;
  onCursorBChange: (t: number | null) => void;
  onHoverChange: (t: number | null) => void;
  onAddMarker: (marker: WaveformMarker) => void;
  onRemoveMarker: (id: string) => void;
}

export function WaveformCanvas({
  simulationData, isSimRunning, rows, selectedSignal,
  zoomLevel, rulerTicks, currentTime, cursorB, hoverTime,
  radixes, markers,
  onTimeChange, onCursorBChange, onHoverChange,
  onAddMarker, onRemoveMarker,
}: WaveformCanvasProps) {
  const waveformRef = useRef<HTMLDivElement>(null);

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

  // ── Early returns for empty states ──────────────────────────
  if (!simulationData) {
    return (
      <div className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-mono text-sm bg-black">
          Load a project and click Compile to begin.
        </div>
      </div>
    );
  }

  if (!isSimRunning) {
    return (
      <div className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-mono text-sm bg-black">
          Simulation Compiled. Select signals and click &apos;Run&apos;.
        </div>
      </div>
    );
  }

  const ts         = simulationData.timescale;
  const maxTime    = simulationData.maxTime;
  const totalWidth = Math.max(100, maxTime * scale);

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
        ref={waveformRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair group"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onScroll={handleScroll}  // F2.3: track scroll
      >
        <div className="relative h-full" style={{ width: totalWidth }}>

          {/* ── Top Ruler (ΔT badge + tick marks + double-click markers) ── */}
          <div
            className="absolute top-0 left-0 right-0 h-6 border-b border-[#333333]"
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
                <div className="bg-[#ff8800]/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap shadow">
                  ΔT = {formatTime(Math.abs(cursorB - currentTime), ts)}
                </div>
              </div>
            )}
            {/* Ruler ticks */}
            {rulerTicks.map(t => (
              <div key={t}
                className="absolute top-0 bottom-0 border-l border-[#444444] pointer-events-none"
                style={{ left: t * scale }}
              >
                <span className="text-[9px] text-gray-500 font-mono ml-1 top-1 absolute">
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
                    className="text-[10px] font-bold px-1 py-0.5 rounded-sm shadow-sm whitespace-nowrap leading-none"
                    style={{ backgroundColor: mk.color, color: '#000' }}
                  >
                    {mk.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Vertical tick lines (full height) ───────────────────── */}
          <div className="absolute top-6 bottom-6 left-0 right-0 pointer-events-none">
            {rulerTicks.map(t => (
              <div key={t}
                className="absolute top-0 bottom-0 border-l border-[#222222]"
                style={{ left: t * scale }}
              />
            ))}
          </div>

          {/* ── Row background highlights ────────────────────────────── */}
          <div className="absolute top-6 bottom-6 left-0 right-0 pointer-events-none pt-1">
            {rows.map((row, idx) => (
              <div key={idx}
                className={`h-[40px] w-full border-b border-[#222222] ${selectedSignal === row.id ? 'bg-[#1e3a5f]/30' : ''}`}
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
                boxShadow:      `0 0 3px ${mk.color}55`,
              }}
            />
          ))}

          {/* ── Hover ghost cursor ──────────────────────────────────── */}
          {hoverTime !== null && (
            <div
              className="absolute top-0 bottom-6 border-l border-white/20 z-10 pointer-events-none"
              style={{ left: hoverTime * scale }}
            >
              <div className="absolute -top-1 -translate-x-1/2 bg-white/10 text-white/80 text-[9px] px-1 rounded backdrop-blur-sm whitespace-nowrap">
                {formatTime(hoverTime, ts)}
              </div>
            </div>
          )}

          {/* ── Cursor B (orange) — Shift+Click ─────────────────────── */}
          {cursorB !== null && (
            <div
              className="absolute top-0 bottom-0 border-l border-[#ff8800] z-20 pointer-events-none transition-all duration-75 ease-out shadow-[0_0_2px_rgba(255,136,0,0.6)]"
              style={{ left: cursorB * scale }}
            >
              <div className="absolute top-[2px] -translate-x-1/2 bg-[#ff8800] text-white text-[10px] px-1.5 py-0.5 font-mono font-bold whitespace-nowrap rounded-sm shadow-sm flex items-center gap-1">
                <span>B</span>
                <span>{formatTime(cursorB, ts)}</span>
                <button
                  className="pointer-events-auto text-white/70 hover:text-white leading-none"
                  onClick={e => { e.stopPropagation(); onCursorBChange(null); }}
                  title="Clear Cursor B"
                >×</button>
              </div>
            </div>
          )}

          {/* ── Cursor A (yellow) ────────────────────────────────────── */}
          <div
            className="absolute top-0 bottom-0 border-l border-[#ffff00] z-20 pointer-events-none transition-all duration-75 ease-out shadow-[0_0_2px_rgba(255,255,0,0.5)]"
            style={{ left: currentTime * scale }}
          >
            <div className="absolute top-[2px] -translate-x-1/2 bg-[#ffff00] text-black text-[10px] px-1.5 py-0.5 font-mono font-bold whitespace-nowrap rounded-sm shadow-sm">
              {formatTime(currentTime, ts)}
            </div>
          </div>

          {/* ── Bottom Ruler ─────────────────────────────────────────── */}
          <div className="absolute bottom-0 left-0 right-0 h-6 border-t border-[#00ff00] bg-[#111]">
            {rulerTicks.map((t, i) => {
              const showLabel = zoomLevel < 0.5 ? i % 4 === 0 : zoomLevel < 1 ? i % 2 === 0 : true;
              return (
                <React.Fragment key={t}>
                  <div
                    className="absolute top-0 h-2 border-l border-[#00ff00]/50"
                    style={{ left: t * scale }}
                  />
                  {showLabel && (
                    <div
                      className="absolute top-1 text-[#00ff00] text-[10px] font-mono whitespace-nowrap"
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
                  className="text-[9px] font-bold"
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
