import React, { useState } from 'react';
import { DE2_REFERENCE_25D } from '../../board/de2ReferenceAssets';
import type { InputOverlayCalibrationSet } from '../../board/de2ReferenceAssets';
import {
  HEX_CX,
  KEY_CX,
  LED_GREEN_8,
  LED_GREEN_BANK_CX,
  LED_RED_CX,
  SWITCH_CX,
  raisedGroup,
  raisedPartById,
} from '../../board/de2ArtworkLayout';
import type { RaisedPart } from '../../board/de2ArtworkLayout';
import {
  CAMERA,
  PERSPECTIVE,
  PIVOT,
  SCENE,
  SCENE_FIT,
  STAGE,
  zUnits,
} from '../../board/de2Scene3D';
import {
  ArtworkOverlayDefs,
  HexOverlay,
  KeyOverlay,
  LcdOverlay,
  LedOverlay,
  SwitchOverlay,
} from './primitives/ArtworkOverlays';
import { useKeyPressed } from '../../board/useBoardSelectors';
import {
  BoardShadow3D,
  BoardSurface3D,
  GroundPlane3D,
  PcbSlab3D,
  RaisedPart3D,
  RaisedPlane3D,
  Standoffs3D,
} from './primitives/BoardScene3D';
import { SilkHexLabels, SilkscreenCorrections } from './primitives/SilkscreenCorrections';
import { DE225DCalibrationTool } from './DE225DCalibrationTool';

const reference25dLayout = DE2_REFERENCE_25D.layout;
const reference25dInputs = DE2_REFERENCE_25D.inputCalibration!;

/**
 * The user-supplied 2.5D PNG is the runtime board itself. Its camera angle,
 * depth and standoffs are already baked into the image, so no CSS perspective
 * or reconstructed component geometry is applied. The only extra layer is the
 * live simulator state, calibrated in the PNG's native pixel coordinates.
 */
export const DE2CssBoard25D: React.FC = React.memo(() => {
  const [inputCalibration, setInputCalibration] = useState<InputOverlayCalibrationSet>(
    reference25dInputs,
  );

  return (
    <svg
    data-testid="de2-board-2-5d"
    data-board-view="2.5d"
    data-board-presentation="artwork"
    className="de2-board-svg de2-board-25d"
    viewBox={`0 0 ${DE2_REFERENCE_25D.width} ${DE2_REFERENCE_25D.height}`}
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    role="group"
    aria-label="Altera DE2 development board, 2.5D reference view"
    style={{ filter: 'drop-shadow(0 22px 24px rgba(0, 0, 0, 0.28))' }}
  >
    <ArtworkOverlayDefs layout={reference25dLayout} />

    <image
      data-runtime-board-asset="2.5d"
      href={DE2_REFERENCE_25D.src}
      x={0}
      y={0}
      width={DE2_REFERENCE_25D.width}
      height={DE2_REFERENCE_25D.height}
      preserveAspectRatio="xMidYMid meet"
      pointerEvents="none"
      style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
    />

    <g data-overlay="hex">
      {reference25dLayout.hex.centres.map((point, i) => (
        <HexOverlay
          key={`hex-${reference25dLayout.hex.centres.length - 1 - i}`}
          point={point}
          index={reference25dLayout.hex.centres.length - 1 - i}
          layout={reference25dLayout}
          calibration={DE2_REFERENCE_25D.hexCalibration?.[reference25dLayout.hex.centres.length - 1 - i]}
        />
      ))}
    </g>

    <LcdOverlay
      layout={reference25dLayout}
      calibration={DE2_REFERENCE_25D.lcdCalibration}
    />

    <g data-overlay="led">
      {reference25dLayout.leds.red.map((point, i) => (
        <LedOverlay
          key={`ledr-${reference25dLayout.leds.red.length - 1 - i}`}
          point={point}
          index={reference25dLayout.leds.red.length - 1 - i}
          kind="red"
          layout={reference25dLayout}
        />
      ))}
      <LedOverlay
        point={reference25dLayout.leds.green8}
        index={8}
        kind="green"
        layout={reference25dLayout}
      />
      {reference25dLayout.leds.green.map((point, i) => (
        <LedOverlay
          key={`ledg-${reference25dLayout.leds.green.length - 1 - i}`}
          point={point}
          index={reference25dLayout.leds.green.length - 1 - i}
          kind="green"
          layout={reference25dLayout}
        />
      ))}
    </g>

    <g data-overlay="input">
      {reference25dLayout.switches.centres.map((point, i) => (
        <SwitchOverlay
          key={`sw-${reference25dLayout.switches.centres.length - 1 - i}`}
          point={point}
          index={reference25dLayout.switches.centres.length - 1 - i}
          layout={reference25dLayout}
          calibration={inputCalibration.switches[reference25dLayout.switches.centres.length - 1 - i]}
        />
      ))}
      {reference25dLayout.keys.centres.map((point, i) => (
        <KeyOverlay
          key={`key-${reference25dLayout.keys.centres.length - 1 - i}`}
          point={point}
          index={reference25dLayout.keys.centres.length - 1 - i}
          layout={reference25dLayout}
          calibration={inputCalibration.keys[reference25dLayout.keys.centres.length - 1 - i]}
        />
      ))}
    </g>

    <DE225DCalibrationTool
      width={DE2_REFERENCE_25D.width}
      height={DE2_REFERENCE_25D.height}
      value={inputCalibration}
      onChange={setInputCalibration}
    />
    </svg>
  );
});
DE2CssBoard25D.displayName = 'DE2CssBoard25D';

