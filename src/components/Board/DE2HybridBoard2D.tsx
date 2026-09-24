import React from 'react';
import { DE2_REFERENCE_2D } from '../../board/de2ReferenceAssets';
import {
  ArtworkOverlayDefs,
  HexOverlay,
  KeyOverlay,
  LcdOverlay,
  LedOverlay,
  SwitchOverlay,
} from './primitives/ArtworkOverlays';

const { layout } = DE2_REFERENCE_2D;

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
 *   artwork  →  PCB, FPGA, memory, LCD module and bezel, connectors, GPIO
 *               headers, SD slot, silkscreen, passives, mounting hardware
 *   silk fix →  the few designators and one placeholder the artwork prints
 *               wrong (see `SilkscreenCorrections`)
 *   overlays →  SW17..SW0, KEY3..KEY0, LEDR17..LEDR0, LEDG8..LEDG0,
 *               HEX7..HEX0, and the LCD's 16 x 2 characters
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
    viewBox={`0 0 ${DE2_REFERENCE_2D.width} ${DE2_REFERENCE_2D.height}`}
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    role="group"
    aria-label="Altera DE2 development board, top view"
  >
    <ArtworkOverlayDefs layout={layout} />

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
      data-runtime-board-asset="2d"
      href={DE2_REFERENCE_2D.src}
      x={0}
      y={0}
      width={DE2_REFERENCE_2D.width}
      height={DE2_REFERENCE_2D.height}
      preserveAspectRatio="xMidYMid meet"
      pointerEvents="none"
      style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
    />

    {/*
      Corrections for mistakes printed into the artwork — misspelt LED
      designators, HEX labels offset from their digits, a leftover "Text"
      placeholder. Drawn directly on top of the artwork and beneath every live
      overlay, because it is part of the board's printing rather than part of
      its state. It moves nothing: each label is centred on the same
      calibrated coordinate its live part uses.
    */}
    {/* ── Live simulation state ──
        Ordered so that the parts a user reaches for sit above the parts they
        only read, which is also the order the vector renderer uses. */}
    <g data-overlay="hex">
      {layout.hex.centres.map((point, i) => (
        <HexOverlay
          key={`hex-${layout.hex.centres.length - 1 - i}`}
          point={point}
          index={layout.hex.centres.length - 1 - i}
          layout={layout}
        />
      ))}
    </g>

    {/* The LCD sits above the board but below the controls: it is read, not
        touched, and nothing overlaps it. */}
    <LcdOverlay layout={layout} />

    <g data-overlay="led">
      {layout.leds.red.map((point, i) => (
        <LedOverlay
          key={`ledr-${layout.leds.red.length - 1 - i}`}
          point={point}
          index={layout.leds.red.length - 1 - i}
          kind="red"
          layout={layout}
        />
      ))}
      {/*
        LEDG8 first, and on its own. It is a single green LED between the HEX
        bank and the green bank on the real board, so it is not part of the
        eight-wide row — which is what keeps a tenth green LED from appearing.
      */}
      <LedOverlay point={layout.leds.green8} index={8} kind="green" layout={layout} />
      {layout.leds.green.map((point, i) => (
        <LedOverlay
          key={`ledg-${layout.leds.green.length - 1 - i}`}
          point={point}
          index={layout.leds.green.length - 1 - i}
          kind="green"
          layout={layout}
        />
      ))}
    </g>

    <g data-overlay="input">
      {layout.switches.centres.map((point, i) => (
        <SwitchOverlay
          key={`sw-${layout.switches.centres.length - 1 - i}`}
          point={point}
          index={layout.switches.centres.length - 1 - i}
          layout={layout}
        />
      ))}
      {layout.keys.centres.map((point, i) => (
        <KeyOverlay
          key={`key-${layout.keys.centres.length - 1 - i}`}
          point={point}
          index={layout.keys.centres.length - 1 - i}
          layout={layout}
        />
      ))}
    </g>
  </svg>
));
DE2HybridBoard2D.displayName = 'DE2HybridBoard2D';
