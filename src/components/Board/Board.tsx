import React from 'react';
import type { BoardViewMode } from '../../board/boardViewMode';
import type { BoardDetail } from '../../board/de2Layout';
import { DE2BoardRenderer, boardRenderSize } from './DE2BoardRenderer';

interface BoardProps {
  /** Which renderer draws the board. */
  viewMode?: BoardViewMode;
  /** Level of detail, derived from the viewport zoom scale. */
  detail?: BoardDetail;
}

/**
 * The DE2 board surface.
 *
 * A thin, stable shell around the renderer selection: it owns the sized DOM box
 * and the `de2-board` test hook, and delegates every pixel to the renderer for
 * the active view mode. Board geometry lives in `src/board/de2Layout.ts` — none
 * of it is duplicated here.
 */
export const Board: React.FC<BoardProps> = React.memo(({ viewMode = '2d', detail = 'normal' }) => {
  const size = boardRenderSize(viewMode);

  return (
    <div
      data-testid="de2-board"
      data-board-view-mode={viewMode}
      data-board-detail={detail}
      className="de2-board relative shrink-0"
      style={{ width: size.width, height: size.height }}
    >
      <DE2BoardRenderer mode={viewMode} detail={detail} />
    </div>
  );
});
Board.displayName = 'Board';
