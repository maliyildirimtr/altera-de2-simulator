import React, { useMemo } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK, hasDetail } from '../../../board/de2Layout';
import { isSegmentLit, useHexSegments } from '../../../board/useBoardSelectors';
import {
  SEGMENT_SLANT_DEG,
  extrudeBox,
  faceTransform,
  project,
  sevenSegmentShapes,
} from '../boardGeometry';
import { PartLabel } from './Silkscreen';
import { SEVEN_SEG } from '../boardPalette';

interface SevenSegment25DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

const PACKAGE_H = 2.6;

/**
 * DE2 seven-segment display in the 2.5D view: a raised PALE GREY package with
 * the digit printed on its top face.
 *
 * Same part and same materials as the 2D view — pale grey face, faint grey
 * unlit segments, orange-red when driven.
 *
 * Segments are ACTIVE-LOW (`0` lights a segment) and the raw array is
 * published on `data-segments`, identical to the 2D renderer — the DE2 HEX
 * regression suite reads that attribute in whichever view is active.
 */
export const SevenSegment25D: React.FC<SevenSegment25DProps> = React.memo(
  ({ component, detail }) => {
    const index = component.index ?? 0;
    const segments = useHexSegments(index);

    const { x, y, width: w, height: h } = component;
    const faceInset = 0.55;
    const digitPadX = 1.15;
    const digitPadY = 1.35;
    const digitW = w - faceInset * 2 - digitPadX * 2;
    const digitH = h - faceInset * 2 - digitPadY * 2;

    const shapes = useMemo(() => sevenSegmentShapes(digitW, digitH), [digitW, digitH]);
    const anyLit = segments.some((v) => isSegmentLit(v));

    const pkg = extrudeBox(x, y, w, h, PACKAGE_H);
    const halo = project(x + w / 2, y + h / 2, PACKAGE_H);

    return (
      <g
        data-testid={`de2-hex-${index}`}
        data-segments={JSON.stringify(segments)}
        role="img"
        aria-label={`HEX${index} seven-segment display`}
        pointerEvents="none"
      >
        {anyLit && (
          <ellipse cx={halo.x} cy={halo.y} rx={w * 1.5} ry={h} fill="url(#de2b-seg-halo)" />
        )}

        {/* Contact shadow on the board plane */}
        <g transform={faceTransform(0)}>
          <rect
            x={x - 0.3}
            y={y + 0.35}
            width={w + 1.3}
            height={h + 0.5}
            rx={0.55}
            fill="#02060C"
            opacity={0.38}
          />
        </g>

        {/* Raised pale-grey package */}
        <polygon points={pkg.side} fill={SEVEN_SEG.side} />
        <polygon points={pkg.front} fill={SEVEN_SEG.faceDark} />
        <polygon
          points={pkg.top}
          fill="url(#de2b-seg-face)"
          stroke={SEVEN_SEG.side}
          strokeWidth={0.14}
        />

        {/* Digit, printed on the package's top face */}
        <g transform={faceTransform(PACKAGE_H)}>
          <rect
            x={x + faceInset}
            y={y + faceInset}
            width={w - faceInset * 2}
            height={h - faceInset * 2 - 0.5}
            rx={0.25}
            fill="#000000"
            opacity={0.06}
          />
          <g
            transform={`translate(${x + faceInset + digitPadX} ${y + faceInset + digitPadY}) skewX(-${SEGMENT_SLANT_DEG})`}
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
                  stroke={lit ? SEVEN_SEG.onEdge : SEVEN_SEG.offEdge}
                  strokeWidth={0.1}
                  opacity={lit ? 1 : 0.5}
                />
              );
            })}
          </g>
          {hasDetail(detail, 'normal') && (
            <circle
              cx={x + w - faceInset - 0.7}
              cy={y + h - faceInset - 1.05}
              r={0.4}
              fill={SEVEN_SEG.off}
              stroke={SEVEN_SEG.offEdge}
              strokeWidth={0.08}
              opacity={0.5}
            />
          )}
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
