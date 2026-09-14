import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Board } from '../Board/Board';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface BoardViewportProps {
  isSplitView?: boolean;
}

const BOARD_WIDTH = 1200;
const BOARD_HEIGHT = 750;
const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;
const MIN_VISIBLE_MARGIN = 120; // Ensure at least 120px of board remains visible within viewport

/**
 * Computes viewport-aware pan bounds so the board cannot be permanently lost offscreen,
 * while ensuring all corners (including bottom switches) can be inspected at high zoom.
 */
function clampPan(
  panX: number,
  panY: number,
  scale: number,
  viewportW: number,
  viewportH: number
): { panX: number; panY: number } {
  const scaledW = BOARD_WIDTH * scale;
  const scaledH = BOARD_HEIGHT * scale;

  // When board is smaller than viewport, allow panning within margins around center
  // When board is larger, allow panning from margin to viewport - margin
  const minPanX = Math.min(MIN_VISIBLE_MARGIN - scaledW, (viewportW - scaledW) / 2);
  const maxPanX = Math.max(viewportW - MIN_VISIBLE_MARGIN, (viewportW - scaledW) / 2);

  const minPanY = Math.min(MIN_VISIBLE_MARGIN - scaledH, (viewportH - scaledH) / 2);
  const maxPanY = Math.max(viewportH - MIN_VISIBLE_MARGIN, (viewportH - scaledH) / 2);

  return {
    panX: Math.max(minPanX, Math.min(maxPanX, panX)),
    panY: Math.max(minPanY, Math.min(maxPanY, panY)),
  };
}

/**
 * Computes fit-to-screen scale and centered pan offsets
 */
function calculateFit(width: number, height: number): { scale: number; panX: number; panY: number } {
  const paddingX = 32;
  const paddingY = 32;
  const availW = Math.max(100, width - paddingX);
  const availH = Math.max(100, height - paddingY);

  const scaleX = availW / BOARD_WIDTH;
  const scaleY = availH / BOARD_HEIGHT;
  const fitScale = Math.min(1.15, Math.max(MIN_SCALE, Math.min(scaleX, scaleY)));

  const scaledW = BOARD_WIDTH * fitScale;
  const scaledH = BOARD_HEIGHT * fitScale;
  const centeredX = Math.round((width - scaledW) / 2);
  const centeredY = Math.round((height - scaledH) / 2);

  return {
    scale: +(fitScale.toFixed(3)),
    panX: centeredX,
    panY: centeredY,
  };
}

/**
 * Checks whether the pointer target originates from an interactive control
 * (switches, buttons, inputs, toolbar buttons, canvas controls).
 */
function isInteractiveTarget(el: HTMLElement | null): boolean {
  if (!el) return false;
  return Boolean(
    el.closest(
      'button, input, select, textarea, [role="button"], [role="switch"], .switch-base, .btn-metallic, [data-testid^="de2-switch-"], [data-testid^="de2-key-"], .canvas-controls, [data-testid^="de2-toolbar-"]'
    )
  );
}

