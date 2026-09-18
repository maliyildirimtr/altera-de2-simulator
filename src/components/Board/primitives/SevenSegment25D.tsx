import React, { useMemo } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK } from '../../../board/de2Layout';
import { isSegmentLit, useHexSegments } from '../../../board/useBoardSelectors';
import { SEGMENT_SLANT_DEG, extrudeBox, faceTransform, project, sevenSegmentShapes } from '../boardGeometry';
import { PartLabel } from './Silkscreen';
import { SEVEN_SEG } from '../boardPalette';

interface SevenSegment25DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

const PACKAGE_H = 2.6;
/** How far the glass sits below the package rim. */
const RECESS = 0.5;

/**
 * DE2 seven-segment display in the 2.5D view: a raised dark-red package with a
 * recessed glass window.
 *
 * Segments are ACTIVE-LOW (`0` lights a segment) and the raw array is published
 * on `data-segments`, identical to the 2D renderer — the DE2 HEX regression
 * suite reads that attribute in whichever view is active.
 */
export const SevenSegment25D: React.FC<SevenSegment25DProps> = React.memo(
  ({ component, detail }) => {
    const index = component.index ?? 0;
    const segments = useHexSegments(index);

    const { x, y, width: w, height: h } = component;
    const glassInset = 0.7;
    const glassW = w - glassInset * 2;
    const glassH = h - glassInset * 2 - 1.2;

    const shapes = useMemo(() => sevenSegmentShapes(glassW, glassH), [glassW, glassH]);
    const anyLit = segments.some((v) => isSegmentLit(v));

    const pkg = extrudeBox(x, y, w, h, PACKAGE_H);
    const halo = project(x + w / 2, y + h / 2, PACKAGE_H);
    const glassHeight = PACKAGE_H - RECESS;

    return (
      <g
        data-testid={`de2-hex-${index}`}
        data-segments={JSON.stringify(segments)}
        role="img"
        aria-label={`HEX${index} seven-segment display`}
        pointerEvents="none"
      >
        {anyLit && (
          <ellipse cx={halo.x} cy={halo.y} rx={w * 1.5} ry={h * 1.0} fill="url(#de2b-seg-halo)" />
        )}

        {/* Raised package */}
        <polygon points={pkg.side} fill="#180A0A" />
        <polygon points={pkg.front} fill="#26100F" />
        <polygon
          points={pkg.top}
          fill="url(#de2b-seg-pkg)"
          stroke="#0D0505"
          strokeWidth={0.14}
        />

        {/* Recessed glass window and the digit itself */}
        <g transform={faceTransform(glassHeight)}>
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
          <circle
            cx={x + w - glassInset - 0.55}
            cy={y + glassInset + glassH - 0.5}
            r={0.38}
            fill={SEVEN_SEG.offDim}
            opacity={0.6}
          />
        </g>

        <g transform={faceTransform(0)}>
          <PartLabel
            x={x + w / 2}
            y={BOTTOM_SILK.hexLabelY}
            text={`HEX${index}`}
            detail={detail}
            size={1.8}
          />
        </g>
      </g>
    );
  },
);
SevenSegment25D.displayName = 'SevenSegment25D';
