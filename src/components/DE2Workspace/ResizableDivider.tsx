import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ResizableDividerProps {
  orientation: 'vertical' | 'horizontal';
  onResize: (delta: number, currentPos: { clientX: number; clientY: number }, stepMultiplier?: number) => void;
  onResizeEnd?: () => void;
  onReset?: () => void;
  'data-testid'?: string;
  'aria-label'?: string;
  valueMin?: number;
  valueMax?: number;
  valueNow?: number;
  className?: string;
  disabled?: boolean;
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
  orientation,
  onResize,
  onResizeEnd,
  onReset,
  'data-testid': testId,
  'aria-label': ariaLabel,
  valueMin,
  valueMax,
  valueNow,
  className = '',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);

  // Global cursor & text selection handling during active drag
  useEffect(() => {
    if (isDragging) {
      const origCursor = document.body.style.cursor;
      const origUserSelect = document.body.style.userSelect;
      document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.body.style.cursor = origCursor;
        document.body.style.userSelect = origUserSelect;
      };
    }
  }, [isDragging, orientation]);

  // Clean up if component unmounts mid-drag
  useEffect(() => {
    return () => {
      if (dividerRef.current && activePointerIdRef.current !== null) {
        try {
          dividerRef.current.releasePointerCapture(activePointerIdRef.current);
        } catch (_) {}
      }
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    lastPosRef.current = { x: e.clientX, y: e.clientY };
    activePointerIdRef.current = e.pointerId;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  }, [disabled]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;
    e.preventDefault();

    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    const delta = orientation === 'vertical' ? dx : dy;
    if (delta !== 0) {
      onResize(delta, { clientX: e.clientX, clientY: e.clientY });
    }
  }, [isDragging, disabled, orientation, onResize]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);

    if (activePointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(activePointerIdRef.current);
      } catch (_) {}
      activePointerIdRef.current = null;
    }

    onResizeEnd?.();
  }, [isDragging, onResizeEnd]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    onReset?.();
    onResizeEnd?.();
  }, [disabled, onReset, onResizeEnd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = e.shiftKey ? 24 : 8;
    const ratioStep = e.shiftKey ? 0.03 : 0.01;

    if (orientation === 'vertical') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onResize(-step, { clientX: 0, clientY: 0 }, -ratioStep);
        onResizeEnd?.();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onResize(step, { clientX: 0, clientY: 0 }, ratioStep);
        onResizeEnd?.();
      } else if (e.key === 'Enter' || e.key === 'Home') {
        e.preventDefault();
        onReset?.();
        onResizeEnd?.();
      }
    } else {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onResize(-step, { clientX: 0, clientY: 0 }, -ratioStep);
        onResizeEnd?.();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onResize(step, { clientX: 0, clientY: 0 }, ratioStep);
        onResizeEnd?.();
      } else if (e.key === 'Enter' || e.key === 'Home') {
        e.preventDefault();
        onReset?.();
        onResizeEnd?.();
      }
    }
  }, [disabled, orientation, onResize, onResizeEnd, onReset]);

  const isVertical = orientation === 'vertical';

  return (
    <div
      ref={dividerRef}
      role="separator"
      tabIndex={disabled ? -1 : 0}
      aria-orientation={orientation}
      aria-label={ariaLabel || (isVertical ? 'Vertical Resizer' : 'Horizontal Resizer')}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      aria-valuenow={valueNow}
      data-testid={testId}
      data-dragging={isDragging ? 'true' : 'false'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative shrink-0 select-none outline-none focus-visible:ring-1 focus-visible:ring-blue-400
        ${isVertical ? 'w-[1px] h-full cursor-col-resize' : 'h-[1px] w-full cursor-row-resize'}
        ${isDragging 
          ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)] z-40' 
          : isHovered 
            ? 'bg-blue-400/80 shadow-[0_0_4px_rgba(59,130,246,0.5)] z-30' 
            : 'bg-[#1e293b] z-20'}
        ${className}
      `}
    >
      {/* Invisible expanded hit target (does not create physical dead space in layout) */}
      <div
        className={`
          absolute
          ${isVertical 
            ? 'top-0 bottom-0 -left-[5px] w-[11px] cursor-col-resize' 
            : 'left-0 right-0 -top-[5px] h-[11px] cursor-row-resize'}
        `}
      />
    </div>
  );
};
