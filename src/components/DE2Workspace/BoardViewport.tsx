import React, { useRef, useState, useEffect } from 'react';
import { Board } from '../Board/Board';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface BoardViewportProps {
  isSplitView?: boolean;
}

export const BoardViewport: React.FC<BoardViewportProps> = ({ isSplitView }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState<number>(0.85);
  const [manualZoom, setManualZoom] = useState<number>(1);

  // Compute responsive auto-scale to keep board large and fully visible
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;

      const paddingX = 16;
      const paddingY = 24;
      const availableW = Math.max(100, clientWidth - paddingX);
      const availableH = Math.max(100, clientHeight - paddingY);

      // Board native size is 1200 × 750
      const scaleX = availableW / 1200;
      const scaleY = availableH / 750;
      const computed = Math.min(scaleX, scaleY);

      // Clamp scale to fit perfectly without overflow
      const clamped = Math.min(1.05, Math.max(0.25, computed));
      setAutoScale(clamped);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [isSplitView]);

  const effectiveScale = autoScale * manualZoom;

  const handleResetZoom = () => setManualZoom(1);
  const handleZoomIn = () => setManualZoom(prev => Math.min(1.8, +(prev + 0.1).toFixed(1)));
  const handleZoomOut = () => setManualZoom(prev => Math.max(0.6, +(prev - 0.1).toFixed(1)));

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full bg-[#0a0f18] dot-grid flex items-center justify-center overflow-hidden select-none"
      style={{
        '--canvas-bg': '#0a0f18',
        '--grid-color': 'rgba(255, 255, 255, 0.035)',
      } as React.CSSProperties}
    >
      {/* 3D Readiness Layer: encapsulated Board component centered with transformOrigin center */}
      <div
        className="transition-transform duration-150 ease-out shrink-0"
        style={{
          width: 1200,
          height: 750,
          transform: `scale(${effectiveScale})`,
          transformOrigin: 'center center',
        }}
      >
        <Board />
      </div>

      {/* Floating Canvas Controls (bottom-right) */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#0d1627]/90 backdrop-blur-sm border border-white/10 rounded-md px-2 py-1 shadow-lg z-20">
        <span className="text-[11px] font-mono text-slate-400 mr-1.5">
          {Math.round(effectiveScale * 100)}%
        </span>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={handleResetZoom}
          title="Fit to Screen"
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Fit to Screen"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
      </div>
    </div>
  );
};
