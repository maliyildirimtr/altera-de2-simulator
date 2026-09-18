import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Board } from '../Board/Board';
import { boardRenderSize } from '../Board/DE2BoardRenderer';
import { BoardViewModeSwitcher } from './BoardViewModeSwitcher';
import type { BoardViewMode } from '../../board/boardViewMode';
import { loadBoardViewMode, saveBoardViewMode } from '../../board/boardViewMode';
import { detailForScale } from '../../board/de2Layout';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Expand } from 'lucide-react';

interface BoardViewportProps {
  isSplitView?: boolean;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;
/** Keep at least this much of the board reachable inside the viewport. */
const MIN_VISIBLE_MARGIN = 120;
const PAN_STEP = 48;

/**
 * Computes viewport-aware pan bounds so the board cannot be permanently lost
 * offscreen, while ensuring all corners (including bottom switches) can be
 * inspected at high zoom.
 */
function clampPan(
  panX: number,
  panY: number,
  scale: number,
  viewportW: number,
  viewportH: number,
  boardW: number,
  boardH: number,
): { panX: number; panY: number } {
  const scaledW = boardW * scale;
  const scaledH = boardH * scale;

  const minPanX = Math.min(MIN_VISIBLE_MARGIN - scaledW, (viewportW - scaledW) / 2);
  const maxPanX = Math.max(viewportW - MIN_VISIBLE_MARGIN, (viewportW - scaledW) / 2);

  const minPanY = Math.min(MIN_VISIBLE_MARGIN - scaledH, (viewportH - scaledH) / 2);
  const maxPanY = Math.max(viewportH - MIN_VISIBLE_MARGIN, (viewportH - scaledH) / 2);

  return {
    panX: Math.max(minPanX, Math.min(maxPanX, panX)),
    panY: Math.max(minPanY, Math.min(maxPanY, panY)),
  };
}

/** Computes fit-to-screen scale and centered pan offsets. */
function calculateFit(
  width: number,
  height: number,
  boardW: number,
  boardH: number,
): { scale: number; panX: number; panY: number } {
  const availW = Math.max(100, width - 32);
  const availH = Math.max(100, height - 32);

  const fitScale = Math.min(
    1.15,
    Math.max(MIN_SCALE, Math.min(availW / boardW, availH / boardH)),
  );

  const scaledW = boardW * fitScale;
  const scaledH = boardH * fitScale;

  return {
    scale: +fitScale.toFixed(3),
    panX: Math.round((width - scaledW) / 2),
    panY: Math.round((height - scaledH) / 2),
  };
}

/**
 * Checks whether the pointer target originates from an interactive control
 * (switches, buttons, inputs, toolbar buttons, canvas controls).
 */
function isInteractiveTarget(el: Element | null): boolean {
  if (!el) return false;
  return Boolean(
    el.closest(
      'button, input, select, textarea, [role="button"], [role="switch"], [data-board-interactive="true"], .switch-base, .btn-metallic, [data-testid^="de2-switch-"], [data-testid^="de2-key-"], .canvas-controls, [data-testid^="de2-toolbar-"]',
    ),
  );
}

const CONTROL_BUTTON_CLASS =
  'p-1 rounded-[3px] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]';

export const BoardViewport: React.FC<BoardViewportProps> = ({ isSplitView }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<BoardViewMode>(loadBoardViewMode);
  const [scale, setScale] = useState<number>(0.85);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUserTransformed, setIsUserTransformed] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const boardSize = boardRenderSize(viewMode);
  const detail = detailForScale(scale);

