import React from 'react';
import type { Board2DPresentation } from '../../board/board2dPresentation';
import { ACTIVE_BOARD_2D_PRESENTATION } from '../../board/board2dPresentation';
import type { Board25DPresentation } from '../../board/board25dPresentation';
import { ACTIVE_BOARD_25D_PRESENTATION } from '../../board/board25dPresentation';
import type { BoardViewMode } from '../../board/boardViewMode';
import type { BoardDetail } from '../../board/de2Layout';
import { BOARD_RENDER_HEIGHT, BOARD_RENDER_WIDTH } from '../../board/de2Layout';
import { DE2_ARTWORK_ASPECT } from '../../board/de2ArtworkLayout';
import { SCENE_ASPECT } from '../../board/de2Scene25D';
import { ISO_RENDER_HEIGHT, ISO_RENDER_WIDTH } from './boardGeometry';
import { DE2Board2D } from './DE2Board2D';
import { DE2Board25D } from './DE2Board25D';
import { DE2Board3DPlaceholder } from './DE2Board3DPlaceholder';
import { DE2HybridBoard2D } from './DE2HybridBoard2D';
import { DE2HybridBoard25D } from './DE2HybridBoard25D';

export interface BoardRenderSize {
  width: number;
  height: number;
}

/**
 * DOM box each renderer draws into. The viewport's zoom / pan / fit maths reads
 * this instead of hardcoding board pixels, so adding a renderer with different
 * proportions needs no viewport changes.
 *
 * Every renderer shares the vector board's WIDTH, so switching view or
 * presentation never changes the horizontal fit, and takes its height from its
 * own viewBox aspect. Deriving the height rather than asserting it is what
 * keeps each board undistorted: the 2D render is not a mechanical drawing, so
 * its board is fractionally taller in proportion than 203 x 153 mm, and the
 * 2.5D scene is wider still because it reserves room for the hardware that
 * overhangs the substrate and for the board's shadow.
 */
export function boardRenderSize(
  mode: BoardViewMode,
  presentation: Board2DPresentation = ACTIVE_BOARD_2D_PRESENTATION,
  presentation25d: Board25DPresentation = ACTIVE_BOARD_25D_PRESENTATION,
): BoardRenderSize {
  if (mode === '2.5d') {
    if (presentation25d === 'artwork') {
      return {
        width: BOARD_RENDER_WIDTH,
        height: Math.round(BOARD_RENDER_WIDTH / SCENE_ASPECT),
      };
    }
    return { width: ISO_RENDER_WIDTH, height: ISO_RENDER_HEIGHT };
  }
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
  /** Which 2.5D renderer to use. Defaults to whatever ships. */
  presentation25d?: Board25DPresentation;
}

/**
 * Selects the DE2 board renderer for the active view mode.
 *
 *   simulation core → boardStore → { 2D | 2.5D | future 3D }
 *
 * Every renderer subscribes to the same store selectors, so switching mode is
 * purely a presentation change: no simulator re-initialisation, no state reset.
 *
 * Modes '2d' and '2.5d' each have two renderers behind them — an artwork-based
 * one and an all-SVG vector one — chosen by `presentation` / `presentation25d`.
 * All four are live; none is a stub. See `board2dPresentation.ts` and
 * `board25dPresentation.ts` for which ones ship and how to switch.
 */
export const DE2BoardRenderer: React.FC<DE2BoardRendererProps> = React.memo(
  ({
    mode,
    detail,
    presentation = ACTIVE_BOARD_2D_PRESENTATION,
    presentation25d = ACTIVE_BOARD_25D_PRESENTATION,
  }) => {
    if (mode === '2.5d') {
      if (presentation25d === 'artwork') return <DE2HybridBoard25D />;
      return <DE2Board25D detail={detail} />;
    }
    if (mode === '3d') return <DE2Board3DPlaceholder />;
    if (presentation === 'artwork') return <DE2HybridBoard2D />;
    return <DE2Board2D detail={detail} />;
  },
);
DE2BoardRenderer.displayName = 'DE2BoardRenderer';
