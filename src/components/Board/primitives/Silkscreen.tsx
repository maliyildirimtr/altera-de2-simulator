import React from 'react';
import type { BoardDetail, SilkscreenText } from '../../../board/de2Layout';
import { hasDetail } from '../../../board/de2Layout';
import { SILK } from '../boardPalette';

const TONE_FILL: Record<NonNullable<SilkscreenText['tone']>, string> = {
  white: SILK.white,
  dim: SILK.dim,
  ref: SILK.ref,
};

const TONE_OPACITY: Record<NonNullable<SilkscreenText['tone']>, number> = {
  white: 0.9,
  dim: 0.62,
  ref: 0.72,
};

const WEIGHT: Record<NonNullable<SilkscreenText['weight']>, number> = {
  normal: 500,
  bold: 700,
  black: 900,
};

export const SILK_FONT =
  'ui-sans-serif, -apple-system, "Segoe UI", Inter, Helvetica, Arial, sans-serif';
export const SILK_MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/** A single piece of board silkscreen, hidden below its minimum detail level. */
export const Silkscreen: React.FC<{ item: SilkscreenText; detail: BoardDetail }> = React.memo(
  ({ item, detail }) => {
    if (item.minDetail && !hasDetail(detail, item.minDetail)) return null;

    const tone = item.tone ?? 'white';
    return (
      <text
        x={item.x}
        y={item.y}
        fontSize={item.size}
        fontFamily={SILK_FONT}
        fontWeight={WEIGHT[item.weight ?? 'normal']}
        fontStyle={item.italic ? 'italic' : undefined}
        letterSpacing={item.letterSpacing}
        textAnchor={item.anchor ?? 'start'}
        fill={TONE_FILL[tone]}
        opacity={TONE_OPACITY[tone]}
        transform={item.rotation ? `rotate(${item.rotation} ${item.x} ${item.y})` : undefined}
        style={{ userSelect: 'none' }}
      >
        {item.text}
      </text>
    );
  },
);
Silkscreen.displayName = 'Silkscreen';

/** Draws a list of silkscreen items for the current detail level. */
export const SilkscreenLayer: React.FC<{ items: SilkscreenText[]; detail: BoardDetail }> =
  React.memo(({ items, detail }) => (
    <g aria-hidden="true" pointerEvents="none">
      {items.map((item) => (
        <Silkscreen key={item.id} item={item} detail={detail} />
      ))}
    </g>
  ));
SilkscreenLayer.displayName = 'SilkscreenLayer';

/** Small yellow reference designator, e.g. `U1`, `J13`. Only at high detail. */
export const RefDes: React.FC<{
  x: number;
  y: number;
  text: string;
  detail: BoardDetail;
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
}> = React.memo(({ x, y, text, detail, anchor = 'middle', size = 1.7 }) => {
  if (!hasDetail(detail, 'high')) return null;
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontFamily={SILK_MONO_FONT}
      fontWeight={600}
      textAnchor={anchor}
      fill={SILK.ref}
      opacity={0.66}
      style={{ userSelect: 'none' }}
    >
      {text}
    </text>
  );
});
RefDes.displayName = 'RefDes';

/** Bank label under an indicator or control, e.g. `SW0`, `LEDR12`. */
export const PartLabel: React.FC<{
  x: number;
  y: number;
  text: string;
  detail: BoardDetail;
  size?: number;
  minDetail?: BoardDetail;
}> = React.memo(({ x, y, text, detail, size = 1.85, minDetail = 'normal' }) => {
  if (!hasDetail(detail, minDetail)) return null;
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontFamily={SILK_MONO_FONT}
      fontWeight={600}
      textAnchor="middle"
      fill={SILK.white}
      opacity={0.78}
      style={{ userSelect: 'none' }}
    >
      {text}
    </text>
  );
});
PartLabel.displayName = 'PartLabel';