export const BoardViewport: React.FC<BoardViewportProps> = ({ isSplitView }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState<number>(0.85);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUserTransformed, setIsUserTransformed] = useState<boolean>(false);

  // Active refs to eliminate stale closure bugs during high-frequency pointer / wheel events
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const panXRef = useRef(panX);
  panXRef.current = panX;
  const panYRef = useRef(panY);
  panYRef.current = panY;
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;
  const isUserTransformedRef = useRef(isUserTransformed);
  isUserTransformedRef.current = isUserTransformed;

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fit to screen handler
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const fit = calculateFit(clientWidth, clientHeight);
    setScale(fit.scale);
    setPanX(fit.panX);
    setPanY(fit.panY);
    setIsUserTransformed(false);
  }, []);

  // Zoom step handler (+/- buttons) centered on the current viewport
  const handleZoomStep = useCallback((direction: 'in' | 'out') => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;

    const factor = direction === 'in' ? 1.15 : 1 / 1.15;
    const oldScale = scaleRef.current;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(oldScale * factor).toFixed(3)));
    if (newScale === oldScale) return;

    const ratio = newScale / oldScale;
    const newPanX = centerX - (centerX - panXRef.current) * ratio;
    const newPanY = centerY - (centerY - panYRef.current) * ratio;

    const clamped = clampPan(newPanX, newPanY, newScale, clientWidth, clientHeight);
    setScale(newScale);
    setPanX(clamped.panX);
    setPanY(clamped.panY);
    setIsUserTransformed(true);
  }, []);

  // ResizeObserver for responsive fit and viewport bounds preservation
  useEffect(() => {
    const updateViewport = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;

      if (!isUserTransformedRef.current) {
        // Automatically fit and center board when not manually transformed
        const fit = calculateFit(clientWidth, clientHeight);
        setScale(fit.scale);
        setPanX(fit.panX);
        setPanY(fit.panY);
      } else {
        // Keep user's zoom scale, but clamp pan to guarantee the board is never lost
        const clamped = clampPan(
          panXRef.current,
          panYRef.current,
          scaleRef.current,
          clientWidth,
          clientHeight
        );
        setPanX(clamped.panX);
        setPanY(clamped.panY);
      }
    };

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateViewport);
    };
  }, [isSplitView]);

  // Cursor-relative wheel zoom with non-passive listener to prevent page scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldScale = scaleRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(oldScale * zoomFactor).toFixed(3)));
      if (newScale === oldScale) return;

      const ratio = newScale / oldScale;
      const newPanX = mouseX - (mouseX - panXRef.current) * ratio;
      const newPanY = mouseY - (mouseY - panYRef.current) * ratio;

      const clamped = clampPan(newPanX, newPanY, newScale, rect.width, rect.height);
      setScale(newScale);
      setPanX(clamped.panX);
      setPanY(clamped.panY);
      setIsUserTransformed(true);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Pointer dragging events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // Isolate interactive board controls: do NOT start panning on switches, buttons, or controls
    const target = e.target as HTMLElement | null;
    if (isInteractiveTarget(target)) {
      return;
    }

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { x: panXRef.current, y: panYRef.current };
    setIsUserTransformed(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !containerRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const newPanX = panStartRef.current.x + dx;
    const newPanY = panStartRef.current.y + dy;

    const { clientWidth, clientHeight } = containerRef.current;
    const clamped = clampPan(newPanX, newPanY, scaleRef.current, clientWidth, clientHeight);

    setPanX(clamped.panX);
    setPanY(clamped.panY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      setIsDragging(false);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      setIsDragging(false);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="de2-board-viewport"
      className="relative flex-1 h-full w-full overflow-hidden select-none dot-grid"
      style={{
        backgroundColor: 'var(--bg-canvas, #0a0f18)',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Canvas Transform Layer: Canonical translate(panX, panY) scale(scale) with origin 0 0 */}
      <div
        data-testid="de2-board-transform"
        data-scale={scale}
        data-pan-x={panX}
        data-pan-y={panY}
        className="shrink-0"
        style={{
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`,
          transformOrigin: '0 0',
          willChange: isDragging ? 'transform' : 'auto',
          transition: isDragging ? 'none' : 'transform 60ms ease-out',
        }}
      >
        <Board />
      </div>

      {/* Floating Canvas Controls (bottom-right) - Precision instrument chrome */}
      <div
        className="canvas-controls absolute bottom-3 right-3 flex items-center gap-1 rounded-[4px] px-2 py-1 z-20 border shadow-xs select-none"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span
          data-testid="de2-zoom-label"
          className="text-[11px] font-mono select-none mr-1 font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => handleZoomStep('out')}
          title="Zoom Out"
          className="p-1 rounded-[3px] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          style={{
            color: 'var(--text-secondary)',
          }}
          aria-label="Zoom Out"
          data-testid="de2-zoom-out"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={handleFitToScreen}
          title="Fit to Screen"
          className="p-1 rounded-[3px] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          style={{
            color: 'var(--text-secondary)',
          }}
          aria-label="Fit to Screen"
          data-testid="de2-fit-view"
        >
          <Maximize2 size={13} />
        </button>
        <button
          onClick={() => handleZoomStep('in')}
          title="Zoom In"
          className="p-1 rounded-[3px] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          style={{
            color: 'var(--text-secondary)',
          }}
          aria-label="Zoom In"
          data-testid="de2-zoom-in"
        >
          <ZoomIn size={13} />
        </button>
      </div>
    </div>
  );
};
