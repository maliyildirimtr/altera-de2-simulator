import React from 'react';
import type { BoardDetail, SilkscreenText } from '../../../board/de2Layout';
import { hasDetail } from '../../../board/de2Layout';
import { SILK } from '../boardPalette';

/**
 * Silkscreen rendering.
 *
 * One ink, four strengths. A real board is screen-printed with a single white
 * ink, so every piece of text here shares `SILK.ink` and hierarchy comes only
 * from size, weight and opacity. The `ref` tone is the DE2's one genuine
 * second ink: its reference designators are printed warmer and thinner.
 */

type Tone = NonNullable<SilkscreenText['tone']>;

const TONE_FILL: Record<Tone, string> = {
  primary: SILK.ink,
  secondary: SILK.ink,
  tertiary: SILK.ink,
  ref: SILK.ref,
};

const TONE_OPACITY: Record<Tone, number> = {
  primary: SILK.primary,
  secondary: SILK.secondary,
  tertiary: SILK.tertiary,
  ref: SILK.refOpacity,
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

    const tone = item.tone ?? 'secondary';
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

/** Small reference designator, e.g. `U1`, `J13`. High detail only. */
export const RefDes: React.FC<{
  x: number;
  y: number;
  text: string;
  detail: BoardDetail;
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
}> = React.memo(({ x, y, text, detail, anchor = 'middle', size = 1.65 }) => {
  if (!hasDetail(detail, 'high')) return null;
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontFamily={SILK_MONO_FONT}
      fontWeight={500}
      textAnchor={anchor}
      fill={SILK.ref}
      opacity={SILK.refOpacity}
      style={{ userSelect: 'none' }}
    >
      {text}
    </text>
  );
});
RefDes.displayName = 'RefDes';

/**
 * Bank label under a control or over an indicator, e.g. `SW0`, `LEDR12`.
 *
 * Monospaced on purpose: eighteen of these sit in a row at a fixed pitch, and
 * a proportional face makes that row look ragged.
 */
export const PartLabel: React.FC<{
  x: number;
  y: number;
  text: string;
  detail: BoardDetail;
  size?: number;
  minDetail?: BoardDetail;
}> = React.memo(({ x, y, text, detail, size = 1.8, minDetail = 'normal' }) => {
  if (!hasDetail(detail, minDetail)) return null;
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontFamily={SILK_MONO_FONT}
      fontWeight={500}
      textAnchor="middle"
      fill={SILK.ink}
      opacity={SILK.secondary}
      letterSpacing={-0.04}
      style={{ userSelect: 'none' }}
    >
      {text}
    </text>
  );
});
PartLabel.displayName = 'PartLabel';

/**
 * Contact shadow under a raised part. This is the cheapest and most effective
 * cue that a component is seated *in* the board rather than pasted on top of
 * it, so every raised body draws one.
 */
export const ContactShadow: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  /** 0..1; scale with package height. */
  strength?: number;
}> = React.memo(({ x, y, width, height, rx = 0.4, strength = 0.3 }) => (
  <rect
    x={x - 0.28}
    y={y - 0.12}
    width={width + 0.72}
    height={height + 0.62}
    rx={rx + 0.2}
    fill="#02060C"
    opacity={strength}
    pointerEvents="none"
  />
));
ContactShadow.displayName = 'ContactShadow';
