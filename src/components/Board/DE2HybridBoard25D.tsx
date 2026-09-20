import React from 'react';
import {
  HEX_CX,
  KEY_CX,
  LED_GREEN_8,
  LED_GREEN_BANK_CX,
  LED_RED_CX,
  SWITCH_CX,
  raisedPart,
} from '../../board/de2ArtworkLayout';
import { SCENE, SCENE_VIEWBOX_ATTR } from '../../board/de2Scene25D';
import {
  ArtworkOverlayDefs,
  HexOverlay,
  KeyOverlay,
  LcdOverlay,
  LedOverlay,
  SwitchOverlay,
} from './primitives/ArtworkOverlays';
import {
  BoardPlane25D,
  BoardShadow25D,
  PcbBody25D,
  RaisedGroup25D,
  Scene25DDefs,
} from './primitives/Artwork25D';
import { SilkHexLabels, SilkscreenCorrections } from './primitives/SilkscreenCorrections';

/**
 * Artwork-driven 2.5D DE2 board: the approved 2D board, given shallow
 * physical depth.
 *
 * ── What this renderer is ────────────────────────────────────────────────
 * It is not a second DE2, and not a redrawn one. Every pixel of hardware here
 * comes from the same render as the 2D view — the transparent master, which is
 * that render uncropped — and every live value comes from the same store
 * through the same overlay components the 2D view mounts. What this file adds
 * is one projection and a decision, per part, about how far off the board it
 * sits.
 *
 * Switching 2D -> 2.5D therefore cannot change what the board says. There is
 * no second copy of switch state, key state, LED state, HEX state, LCD state
 * or the clock to fall out of step, because there is no second copy of
 * anything: `boardStore` is the only source, and these are the same
 * subscribers.
 *
 * ── Why the overlays need no 2.5D variants ───────────────────────────────
 * At height zero the projection collapses to a vertical scale about the
 * board's centre line, and at any other height it is that scale plus an
 * offset. Both are a single SVG transform on a `<g>`. So an overlay placed in
 * the raised plane of the part it belongs to lands on that part's top face
 * while still being drawn in plain artwork coordinates — `HexOverlay` does not
 * know its display has been lifted 7 mm, and `SwitchOverlay`'s lever stays in
 * its channel because the channel moved with it.
 *
 * It also means the browser does the hit testing. The switches and keys are
 * the same interactive elements as in 2D, inside a transformed group, so
 * pointer events land correctly with no inverse projection anywhere in this
 * codebase.
 *
 * ── Draw order ───────────────────────────────────────────────────────────
 * Back to front, which for a board tilted away from the viewer means down the
 * board. The raised groups happen not to overlap each other, so this is the
 * painter's order without needing a depth sort:
 *
 *   shadow -> substrate -> board plane -> connectors -> GPIO -> FPGA ->
 *   LCD -> SD socket -> HEX -> switches -> keys
 *
 * ── What is deliberately flat ────────────────────────────────────────────
 * The LEDs, the silkscreen, and every small passive. An LED lens stands 0.9 mm
 * off the board, which at this tilt projects to less than a pixel: lifting it
 * would add 27 crops and 27 seams to move nothing. They are drawn on the board
 * plane by the same overlays the 2D view uses, so their lenses stay registered
 * to the artwork exactly as calibrated.
 */
export const DE2HybridBoard25D: React.FC = React.memo(() => (
  <svg
    data-testid="de2-board-2-5d"
    data-board-view="2.5d"
    data-board-presentation="artwork"
    data-scene-tilt={SCENE.tiltDeg}
    className="de2-board-svg de2-board-svg--iso"
    viewBox={SCENE_VIEWBOX_ATTR}
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    role="group"
    aria-label="Altera DE2 development board, elevated view"
  >
    <Scene25DDefs />
    <ArtworkOverlayDefs />

    <BoardShadow25D />
    <PcbBody25D />

    {/*
      The board surface. The silkscreen corrections ride on it, in their own
      calibrated positions, because printed ink is part of the board and not a
      part standing on it.
    */}
    <BoardPlane25D>
      <SilkscreenCorrections />
      <g data-overlay="led">
        {LED_RED_CX.map((cx, i) => (
          <LedOverlay
            key={`ledr-${LED_RED_CX.length - 1 - i}`}
            cx={cx}
            index={LED_RED_CX.length - 1 - i}
            kind="red"
          />
        ))}
        {/* LEDG8 stands alone between the HEX bank and the green row, as on
            the real board — not a ninth member of the row below. */}
        <LedOverlay cx={LED_GREEN_8.cx} index={8} kind="green" />
        {LED_GREEN_BANK_CX.map((cx, i) => (
          <LedOverlay
            key={`ledg-${LED_GREEN_BANK_CX.length - 1 - i}`}
            cx={cx}
            index={LED_GREEN_BANK_CX.length - 1 - i}
            kind="green"
          />
        ))}
      </g>
    </BoardPlane25D>

    {/* Tall hardware along the top edge. The transparent master is what makes
        this possible: these parts overhang the substrate on the real board,
        and the cropped 2D artwork does not contain the overhang. */}
    <RaisedGroup25D group={raisedPart('connectors')} />
    <RaisedGroup25D group={raisedPart('gpio')} />

    <RaisedGroup25D group={raisedPart('fpga')} />

    {/* The LCD rises as one module — frame, bezel and glass together. The live
        characters are drawn on its projected glass by the same overlay, and
        the same HD44780 decoder, that the 2D view uses. */}
    <RaisedGroup25D group={raisedPart('lcd')}>
      <LcdOverlay />
    </RaisedGroup25D>

    <RaisedGroup25D group={raisedPart('sdcard')} />

    {/*
      Three housings, eight digits. The segment overlays sit on the top face of
      the module each digit belongs to.

      The HEX designators ride up with the modules. They are the one piece of
      silkscreen on this board printed ABOVE the part it names rather than
      below it, so a display standing 7 mm proud covers its own label — the
      board would be truthful and the labels would be gone. Lifting the row
      with the modules keeps each designator where it is readable, directly
      over its display, at every tilt. `SilkscreenCorrections` still draws the
      flat copy; the module covers it.
    */}
    <RaisedGroup25D group={raisedPart('hex')}>
      <SilkHexLabels />
      <g data-overlay="hex">
        {HEX_CX.map((cx, i) => (
          <HexOverlay key={`hex-${HEX_CX.length - 1 - i}`} cx={cx} index={HEX_CX.length - 1 - i} />
        ))}
      </g>
    </RaisedGroup25D>

    {/* The controls come last: nearest the viewer, and the only things here
        that are touched. */}
    <RaisedGroup25D group={raisedPart('switches')}>
      <g data-overlay="input">
        {SWITCH_CX.map((cx, i) => (
          <SwitchOverlay
            key={`sw-${SWITCH_CX.length - 1 - i}`}
            cx={cx}
            index={SWITCH_CX.length - 1 - i}
          />
        ))}
      </g>
    </RaisedGroup25D>

    <RaisedGroup25D group={raisedPart('keys')}>
      <g data-overlay="input">
        {KEY_CX.map((cx, i) => (
          <KeyOverlay key={`key-${KEY_CX.length - 1 - i}`} cx={cx} index={KEY_CX.length - 1 - i} />
        ))}
      </g>
    </RaisedGroup25D>
  </svg>
));
DE2HybridBoard25D.displayName = 'DE2HybridBoard25D';