  // Active refs to eliminate stale closure bugs during high-frequency pointer /
  // wheel events.
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
  const boardSizeRef = useRef(boardSize);
  boardSizeRef.current = boardSize;

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /** Fit the board to the viewport and clear any manual transform. */
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const { width, height } = boardSizeRef.current;
    const fit = calculateFit(clientWidth, clientHeight, width, height);
    setScale(fit.scale);
    setPanX(fit.panX);
    setPanY(fit.panY);
    setIsUserTransformed(false);
  }, []);

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
    const { width, height } = boardSizeRef.current;
    const clamped = clampPan(
      centerX - (centerX - panXRef.current) * ratio,
      centerY - (centerY - panYRef.current) * ratio,
      newScale,
      clientWidth,
      clientHeight,
      width,
      height,
    );
    setScale(newScale);
    setPanX(clamped.panX);
    setPanY(clamped.panY);
    setIsUserTransformed(true);
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const { width, height } = boardSizeRef.current;
    const clamped = clampPan(
      panXRef.current + dx,
      panYRef.current + dy,
      scaleRef.current,
      clientWidth,
      clientHeight,
      width,
      height,
    );
    setPanX(clamped.panX);
    setPanY(clamped.panY);
    setIsUserTransformed(true);
  }, []);

  /**
   * Board view mode is a persisted user preference. Changing it must not touch
   * simulation state — only the renderer and the viewport fit.
   */
  const handleSelectViewMode = useCallback((mode: BoardViewMode) => {
    setViewMode(mode);
    saveBoardViewMode(mode);
    setIsUserTransformed(false);
  }, []);

  // ResizeObserver for responsive fit and viewport bounds preservation.
  useEffect(() => {
    const updateViewport = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;
      const { width, height } = boardSizeRef.current;

      if (!isUserTransformedRef.current) {
        const fit = calculateFit(clientWidth, clientHeight, width, height);
        setScale(fit.scale);
        setPanX(fit.panX);
        setPanY(fit.panY);
      } else {
        const clamped = clampPan(
          panXRef.current,
          panYRef.current,
          scaleRef.current,
          clientWidth,
          clientHeight,
          width,
          height,
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
  }, [isSplitView, viewMode]);

  // Cursor-relative wheel zoom with a non-passive listener to prevent page scroll.
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
      const { width, height } = boardSizeRef.current;
      const clamped = clampPan(
        mouseX - (mouseX - panXRef.current) * ratio,
        mouseY - (mouseY - panYRef.current) * ratio,
        newScale,
        rect.width,
        rect.height,
        width,
        height,
      );
      setScale(newScale);
      setPanX(clamped.panX);
      setPanY(clamped.panY);
      setIsUserTransformed(true);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Track fullscreen state, including exits triggered by Escape.
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        void document.exitFullscreen?.();
      } else {
        void el.requestFullscreen?.();
      }
    } catch {
      // Fullscreen can be blocked by permissions policy — ignore and carry on.
    }
  }, []);

  /**
   * Keyboard navigation for the canvas itself. Only handled when the viewport
   * has focus, so arrow keys on a focused switch or key are never swallowed.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;

      switch (e.key) {
        case 'ArrowLeft':
          panBy(PAN_STEP, 0);
          break;
        case 'ArrowRight':
          panBy(-PAN_STEP, 0);
          break;
        case 'ArrowUp':
          panBy(0, PAN_STEP);
          break;
        case 'ArrowDown':
          panBy(0, -PAN_STEP);
          break;
        case '+':
        case '=':
          handleZoomStep('in');
          break;
        case '-':
        case '_':
          handleZoomStep('out');
          break;
        case '0':
        case 'Home':
          handleFitToScreen();
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    [panBy, handleZoomStep, handleFitToScreen],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (isInteractiveTarget(e.target as Element | null)) return;

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

    const { clientWidth, clientHeight } = containerRef.current;
    const { width, height } = boardSizeRef.current;
    const clamped = clampPan(
      panStartRef.current.x + (e.clientX - dragStartRef.current.x),
      panStartRef.current.y + (e.clientY - dragStartRef.current.y),
      scaleRef.current,
      clientWidth,
      clientHeight,
      width,
      height,
    );

    setPanX(clamped.panX);
    setPanY(clamped.panY);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    setIsDragging(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="de2-board-viewport"
      data-board-view-mode={viewMode}
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      className="relative flex-1 h-full w-full overflow-hidden select-none dot-grid outline-none"
      style={{
        backgroundColor: 'var(--bg-canvas, #0a0f18)',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      tabIndex={0}
      role="group"
      aria-label="DE2 board viewport — arrow keys pan, plus and minus zoom, 0 fits the board"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Canvas transform layer: translate(panX, panY) scale(scale), origin 0 0 */}
      <div
        data-testid="de2-board-transform"
        data-scale={scale}
        data-pan-x={panX}
        data-pan-y={panY}
        className="shrink-0"
        style={{
          width: boardSize.width,
          height: boardSize.height,
          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`,
          transformOrigin: '0 0',
          willChange: isDragging ? 'transform' : 'auto',
          transition: isDragging ? 'none' : 'transform 60ms ease-out',
        }}
      >
        <div key={viewMode} className="de2-view-enter w-full h-full">
          <Board viewMode={viewMode} detail={detail} />
        </div>
      </div>

      {/* Board view mode selector (top-left) */}
      <div className="absolute top-3 left-3 z-20">
        <BoardViewModeSwitcher mode={viewMode} onSelect={handleSelectViewMode} />
      </div>

      {/* Floating canvas controls (bottom-right) */}
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
          className={CONTROL_BUTTON_CLASS}
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Zoom Out"
          data-testid="de2-zoom-out"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={handleFitToScreen}
          title="Fit Board to Screen"
          className={CONTROL_BUTTON_CLASS}
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Fit Board to Screen"
          data-testid="de2-fit-view"
        >
          <Maximize2 size={13} />
        </button>
        <button
          onClick={() => handleZoomStep('in')}
          title="Zoom In"
          className={CONTROL_BUTTON_CLASS}
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Zoom In"
          data-testid="de2-zoom-in"
        >
          <ZoomIn size={13} />
        </button>
        <span className="w-px h-3.5 mx-0.5" style={{ backgroundColor: 'var(--border-subtle)' }} />
        <button
          onClick={handleFitToScreen}
          title="Reset View"
          className={CONTROL_BUTTON_CLASS}
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Reset View"
          data-testid="de2-reset-view"
        >
          <RotateCcw size={13} />
        </button>
        <button
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Board'}
          className={CONTROL_BUTTON_CLASS}
          style={{ color: 'var(--text-secondary)' }}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Board'}
          aria-pressed={isFullscreen}
          data-testid="de2-fullscreen"
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Expand size={13} />}
        </button>
      </div>
    </div>
  );
};
