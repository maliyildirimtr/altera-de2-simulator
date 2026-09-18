import React from 'react';
import {
  ARTWORK_VIEWBOX,
  DE2_ARTWORK,
  DE2_ARTWORK_SRC,
  HEX_CX,
  KEY_CX,
  LED_GREEN_CX,
  LED_RED_CX,
  SWITCH_CX,
} from '../../board/de2ArtworkLayout';
import {
  ArtworkOverlayDefs,
  HexOverlay,
  KeyOverlay,
  LedOverlay,
  SwitchOverlay,
} from './primitives/ArtworkOverlays';

/**
 * Artwork-based 2D DE2 board: a premium render of the real hardware with live
 * simulation overlays on top.
 *
 * ── Why a hybrid ─────────────────────────────────────────────────────────
 * A vector board can be accurate and it can be pretty, but it cannot be
 * photographic — there is no amount of gradient work that reproduces moulded
 * plastic, brushed nickel and solder mask. A raster render can. What a raster
 * cannot do is change, so the two are layered: the artwork supplies the board
 * and every part whose appearance is fixed, and SVG supplies the five families
 * whose appearance is simulation state.
 *
 *   artwork  →  PCB, FPGA, memory, LCD body, connectors, GPIO headers,
 *               SD slot, silkscreen, passives, mounting hardware
 *   overlays →  SW17..SW0, KEY3..KEY0, LEDR17..LEDR0, LEDG8..LEDG0, HEX7..HEX0
 *
 * ── Why it is one SVG rather than stacked divs ───────────────────────────
 * The whole thing is a single SVG with the artwork placed as an `<image>`
 * inside it. That buys three properties for free, none of which needs any
 * pixel arithmetic:
 *
 *   - alignment: the artwork and the overlays share one coordinate space by
 *     construction, so they cannot drift apart at any scale;
 *   - responsiveness: the viewBox handles zoom, fit-to-view and window
 *     resizing, so the overlays track the artwork through all of them;
 *   - integration: it is the same shape of component as the vector renderer,
 *     so the existing viewport transform, pan isolation and focus handling
 *     work unchanged.
 *
 * Overlay positions come from `de2ArtworkLayout.ts` as normalised fractions of
 * the artwork. There are no hardcoded viewport pixels anywhere in this layer,
 * and nothing here reads the canonical millimetre layout — the calibration
 * module is the only place the two coordinate systems meet.
 *
 * ── What this renderer must not become ───────────────────────────────────
 * It draws no second housings, no second lenses and no second display bodies.
 * If something in the artwork looks wrong, the fix is a new artwork export or
 * a calibration change, not another shape painted over the top.
 */
export const DE2HybridBoard2D: React.FC = React.memo(() => (
  <svg
    data-board-view="2d"
    data-board-presentation="artwork"
    className="de2-board-svg"
    viewBox={ARTWORK_VIEWBOX}
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    role="group"
    aria-label="Altera DE2 development board, top view"
  >
    <ArtworkOverlayDefs />

    {/*
      Static board artwork.

      `pointerEvents="none"` keeps every click reaching the overlay hit areas
      above it, and the two `user-select` / `-webkit-user-drag` properties stop
      the browser treating it as a draggable, selectable image — without them a
      slow drag on the board lifts a ghost thumbnail instead of panning.

      It is deliberately NOT marked aria-hidden inside a labelled group: the
      group carries the board's accessible name, and the interactive overlays
      carry their own roles, so the image needs no separate announcement.
    */}
    <image
      href={DE2_ARTWORK_SRC}
      x={0}
      y={0}
      width={DE2_ARTWORK.width}
      height={DE2_ARTWORK.height}
      preserveAspectRatio="xMidYMid meet"
      pointerEvents="none"
      style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
    />

    {/* ── Live simulation state ──
        Ordered so that the parts a user reaches for sit above the parts they
        only read, which is also the order the vector renderer uses. */}
    <g data-overlay="hex">
      {HEX_CX.map((cx, i) => (
        <HexOverlay key={`hex-${HEX_CX.length - 1 - i}`} cx={cx} index={HEX_CX.length - 1 - i} />
      ))}
    </g>

    <g data-overlay="led">
      {LED_RED_CX.map((cx, i) => (
        <LedOverlay
          key={`ledr-${LED_RED_CX.length - 1 - i}`}
          cx={cx}
          index={LED_RED_CX.length - 1 - i}
          kind="red"
        />
      ))}
      {LED_GREEN_CX.map((cx, i) => (
        <LedOverlay
          key={`ledg-${LED_GREEN_CX.length - 1 - i}`}
          cx={cx}
          index={LED_GREEN_CX.length - 1 - i}
          kind="green"
        />
      ))}
    </g>

    <g data-overlay="input">
      {SWITCH_CX.map((cx, i) => (
        <SwitchOverlay
          key={`sw-${SWITCH_CX.length - 1 - i}`}
          cx={cx}
          index={SWITCH_CX.length - 1 - i}
        />
      ))}
      {KEY_CX.map((cx, i) => (
        <KeyOverlay key={`key-${KEY_CX.length - 1 - i}`} cx={cx} index={KEY_CX.length - 1 - i} />
      ))}
    </g>
  </svg>
));
DE2HybridBoard2D.displayName = 'DE2HybridBoard2D';
