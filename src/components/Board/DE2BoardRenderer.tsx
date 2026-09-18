import React from 'react';
import type { BoardViewMode } from '../../board/boardViewMode';
import type { BoardDetail } from '../../board/de2Layout';
import { BOARD_RENDER_HEIGHT, BOARD_RENDER_WIDTH } from '../../board/de2Layout';
import { ISO_RENDER_HEIGHT, ISO_RENDER_WIDTH } from './boardGeometry';
import { DE2Board2D } from './DE2Board2D';
import { DE2Board25D } from './DE2Board25D';
import { DE2Board3DPlaceholder } from './DE2Board3DPlaceholder';

export interface BoardRenderSize {
  width: number;
  height: number;
}

/**
 * DOM box each renderer draws into. The viewport's zoom / pan / fit maths reads
 * this instead of hardcoding board pixels, so adding a renderer with different
 * proportions needs no viewport changes.
 */
export function boardRenderSize(mode: BoardViewMode): BoardRenderSize {
  if (mode === '2.5d') return { width: ISO_RENDER_WIDTH, height: ISO_RENDER_HEIGHT };
  return { width: BOARD_RENDER_WIDTH, height: BOARD_RENDER_HEIGHT };
}

interface DE2BoardRendererProps {
  mode: BoardViewMode;
  detail: BoardDetail;
}

/**
 * Selects the DE2 board renderer for the active view mode.
 *
 *   simulation core → boardStore → { 2D | 2.5D | future 3D }
 *
 * Every renderer subscribes to the same store selectors, so switching mode is
 * purely a presentation change: no simulator re-initialisation, no state reset.
 */
export const DE2BoardRenderer: React.FC<DE2BoardRendererProps> = React.memo(({ mode, detail }) => {
  if (mode === '2.5d') return <DE2Board25D detail={detail} />;
  if (mode === '3d') return <DE2Board3DPlaceholder />;
  return <DE2Board2D detail={detail} />;
});
DE2BoardRenderer.displayName = 'DE2BoardRenderer';
