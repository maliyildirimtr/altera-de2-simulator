// ============================================================
// useResizableColumns.ts — Reusable column resize hook
// Provides widths array and a drag-handle factory function.
// ============================================================

import { useState, useCallback, useRef } from 'react';

export function useResizableColumns(initialWidths: number[]) {
  const [widths, setWidths] = useState<number[]>(initialWidths);
  const isResizingRef = useRef(false);

  /** Returns onMouseDown handler for the splitter between columns[index] and [index+1]. */
  const getHandleProps = useCallback((index: number) => ({
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      isResizingRef.current = true;

      const startX = e.clientX;
      // ── Kritik: sürükleme başındaki genişlikleri sabitle ──
      // Her mousemove olayı bu sabit değerlere delta ekler.
      // State'e kümülatif ekleme yapılmaz, kolon uçmaz.
      const startWidths = [...widths];

      const onMove = (mv: MouseEvent) => {
        const delta = mv.clientX - startX;
        const newLeft  = Math.max(40, startWidths[index]     + delta);
        const newRight = Math.max(40, startWidths[index + 1] - delta);
        setWidths(prev => {
          const next = [...prev];
          next[index]     = newLeft;
          next[index + 1] = newRight;
          return next;
        });
      };

      const onUp = () => {
        isResizingRef.current = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
  }), [widths]);

  return { widths, getHandleProps };
}
