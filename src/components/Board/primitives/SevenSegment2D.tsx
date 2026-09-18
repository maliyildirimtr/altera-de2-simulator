import React, { useMemo } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK, hasDetail } from '../../../board/de2Layout';
import { isSegmentLit, useHexSegments } from '../../../board/useBoardSelectors';
import { sevenSegmentShapes, SEGMENT_SLANT_DEG } from '../boardGeometry';
import { ContactShadow, PartLabel } from './Silkscreen';
import { SEVEN_SEG } from '../boardPalette';

interface SevenSegment2DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/**
 * DE2 seven-segment display HEX7..HEX0, flat top view.
 *
 * The DE2's displays have a PALE GREY face. Unlit segments read as faint grey
 * shapes printed on that face; driven segments are a saturated orange-red.
 * An earlier pass drew a dark-red package with a recessed black window, which
 * is a visibly cheaper class of part than the board actually carries — see the
 * orthographic scan and the powered-board photograph.
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
    // The digit occupies the whole package face; there is no dark window.
    const faceInset = 0.55;
    const digitPadX = 1.15;
    const digitPadY = 1.35;
    const digitW = w - faceInset * 2 - digitPadX * 2;
    const digitH = h - faceInset * 2 - digitPadY * 2;

    const shapes = useMemo(() => sevenSegmentShapes(digitW, digitH), [digitW, digitH]);
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
            x={x - w * 0.34}
            y={y - h * 0.28}
            width={w * 1.68}
            height={h * 1.56}
            fill="url(#de2b-seg-halo)"
          />
        )}

        <ContactShadow x={x} y={y} width={w} height={h} rx={0.45} strength={0.36} />

        {/* Pale grey moulded package */}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={0.45}
          fill="url(#de2b-seg-face)"
          stroke={SEVEN_SEG.side}
          strokeWidth={0.16}
        />
        {/* Moulding highlight along the top edge */}
        <rect
          x={x + 0.4}
          y={y + 0.26}
          width={w - 0.8}
          height={0.3}
          rx={0.15}
          fill="#FFFFFF"
          opacity={0.45}
        />
        {/* Shallow recess the digit is printed into */}
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

        {/* Decimal point — present on the package, not wired on the DE2 */}
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