/**
 * Artwork-driven 2.5D DE2 board, under a real perspective camera.
 *
 * ── The hierarchy, and why each level exists ─────────────────────────────
 *
 *   BoardViewport            zoom / pan / fit          (an ancestor, not here)
 *     └ root                 fills the render box
 *        └ fit               scale(SCENE_FIT), CONSTANT
 *           └ camera         perspective + perspective-origin
 *              └ stage       preserve-3d, rotateX / rotateY
 *                 ├ ground              the surface, a standoff below
 *                 ├ shadow               cast on that surface
 *                 ├ standoffs            four brass barrels holding it up
 *                 ├ PCB slab             top face + near edge + right edge
 *                 ├ board surface        masked artwork + LEDs + silkscreen
 *                 └ raised parts         each at its own translateZ
 *
 * The `fit` level is the load-bearing one. Because it sits OUTSIDE the
 * perspective container, the projection is computed in scene units and then
 * the flattened picture is scaled — first by this constant, then by the
 * viewport's zoom. So the camera angle cannot change with zoom. Measured at
 * 0.6x, 1.0x and 1.5x, every zoom-normalised length is identical to three
 * decimals; `de2Scene3D.ts` records the figures. Putting a scale on the stage
 * instead would move the board relative to the camera and break exactly that.
 *
 * ── One simulation, three renderers ─────────────────────────────────────
 * Nothing here holds simulation state. The overlays are not 2.5D variants —
 * they are the same components the 2D board mounts, nested inside the physical
 * part they belong to, so they inherit that part's 3D transform and land on
 * its top face without any projection maths of their own. Switching view
 * cannot change what the board says, because there is no second copy of
 * anything to fall out of step.
 *
 * Hit testing is the browser's: a switch is the same interactive element as in
 * 2D, inside a transformed 3D group, so clicks land where the switch is drawn
 * and there is no inverse-perspective code anywhere in this codebase.
 *
 * ── Occlusion ────────────────────────────────────────────────────────────
 * `preserve-3d` on the stage means depth decides overlap, not paint order or
 * z-index. A raised connector covers the board behind its footprint because it
 * is physically in front of it.
 */

/**
 * Everything the scene lifts, in ONE list.
 *
 * The mask that removes components from the base artwork and the crops that
 * redraw them above it both read this array, so a hole can never be punched
 * for a part that is still flat, and a part can never be lifted while its
 * original stays behind. Adding a part to the scene is one edit.
 */
const RAISED: readonly RaisedPart[] = [
  ...raisedGroup('connectors'),
  ...raisedGroup('gpio'),
  raisedPartById('fpga'),
  raisedPartById('lcd'),
  raisedPartById('sdcard'),
  ...raisedGroup('hex'),
  ...raisedGroup('switches'),
  ...raisedGroup('keys'),
];

/** Which HEX digits each physical module carries, in silkscreen order. */
const HEX_MODULE_DIGITS: Record<string, readonly number[]> = {
  'hex-76': [7, 6],
  'hex-54': [5, 4],
  'hex-3210': [3, 2, 1, 0],
};

/**
 * One tact switch, whose height is its state.
 *
 * Pressing it moves it DOWN in Z rather than down the screen — the button
 * physically sinks toward the board, and the camera turns that into the
 * correct small displacement and size change for wherever it sits on the
 * board. This is the case CSS 3D pays for.
 *
 * Only the body's height changes. `KeyOverlay` still owns the plunger and the
 * active-low reading of the store, untouched.
 */
const RaisedKey3D: React.FC<{ part: RaisedPart; index: number }> = React.memo(
  ({ part, index }) => {
    const pressed = useKeyPressed(index);
    const travel = zUnits(0.8);
    return (
      <RaisedPart3D part={part} zOverride={pressed ? zUnits(part.heightMm) - travel : undefined}>
        <KeyOverlay cx={KEY_CX[3 - index]} index={index} />
      </RaisedPart3D>
    );
  },
);
RaisedKey3D.displayName = 'RaisedKey3D';

