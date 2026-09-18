import React from 'react';
import type { Board2DPresentation } from '../../board/board2dPresentation';
import { ACTIVE_BOARD_2D_PRESENTATION } from '../../board/board2dPresentation';
import type { BoardViewMode } from '../../board/boardViewMode';
import type { BoardDetail } from '../../board/de2Layout';
import { BOARD_RENDER_HEIGHT, BOARD_RENDER_WIDTH } from '../../board/de2Layout';
import { DE2_ARTWORK_ASPECT } from '../../board/de2ArtworkLayout';
import { ISO_RENDER_HEIGHT, ISO_RENDER_WIDTH } from './boardGeometry';
import { DE2Board2D } from './DE2Board2D';
import { DE2Board25D } from './DE2Board25D';
import { DE2Board3DPlaceholder } from './DE2Board3DPlaceholder';
import { DE2HybridBoard2D } from './DE2HybridBoard2D';

export interface BoardRenderSize {
  width: number;
  height: number;
}

/**
 * DOM box each renderer draws into. The viewport's zoom / pan / fit maths reads
 * this instead of hardcoding board pixels, so adding a renderer with different
 * proportions needs no viewport changes.
 *
 * The artwork board shares the vector board's WIDTH so switching presentation
 * does not change the horizontal fit, and takes its height from the artwork's
 * own aspect ratio — the render is not a mechanical drawing, so its board is
 * fractionally taller in proportion than 203 x 153 mm. Deriving the height
 * rather than asserting it is what keeps the artwork undistorted.
 */
export function boardRenderSize(
  mode: BoardViewMode,
  presentation: Board2DPresentation = ACTIVE_BOARD_2D_PRESENTATION,
): BoardRenderSize {
  if (mode === '2.5d') return { width: ISO_RENDER_WIDTH, height: ISO_RENDER_HEIGHT };
  if (mode === '2d' && presentation === 'artwork') {
    return {
      width: BOARD_RENDER_WIDTH,
      height: Math.round(BOARD_RENDER_WIDTH / DE2_ARTWORK_ASPECT),
    };
  }
  return { width: BOARD_RENDER_WIDTH, height: BOARD_RENDER_HEIGHT };
}

interface DE2BoardRendererProps {
  mode: BoardViewMode;
  detail: BoardDetail;
  /** Which 2D renderer to use. Defaults to whatever ships; see the module. */
  presentation?: Board2DPresentation;
}

/**
 * Selects the DE2 board renderer for the active view mode.
 *
 *   simulation core → boardStore → { 2D | 2.5D | future 3D }
 *
 * Every renderer subscribes to the same store selectors, so switching mode is
 * purely a presentation change: no simulator re-initialisation, no state reset.
 *
 * Mode '2d' has two renderers behind it — the artwork-based hybrid and the
 * all-SVG vector board — chosen by `presentation`. Both are live; neither is a
 * stub. See `board2dPresentation.ts` for which one ships and how to switch.
 */
export const DE2BoardRenderer: React.FC<DE2BoardRendererProps> = React.memo(
  ({ mode, detail, presentation = ACTIVE_BOARD_2D_PRESENTATION }) => {
    if (mode === '2.5d') return <DE2Board25D detail={detail} />;
    if (mode === '3d') return <DE2Board3DPlaceholder />;
    if (presentation === 'artwork') return <DE2HybridBoard2D />;
    return <DE2Board2D detail={detail} />;
  },
);
DE2BoardRenderer.displayName = 'DE2BoardRenderer';
