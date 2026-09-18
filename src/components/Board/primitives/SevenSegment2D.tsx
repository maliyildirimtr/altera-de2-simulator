import React, { useMemo } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK } from '../../../board/de2Layout';
import { isSegmentLit, useHexSegments } from '../../../board/useBoardSelectors';
import { sevenSegmentShapes, SEGMENT_SLANT_DEG } from '../boardGeometry';
import { PartLabel } from './Silkscreen';
import { SEVEN_SEG } from '../boardPalette';

interface SevenSegment2DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/**
 * DE2 seven-segment display HEX7..HEX0, flat top view.
 *
 * Segment values are ACTIVE-LOW: `segments[s] === 0` lights segment `s`
 * (order A, B, C, D, E, F, G). The raw array is published unmodified on
 * `data-segments`, which the DE2 HEX regression suite reads.
 */
export const SevenSegment2D: React.FC<SevenSegment2DProps> = React.memo(
  ({ component, detail }) => {
    const index = component.index ?? 0;
    const segments = useHexSegments(index);

    const { x, y, width: w, height: h } = component;
    const glassInset = 0.7;
    const glassW = w - glassInset * 2;
    const glassH = h - glassInset * 2 - 1.2;

    const shapes = useMemo(() => sevenSegmentShapes(glassW, glassH), [glassW, glassH]);
    const anyLit = segments.some((v) => isSegmentLit(v));

    return (
      <g
        data-testid={`de2-hex-${index}`}
        data-segments={JSON.stringify(segments)}
        role="img"
        aria-label={`HEX${index} seven-segment display`}
        pointerEvents="none"
      >
        {anyLit && (
          <rect
            x={x - w * 0.35}
            y={y - h * 0.3}
            width={w * 1.7}
            height={h * 1.6}
            fill="url(#de2b-seg-halo)"
          />
        )}

        {/* Moulded package */}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={0.4}
          fill="url(#de2b-seg-pkg)"
          stroke="#0D0505"
          strokeWidth={0.18}
        />
        {/* Recessed glass window */}
        <rect
          x={x + glassInset}
          y={y + glassInset}
          width={glassW}
          height={glassH}
          rx={0.25}
          fill="url(#de2b-seg-glass)"
        />

        <g
          transform={`translate(${x + glassInset} ${y + glassInset}) skewX(-${SEGMENT_SLANT_DEG})`}
        >
          {shapes.map((s) => {
            const lit = isSegmentLit(segments[s.index]);
            return (
              <polygon
                key={s.index}
                className="de2-seg"
                data-segment={s.index}
                data-lit={lit ? 'true' : 'false'}
                points={s.points}
                fill={lit ? SEVEN_SEG.on : SEVEN_SEG.off}
                opacity={lit ? 1 : 0.42}
              />
            );
          })}
        </g>

        {/* Decimal point — present on the package, not wired on the DE2 */}
        <circle
          cx={x + w - glassInset - 0.55}
          cy={y + glassInset + glassH - 0.5}
          r={0.38}
          fill={SEVEN_SEG.offDim}
          opacity={0.6}
        />

        <PartLabel
          x={x + w / 2}
          y={BOTTOM_SILK.hexLabelY}
          text={`HEX${index}`}
          detail={detail}
          size={1.8}
        />
      </g>
    );
  },
);
SevenSegment2D.displayName = 'SevenSegment2D';