const DE2CssBoard25DLegacy: React.FC = React.memo(() => (
  <div
    data-testid="de2-board-2-5d"
    data-board-view="2.5d"
    data-board-presentation="artwork"
    data-scene-camera-tilt={CAMERA.rotateXDeg}
    className="de2-board-25d"
    role="group"
    aria-label="Altera DE2 development board, elevated view"
    style={{ position: 'relative', width: '100%', height: '100%' }}
  >
    {/*
      Paint servers for the live overlays, once for the whole scene.

      Inline SVG in an HTML document shares one id space, so a gradient
      defined here resolves from any overlay SVG in the tree — and the
      overlays are now spread across several, one per raised part.
    */}
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <ArtworkOverlayDefs />
    </svg>

    {/*
      Scene -> render box. Constant, and outside the camera: this is what
      makes the projection immune to the viewport's zoom.
    */}
    <div
      data-scene-fit={SCENE_FIT.toFixed(6)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: SCENE.width,
        height: SCENE.height,
        transform: `scale(${SCENE_FIT})`,
        transformOrigin: '0 0',
      }}
    >
      {/* The camera. */}
      <div
        data-scene-perspective={PERSPECTIVE}
        style={{
          position: 'absolute',
          inset: 0,
          perspective: `${PERSPECTIVE}px`,
          perspectiveOrigin: `${SCENE.originX}px ${SCENE.originY}px`,
        }}
      >
        {/* The board, in space. */}
        <div
          data-scene-stage=""
          style={{
            position: 'absolute',
            left: SCENE.stageLeft,
            top: SCENE.stageTop,
            width: STAGE.width,
            height: STAGE.height,
            transformStyle: 'preserve-3d',
            transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`,
            transform: `rotateX(${CAMERA.rotateXDeg}deg) rotateY(${CAMERA.rotateYDeg}deg)`,
          }}
        >
          {/*
            Physical grounding, from the surface up: the desk, the board's
            shadow on it, and the four standoffs holding the board above it.
            Without these the board is a very well projected image; with them
            it is an object somewhere.
          */}
          <GroundPlane3D />
          <BoardShadow3D />
          <Standoffs3D />

          <PcbSlab3D />

          {/*
            The board surface: the artwork with a hole where each raised part
            was, and everything that belongs flat on the board drawn into the
            same layer. One layer rather than two — in a preserve-3d subtree
            each is rasterised at device pixels, and two full-board textures
            cost twice the budget for coplanar content that never moves apart.

            The LEDs stay here rather than being lifted: a lens stands 0.9 mm
            off a 153 mm board, so raising one would add a seam under every
            lens to move it a fraction of a unit, and its light is the depth
            cue that actually reads.
          */}
          <BoardSurface3D holes={RAISED}>
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
              {/* LEDG8 stands alone between the HEX bank and the green row. */}
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
          </BoardSurface3D>

          {/*
            Raised hardware. Each part carries its own Z from its own real
            height, so the top row is not one extrusion: the RJ45 stands
            13.5 mm, the audio jacks 6, and the camera shows the difference.
          */}
          {raisedGroup('connectors').map((part) => (
            <RaisedPart3D key={part.id} part={part} />
          ))}
          {raisedGroup('gpio').map((part) => (
            <RaisedPart3D key={part.id} part={part} />
          ))}

          <RaisedPart3D part={raisedPartById('fpga')} />
          <RaisedPart3D part={raisedPartById('sdcard')} />

          {/*
            The LCD rises as one module and its glass rises with it. The live
            characters are drawn by the same overlay, decoded by the same
            HD44780 controller, nested in the module's own plane — so the text
            is on the glass by construction rather than by projection maths.
          */}
          <RaisedPart3D part={raisedPartById('lcd')}>
            <LcdOverlay />
          </RaisedPart3D>

          {/*
            Three housings, eight digits. Each module carries its own digits'
            segment overlays, so a segment is drawn on the top face of the
            package it belongs to.
          */}
          {raisedGroup('hex').map((part) => (
            <RaisedPart3D key={part.id} part={part}>
              {(HEX_MODULE_DIGITS[part.id] ?? []).map((digit) => (
                <HexOverlay key={digit} cx={HEX_CX[7 - digit]} index={digit} />
              ))}
            </RaisedPart3D>
          ))}

          {/*
            The HEX designators, at the modules' own height. The only row of
            silkscreen on this board printed above the part it names, so a
            display standing 7 mm proud would otherwise hide its own label.
          */}
          <RaisedPlane3D id="hex-labels" z={zUnits(raisedPartById('hex-76').heightMm)}>
            <SilkHexLabels />
          </RaisedPlane3D>

          {/* The controls: nearest the camera, and the only things touched. */}
          {raisedGroup('switches').map((part, i) => (
            <RaisedPart3D key={part.id} part={part}>
              <SwitchOverlay cx={SWITCH_CX[i]} index={17 - i} />
            </RaisedPart3D>
          ))}

          {raisedGroup('keys').map((part, i) => (
            <RaisedKey3D key={part.id} part={part} index={3 - i} />
          ))}
        </div>
      </div>
    </div>
  </div>
));
DE2CssBoard25DLegacy.displayName = 'DE2CssBoard25DLegacy';
