import React from 'react';
import {
  DE2_ARTWORK_PATCH_SRC,
  HEX_CX,
  LED_GREEN_8,
  LED_GREEN_BANK_CX,
  LED_RED_CX,
  SILK_MASKS,
  SILK_MASK_FILL,
  SILK_PATCH,
  SILK_TEXT,
  ax,
  ay,
} from '../../../board/de2ArtworkLayout';

/**
 * Corrections for mistakes printed into the board artwork.
 *
 * ── Why this layer exists ─────────────────────────────────────────────────
 * The artwork is the visual source of truth and is never edited, but it has
 * errors baked into its pixels: several LED designators are misspelt, the
 * green bank's labels are shifted by one so LEDG6 is missing and one lens
 * reads "LED62", the HEX labels sit up to 38 px right of the digits they
 * name, and a "Text" placeholder was left on two capacitors beside the LCD.
 *
 * A live overlay cannot fix any of that, because none of it is state — it is
 * printing. So this layer masks each wrong region with the board colour
 * measured underneath it and prints the correct silkscreen as SVG, which is
 * the same thing the live overlays already do for the artwork's baked-in LED
 * and display state.
 *
 * ── What it must never do ─────────────────────────────────────────────────
 * It draws NO component, NO lens and NO display. It changes no position: every
 * label is centred on the exact calibrated coordinate its live part uses, so
 * a designator and the thing it names cannot disagree. The masks are bounded
 * to the glyph rows they cover and touch no pad, trace or part.
 *
 * ── Why the text has an explicit width ────────────────────────────────────
 * Each label is drawn with `textLength`, so its width is decided by the
 * calibration rather than by whichever condensed font a given machine happens
 * to have. That keeps the row visually even and makes it impossible for a
 * label to overflow into its neighbour on a system missing the preferred face.
 */

/**
 * Condensed technical sans, with `font-stretch` for faces that support it.
 * The fallbacks are ordered from most to least condensed; `textLength` then
 * normalises whatever actually resolves, so the printed result is the same
 * width either way.
 */
const SILK_FONT =
  "'DIN Alternate', 'Roboto Condensed', 'Arial Narrow', 'Liberation Sans Narrow', 'Helvetica Neue', Arial, sans-serif";

interface LabelProps {
  /** Normalised centre x — the same value the live part is drawn at. */
  cx: number;
  /** Normalised baseline y. */
  baseline: number;
  text: string;
}

/**
 * One piece of replacement silkscreen. Deliberately plain: a single fill, no
 * stroke, no shadow and no glow, because real silkscreen is flat ink and
 * anything else immediately reads as user interface rather than as board.
 */
const SilkLabel: React.FC<LabelProps> = React.memo(({ cx, baseline, text }) => {
  const width = ax(SILK_TEXT.charWidth) * text.length;
  return (
    <text
      x={ax(cx)}
      y={ay(baseline)}
      textLength={width}
      lengthAdjust="spacingAndGlyphs"
      fontSize={ay(SILK_TEXT.fontSize)}
      fontFamily={SILK_FONT}
      fontWeight={600}
      textAnchor="middle"
      fill={SILK_TEXT.fill}
      style={{ userSelect: 'none', fontStretch: 'condensed' }}
    >
      {text}
    </text>
  );
});
SilkLabel.displayName = 'SilkLabel';

export const SilkscreenCorrections: React.FC = React.memo(() => (
  <g data-testid="de2-silk-corrections" pointerEvents="none" aria-hidden="true">
    {/*
      The "Text" placeholder lies across two capacitors, an IC and a silver
      part, so board colour would destroy more than it fixed. This patch was
      built from the artwork itself: the obscured capacitor was rebuilt from
      its clean twin, and only the remaining board and IC pixels were
      reconstructed. It covers exactly the placeholder's rectangle.
    */}
    <image
      data-silk-patch="text-placeholder"
      href={DE2_ARTWORK_PATCH_SRC}
      x={ax(SILK_PATCH.x)}
      y={ay(SILK_PATCH.y)}
      width={ax(SILK_PATCH.width)}
      height={ay(SILK_PATCH.height)}
      preserveAspectRatio="none"
      pointerEvents="none"
      style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
    />

    {/* Board colour over the misprinted designator rows. */}
    <g data-silk-masks="">
      {SILK_MASKS.map((m) => (
        <rect
          key={m.id}
          data-silk-mask={m.id}
          x={ax(m.x)}
          y={ay(m.y)}
          width={ax(m.width)}
          height={ay(m.height)}
          fill={SILK_MASK_FILL}
        />
      ))}
    </g>

    {/* ── Correct designators ──
        Indices run high to low, left to right, exactly as the live banks do,
        and each label reads its centre from the same array its part does. */}
    <g data-silk-labels="ledr">
      {LED_RED_CX.map((cx, i) => {
        const index = LED_RED_CX.length - 1 - i;
        return (
          <SilkLabel
            key={`ledr-${index}`}
            cx={cx}
            baseline={SILK_TEXT.ledBaseline}
            text={`LEDR${index}`}
          />
        );
      })}
    </g>

    <g data-silk-labels="ledg">
      {/* LEDG8 sits on its own, up by the HEX row, so it gets its own baseline
          and is not part of the bank below. */}
      <SilkLabel cx={LED_GREEN_8.cx} baseline={SILK_TEXT.ledG8Baseline} text="LEDG8" />
      {LED_GREEN_BANK_CX.map((cx, i) => {
        const index = LED_GREEN_BANK_CX.length - 1 - i;
        return (
          <SilkLabel
            key={`ledg-${index}`}
            cx={cx}
            baseline={SILK_TEXT.ledBaseline}
            text={`LEDG${index}`}
          />
        );
      })}
    </g>

    <g data-silk-labels="hex">
      {HEX_CX.map((cx, i) => {
        const index = HEX_CX.length - 1 - i;
        return (
          <SilkLabel
            key={`hex-${index}`}
            cx={cx}
            baseline={SILK_TEXT.hexBaseline}
            text={`HEX${index}`}
          />
        );
      })}
    </g>
  </g>
));
SilkscreenCorrections.displayName = 'SilkscreenCorrections';
