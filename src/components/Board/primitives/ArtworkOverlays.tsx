import React, { useCallback, useMemo } from 'react';
import {
  DE2_REFERENCE_2D,
  type ArtworkPoint,
  type InputOverlayCalibration,
  type OverlayLayout,
} from '../../../board/de2ReferenceAssets';
import {
  polygonPoints,
  resolveInputOverlay,
} from '../../../board/de2InputCalibration';
import { LCD_COLS, LCD_ROWS } from '../../../core/peripherals/lcdController';
import {
  isSegmentLit,
  useHexSegments,
  useLcdDebug,
  useKeyPressed,
  useLedGreenValue,
  useLedRedValue,
  useSetKey,
  useLcdView,
  useSwitchValue,
  useToggleSwitch,
} from '../../../board/useBoardSelectors';
import { sevenSegmentShapes, SEGMENT_SLANT_DEG } from '../boardGeometry';
import {
  PerspectiveKeyVisual,
  PerspectiveSwitchVisual,
} from './PerspectiveInputVisuals';
import {
  PerspectiveHexVisual,
  PerspectiveLcdVisual,
} from './PerspectiveDisplayVisuals';

/**
 * Live overlays for the artwork-based DE2 renderer.
 *
 * ── The division of labour ────────────────────────────────────────────────
 * The raster artwork supplies every physical part: housings, shells, lenses,
 * display bodies, silkscreen. These overlays supply ONLY what changes while
 * the simulation runs, and they are deliberately the smallest shapes that can
 * carry that state — a lever, a plunger, an emitter, seven segments. Nothing
 * here redraws a part the artwork already provides, which is what keeps the
 * two layers from disagreeing with each other.
 *
 * ── Baked-in state ───────────────────────────────────────────────────────
 * The artwork is a render of a POWERED board: its LEDs are lit and all eight
 * displays read "8". That is presentation baked into a bitmap, and it must
 * never be mistaken for simulator state. Each overlay therefore neutralises
 * its own footprint first — an unlit lens over the lit one, the module's face
 * colour over the digit — and only then draws the live value on top. The masks
 * are local to the parts they cover; the artwork itself is untouched.
 *
 * ── State ownership ──────────────────────────────────────────────────────
 * Every value comes from the same `useBoardSelectors` hooks the vector
 * renderers use, so there is one simulation state feeding every view. Active
 * -low semantics live in those selectors and are not re-implemented here:
 * `useKeyPressed` already converts KEY's active-low value to a boolean, and
 * `isSegmentLit` already knows that a HEX segment lights on 0.
 */

/* ────────────────────────────────────────────────────────────────────────
 * Materials
 *
 * Sampled from the artwork so the overlays sit in the same light as the
 * render: one virtual light from the upper-left, matching the vector views.
 * ──────────────────────────────────────────────────────────────────────── */

const ART = {
  /** Shadowed channel inside the ivory switch housing. */
  switchChannel: '#31353B',
  switchChannelShade: '#15181C',
  /** Moulded black lever. */
  lever: '#212327',
  leverLight: '#4E5157',
  leverDark: '#0D0F12',
  /** Tact-switch plunger. */
  plunger: '#313842',
  plungerLight: '#565E69',
  plungerDark: '#171A20',
  /** Seven-segment module face, for erasing the artwork's digit. */
  hexFaceTop: '#7B706F',
  hexFaceBottom: '#776C6B',
  /** Unlit seven-segment geometry: faint and slightly warm on that face. */
  segOff: '#6B5A56',
  segOn: '#FF3A1C',
  segOnCore: '#FFB49B',
  segOnEdge: '#B81D06',
  /** Unlit lenses, painted over the artwork's lit ones. */
  ledRedOff: '#4A1512',
  ledRedOffEdge: '#280A08',
  ledRedOn: '#FF3B2A',
  ledRedOnCore: '#FFE7E1',
  ledGreenOff: '#1C3A1E',
  ledGreenOffEdge: '#0C1F0E',
  ledGreenOn: '#4BE860',
  ledGreenOnCore: '#E4FFE6',
} as const;

/**
 * Paint servers for the overlays. Kept separate from `BoardDefs` so the two
 * 2D renderers can never fight over an id, and so this layer can be dropped
 * without touching the vector board.
 */
export const ArtworkOverlayDefs: React.FC<{ layout?: OverlayLayout }> = ({
  layout = DE2_REFERENCE_2D.layout,
}) => (
  <defs>
    <linearGradient id="de2a-lever" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stopColor={ART.leverLight} />
      <stop offset="34%" stopColor={ART.lever} />
      <stop offset="100%" stopColor={ART.leverDark} />
    </linearGradient>
    <linearGradient id="de2a-channel" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stopColor={ART.switchChannelShade} />
      <stop offset="38%" stopColor={ART.switchChannel} />
      <stop offset="100%" stopColor={ART.switchChannel} />
    </linearGradient>
    <radialGradient id="de2a-plunger" cx="0.36" cy="0.3" r="0.8">
      <stop offset="0%" stopColor={ART.plungerLight} />
      <stop offset="52%" stopColor={ART.plunger} />
      <stop offset="100%" stopColor={ART.plungerDark} />
    </radialGradient>
    <radialGradient id="de2a-plunger-down" cx="0.44" cy="0.44" r="0.74">
      <stop offset="0%" stopColor={ART.plunger} />
      <stop offset="100%" stopColor={ART.plungerDark} />
    </radialGradient>

    {/* Module face, used to erase the artwork's baked-in digits. */}
    <linearGradient id="de2a-hex-face" x1="0" y1="0" x2="0.1" y2="1">
      <stop offset="0%" stopColor={layout.hex.faceTop} />
      <stop offset="100%" stopColor={layout.hex.faceBottom} />
    </linearGradient>

    {/* Unlit lenses. */}
    <linearGradient id="de2a-ledr-off" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stopColor={ART.ledRedOff} />
      <stop offset="100%" stopColor={ART.ledRedOffEdge} />
    </linearGradient>
    <linearGradient id="de2a-ledg-off" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stopColor={ART.ledGreenOff} />
      <stop offset="100%" stopColor={ART.ledGreenOffEdge} />
    </linearGradient>
    <radialGradient id="de2a-ledr-on" cx="0.36" cy="0.3" r="0.8">
      <stop offset="0%" stopColor={ART.ledRedOnCore} />
      <stop offset="34%" stopColor={ART.ledRedOn} />
      <stop offset="100%" stopColor="#A8170A" />
    </radialGradient>
    <radialGradient id="de2a-ledg-on" cx="0.36" cy="0.3" r="0.8">
      <stop offset="0%" stopColor={ART.ledGreenOnCore} />
      <stop offset="34%" stopColor={ART.ledGreenOn} />
      <stop offset="100%" stopColor="#1E8F34" />
    </radialGradient>

    {/* Restrained halos. The artwork already carries ambient board light, so
        these stay small — a big bloom immediately looks like a sticker. */}
    <radialGradient id="de2a-ledr-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#FF3B2A" stopOpacity="0.3" />
      <stop offset="36%" stopColor="#E81C08" stopOpacity="0.09" />
      <stop offset="100%" stopColor="#E81C08" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="de2a-ledg-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#4BE860" stopOpacity="0.28" />
      <stop offset="36%" stopColor="#25C951" stopOpacity="0.08" />
      <stop offset="100%" stopColor="#25C951" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="de2a-seg-inner" cx="0.5" cy="0.5" r="0.6">
      <stop offset="0%" stopColor="#FF6A3A" stopOpacity="0.22" />
      <stop offset="100%" stopColor="#FF6A3A" stopOpacity="0" />
    </radialGradient>
  </defs>
);

/* ────────────────────────────────────────────────────────────────────────
 * Slide switches
 * ──────────────────────────────────────────────────────────────────────── */

interface BankProps {
  /** Native-image pixel centre of this member. */
  point?: ArtworkPoint;
  /** Legacy normalised X, retained only for the unshipped CSS scene. */
  cx?: number;
  index: number;
  layout?: OverlayLayout;
  /** Per-element geometry is supplied only by the 2.5D artwork renderer. */
  calibration?: InputOverlayCalibration;
}

/**
 * SW17..SW0. The 2D path keeps the artwork housing and repaints its channel.
 * The 2.5D path receives per-element calibration and replaces the complete
 * baked switch with a projectively warped live housing, channel and lever.
 *
 * `switches[index]` is active-high: 1 = lever up.
 */
export const SwitchOverlay: React.FC<BankProps> = React.memo(({ point, index, layout, calibration }) => {
  layout ??= DE2_REFERENCE_2D.layout;
  point ??= layout.switches.centres[17 - index];
  const value = useSwitchValue(index);
  const toggleSwitch = useToggleSwitch();
  const isOn = value === 1;

  const handleToggle = useCallback(() => toggleSwitch(index), [toggleSwitch, index]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGGElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleSwitch(index);
      }
    },
    [toggleSwitch, index],
  );

  const art = layout.switches;
  const resolved = calibration
    ? resolveInputOverlay(calibration, layout.width, layout.height)
    : undefined;
  const centre = resolved?.centre ?? point;
  const bodyW = resolved?.width ?? art.bodyWidth;
  const bodyH = resolved?.height ?? art.bodyHeight;
  const bodyX = resolved?.x ?? point.x - bodyW / 2;
  const bodyY = resolved?.y ?? point.y - bodyH / 2;

  const slotW = bodyW * (art.slotWidth / art.bodyWidth);
  const slotX = centre.x - slotW / 2;
  const slotH = bodyH * (art.slotHeight / art.bodyHeight);
  const slotY = centre.y - slotH / 2;

  const leverW = bodyW * (art.leverWidth / art.bodyWidth);
  const leverH = bodyH * (art.leverHeight / art.bodyHeight);
  const leverX = centre.x - leverW / 2;
  const leverY = slotY + (isOn ? 0 : bodyH * (art.travel / art.bodyHeight));
  const hitPoints = resolved ? polygonPoints(resolved.corners) : undefined;

  return (
    <g
      data-testid={`de2-switch-${index}`}
      data-active={isOn ? 'true' : 'false'}
      data-board-interactive="true"
      data-overlay-shape={calibration?.shape}
      className="de2-hit"
      role="switch"
      aria-checked={isOn}
      aria-label={`Toggle switch SW${index}`}
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'pointer' }}
    >
      {resolved && <PerspectiveSwitchVisual corners={resolved.corners} index={index} active={isOn} />}

      {/* The painted transparent SVG shape is the hit target. For quads the
          browser therefore rejects the empty corners of its bounding box. */}
      {resolved ? (
        <polygon data-hit-shape={calibration?.shape} points={hitPoints} fill="transparent" pointerEvents="all" />
      ) : (
        <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={4} fill="transparent" />
      )}

      {!resolved && (
        <g>
          {/* Channel: this is the mask that removes the artwork's fixed lever. */}
          <rect x={slotX} y={slotY} width={slotW} height={slotH} rx={3} fill="url(#de2a-channel)" />

          {/* Live lever */}
          <g className="de2-switch-lever">
            <rect
              x={leverX}
              y={leverY}
              width={leverW}
              height={leverH}
              rx={4}
              fill="url(#de2a-lever)"
            />
            <rect
              x={leverX + leverW * 0.1}
              y={leverY + leverH * 0.08}
              width={leverW * 0.8}
              height={leverH * 0.11}
              rx={2}
              fill="#FFFFFF"
              opacity={0.22}
            />
            <rect
              x={leverX + leverW * 0.14}
              y={leverY + leverH * 0.56}
              width={leverW * 0.72}
              height={leverH * 0.07}
              rx={1.5}
              fill="#000000"
              opacity={0.4}
            />
          </g>
        </g>
      )}

      <title>{`SW${index} ${isOn ? 'up (1)' : 'down (0)'}`}</title>

      {resolved ? (
        <polygon className="de2-focus-ring" points={hitPoints} fill="none" pointerEvents="none" />
      ) : (
        <rect
          className="de2-focus-ring"
          x={bodyX - 5}
          y={bodyY - 5}
          width={bodyW + 10}
          height={bodyH + 10}
          rx={8}
          fill="none"
          pointerEvents="none"
        />
      )}
    </g>
  );
});
SwitchOverlay.displayName = 'SwitchOverlay';

/* ────────────────────────────────────────────────────────────────────────
 * Push-buttons
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * KEY3..KEY0. The 2D path moves only the artwork plunger. The calibrated 2.5D
 * path replaces the complete baked control with a homography-warped shell,
 * fasteners, well and live plunger.
 *
 * ACTIVE-LOW: `keys[i] === 0` is pressed. `useKeyPressed` / `useSetKey` own
 * that conversion — this component must never invert the value itself.
 */
export const KeyOverlay: React.FC<BankProps> = React.memo(({ point, index, layout, calibration }) => {
  layout ??= DE2_REFERENCE_2D.layout;
  point ??= layout.keys.centres[3 - index];
  const isPressed = useKeyPressed(index);
  const setKey = useSetKey();

  const press = useCallback(() => setKey(index, true), [setKey, index]);
  const release = useCallback(() => setKey(index, false), [setKey, index]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGGElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!e.repeat) setKey(index, true);
      }
    },
    [setKey, index],
  );
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<SVGGElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setKey(index, false);
      }
    },
    [setKey, index],
  );

  const art = layout.keys;
  const resolved = calibration
    ? resolveInputOverlay(calibration, layout.width, layout.height)
    : undefined;
  const bodyW = resolved?.width ?? art.bodyWidth;
  const bodyH = resolved?.height ?? art.bodyHeight;
  const centreX = resolved?.centre.x ?? point.x;
  const centreY = resolved?.centre.y ?? point.y;
  const r = Math.min(bodyW, bodyH) * (art.plungerRadius / Math.min(art.bodyWidth, art.bodyHeight));
  const drop = bodyH * (art.plungerTravel / art.bodyHeight);
  const py = centreY + (isPressed ? drop : 0);
  const hitPoints = resolved ? polygonPoints(resolved.corners) : undefined;

  return (
    <g
      data-testid={`de2-key-${index}`}
      data-active={isPressed ? 'true' : 'false'}
      data-board-interactive="true"
      data-overlay-shape={calibration?.shape}
      className="de2-hit"
      role="button"
      aria-pressed={isPressed}
      aria-label={`Press KEY${index}`}
      tabIndex={0}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ cursor: 'pointer', touchAction: 'none' }}
    >
      {resolved && <PerspectiveKeyVisual corners={resolved.corners} index={index} active={isPressed} />}
      {resolved ? (
        <polygon data-hit-shape={calibration?.shape} points={hitPoints} fill="transparent" pointerEvents="all" />
      ) : (
        <rect
          x={centreX - bodyW / 2}
          y={centreY - bodyH / 2}
          width={bodyW}
          height={bodyH}
          rx={8}
          fill="transparent"
        />
      )}

      {!resolved && (
        <g>

      {/*
        The well the plunger sits in. Deliberately just a rim and a shadow, not
        an opaque disc: the artwork already draws the metal bezel around the
        plunger, and painting over it turns the tact switch into a dark blob.
      */}
      <circle
        cx={centreX}
        cy={centreY}
        r={r * 1.04}
        fill="none"
        stroke="#14171C"
        strokeWidth={r * 0.12}
        opacity={0.7}
      />
      <ellipse
        cx={centreX}
        cy={centreY + r * 0.42}
        rx={r * 0.92}
        ry={r * 0.46}
        fill="#000000"
        opacity={isPressed ? 0.34 : 0.18}
      />

      {/* Live plunger */}
      <circle
        cx={centreX}
        cy={py}
        r={r}
        fill={isPressed ? 'url(#de2a-plunger-down)' : 'url(#de2a-plunger)'}
      />
      {!isPressed && (
        <ellipse
          cx={centreX - r * 0.2}
          cy={py - r * 0.42}
          rx={r * 0.46}
          ry={r * 0.24}
          fill="#FFFFFF"
          opacity={0.16}
        />
      )}
        </g>
      )}

      <title>{`KEY${index} ${isPressed ? 'pressed (0)' : 'released (1)'}`}</title>

      {resolved ? (
        <polygon className="de2-focus-ring" points={hitPoints} fill="none" pointerEvents="none" />
      ) : (
        <rect
          className="de2-focus-ring"
          x={centreX - bodyW / 2 - 5}
          y={centreY - bodyH / 2 - 5}
          width={bodyW + 10}
          height={bodyH + 10}
          rx={10}
          fill="none"
          pointerEvents="none"
        />
      )}
    </g>
  );
});
KeyOverlay.displayName = 'KeyOverlay';

/* ────────────────────────────────────────────────────────────────────────
 * Indicator LEDs
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * LEDR17..LEDR0 and LEDG8..LEDG0, both ACTIVE-HIGH.
 *
 * The artwork's lenses are lit, so the overlay paints an unlit lens over
 * every one of them unconditionally and adds the emitter only when the
 * simulator drives the output. Without that mask the board would appear to
 * report state it is not in.
 *
 * Output-only, so these are exposed as live status images rather than
 * controls, and they never cover the silkscreen designator above the row.
 */
export const LedOverlay: React.FC<BankProps & { kind: 'red' | 'green' }> = React.memo(
  ({ point, index, kind, layout }) => {
    layout ??= DE2_REFERENCE_2D.layout;
    point ??= kind === 'red'
      ? layout.leds.red[17 - index]
      : index === 8
        ? layout.leds.green8
        : layout.leds.green[7 - index];
    const isRed = kind === 'red';
    // Both hooks always run so hook order is stable; only one tracks a value
    // that can change for this component.
    const redValue = useLedRedValue(isRed ? index : -1);
    const greenValue = useLedGreenValue(isRed ? -1 : index);
    const isOn = (isRed ? redValue : greenValue) === 1;

    const isLedG8 = !isRed && index === 8;
    const led = layout.leds;
    const w = isLedG8 ? led.green8Width : isRed ? led.redWidth : led.greenWidth;
    const h = isLedG8 ? led.green8Height : isRed ? led.redHeight : led.greenHeight;
    const centreX = point.x;
    const centreY = point.y;
    const x = centreX - w / 2;
    const y = centreY - h / 2;
    const label = `${isRed ? 'LEDR' : 'LEDG'}${index}`;

    return (
      <g
        data-testid={isRed ? `de2-ledr-${index}` : `de2-ledg-${index}`}
        data-active={isOn ? 'true' : 'false'}
        role="img"
        aria-label={`${label} ${isOn ? 'on' : 'off'}`}
        pointerEvents="none"
      >
        {/* Opaque local neutralisation hides the baked lens and its immediate
            glow before the authoritative runtime state is painted. */}
        <rect
          data-baked-state-mask="led"
          x={x - w * 0.18}
          y={y - h * 0.12}
          width={w * 1.36}
          height={h * 1.24}
          rx={Math.min(w, h) * 0.4}
          fill={led.neutralFill}
        />
        {isOn && (
          <ellipse
            cx={centreX}
            cy={centreY}
            rx={w * 1.5}
            ry={h * 1.15}
            fill={isRed ? 'url(#de2a-ledr-halo)' : 'url(#de2a-ledg-halo)'}
          />
        )}

        {/* Unlit lens — the mask over the artwork's baked-in illumination. */}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={Math.min(w, h) * 0.34}
          fill={isRed ? 'url(#de2a-ledr-off)' : 'url(#de2a-ledg-off)'}
        />

        {isOn && (
          <>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={Math.min(w, h) * 0.34}
              className="de2-led-lens"
              fill={isRed ? 'url(#de2a-ledr-on)' : 'url(#de2a-ledg-on)'}
            />
            {/* Bright central emitter: what actually reads as "driven". */}
            <ellipse
              cx={centreX}
              cy={centreY - h * 0.04}
              rx={w * 0.3}
              ry={h * 0.2}
              fill={isRed ? ART.ledRedOnCore : ART.ledGreenOnCore}
              opacity={0.85}
            />
          </>
        )}

        {/* Lens crown highlight, present either way so the part still reads as
            moulded epoxy when it is off. */}
        <rect
          x={x + w * 0.22}
          y={y + h * 0.16}
          width={w * 0.56}
          height={h * 0.16}
          rx={Math.min(w, h) * 0.16}
          fill="#FFFFFF"
          opacity={isOn ? 0.3 : 0.08}
        />
      </g>
    );
  },
);
LedOverlay.displayName = 'LedOverlay';

/* ────────────────────────────────────────────────────────────────────────
 * Seven-segment displays
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * HEX7..HEX0.
 *
 * The artwork provides the module bodies and shows every display reading "8".
 * The overlay repaints just the digit window in the module's own face colour —
 * which also removes the glow the render baked onto the face around each
 * digit — and then draws the live segments using the SAME shared geometry as
 * the vector renderers, so a digit has one shape across all views.
 *
 * Segments are ACTIVE-LOW (`0` lights a segment) and the raw array is
 * published unmodified on `data-segments`, which the DE2 HEX regressions read
 * in whichever 2D presentation is active.
 */
export const HexOverlay: React.FC<BankProps> = React.memo(({ point, index, layout, calibration }) => {
  layout ??= DE2_REFERENCE_2D.layout;
  point ??= layout.hex.centres[7 - index];
  const segments = useHexSegments(index);

  const art = layout.hex;
  const winW = art.windowWidth;
  const winH = art.windowHeight;
  const centreX = point.x;
  const centreY = point.y;
  const digitW = art.digitWidth;
  const digitH = art.digitHeight;

  const shapes = useMemo(() => sevenSegmentShapes(digitW, digitH), [digitW, digitH]);
  const anyLit = segments.some((v) => isSegmentLit(v));
  const resolved = calibration
    ? resolveInputOverlay(calibration, layout.width, layout.height)
    : undefined;

  return (
    <g
      data-testid={`de2-hex-${index}`}
      data-segments={JSON.stringify(segments)}
      role="img"
      aria-label={`HEX${index} seven-segment display`}
      pointerEvents="none"
    >
      {resolved ? (
        <PerspectiveHexVisual
          corners={resolved.corners}
          index={index}
          segments={segments}
        />
      ) : (
        <>
      {/* Digit window, repainted in the module's face colour. This is the mask
          that erases the artwork's fixed "8". */}
      <rect
        data-baked-state-mask="hex"
        x={centreX - winW / 2}
        y={centreY - winH / 2}
        width={winW}
        height={winH}
        fill="url(#de2a-hex-face)"
      />
      {/* A shallow inner shadow along the top, so the window reads as recessed
          into the module rather than as a patch laid over it. */}
      <rect
        x={centreX - winW / 2}
        y={centreY - winH / 2}
        width={winW}
        height={winH * 0.06}
        fill="#000000"
        opacity={0.13}
      />
      {anyLit && (
        <rect
          x={centreX - winW / 2}
          y={centreY - winH / 2}
          width={winW}
          height={winH}
          fill="url(#de2a-seg-inner)"
        />
      )}

      <g
        transform={`translate(${centreX - digitW / 2} ${centreY - digitH / 2}) skewX(-${SEGMENT_SLANT_DEG})`}
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
              fill={lit ? ART.segOn : ART.segOff}
              stroke={lit ? ART.segOnEdge : 'none'}
              strokeWidth={lit ? 1.1 : 0}
              opacity={lit ? 1 : 0.5}
            />
          );
        })}
      </g>
        </>
      )}
    </g>
  );
});
HexOverlay.displayName = 'HexOverlay';

/* ────────────────────────────────────────────────────────────────────────
 * 16 x 2 character LCD
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The DE2's character LCD, drawn on the artwork's own glass.
 *
 * The artwork supplies the module, the bezel and the sage panel; this overlay
 * supplies only the characters. There is no HTML input, no white box and no
 * second panel — just text on the glass, which is why it still looks like the
 * render when the display is blank.
 *
 * Everything it draws comes from the store's LCD state, which the pure
 * HD44780 emulator advances from the compiled design's LCD_* outputs. It
 * NEVER invents text: with no LCD signals in the design, or before the design
 * turns the display on, the panel is blank because that is what the hardware
 * would do.
 *
 * `LCD_ON` low blanks the panel and dims the glass; `LCD_BLON` low dims the
 * backlight without clearing the characters, as on the real module.
 */
export const LcdOverlay: React.FC<{
  layout?: OverlayLayout;
  calibration?: InputOverlayCalibration;
}> = React.memo(({
  layout = DE2_REFERENCE_2D.layout,
  calibration,
}) => {
  const { line1, line2, visible, backlight, cursor, initialised } = useLcdView();
  const dbg = useLcdDebug();

  const art = layout.lcd;
  const gx = art.glassX;
  const gy = art.glassY;
  const gw = art.glassWidth;
  const gh = art.glassHeight;

  // Character area, inset inside the glass so text never reaches the bezel.
  const padX = gw * art.insetX;
  const padY = gh * art.insetY;
  const areaX = gx + padX;
  const areaY = gy + padY;
  const areaW = gw - padX * 2;
  const areaH = gh - padY * 2;

  const cellW = areaW / LCD_COLS;
  const cellH = areaH / LCD_ROWS;
  // HD44780 cells are 5 x 8 dots, so the glyph is much taller than it is wide.
  // Sizing from the cell height rather than its width is what keeps the text
  // looking like a character module instead of stretched label text.
  const fontSize = cellH * 0.78;

  const rows = [line1, line2];
  const resolved = calibration
    ? resolveInputOverlay(calibration, layout.width, layout.height)
    : undefined;

  return (
    <g
      data-testid="de2-lcd"
      data-lcd-visible={visible ? 'true' : 'false'}
      /*
       * The panel's own state, on the element itself.
       *
       * Not debug scaffolding. SVG text is the one thing a renderer can draw
       * that is invisible to a DOM assertion — glyphs laid out as <text>
       * children tell you nothing about whether the right characters arrived —
       * so these attributes are how a regression proves the simulation reaches
       * the DOM rather than stopping in the store, and how the panel can be
       * read in a browser without a console hook.
       */
      data-line1={line1}
      data-line2={line2}
      data-display-on={String(visible)}
      data-powered={String(backlight)}
      /*
       * And what the signal chain has done: whether the design drives an LCD
       * bus at all, how many enable edges latched, what was written last, and
       * whether the design's own sequencer is advancing. Four questions that
       * between them locate a blank display in one look, which took three
       * rounds of debugging without them. Every attribute here is asserted by
       * the renderer regression; nothing is published that nothing checks.
       */
      data-lcd-initialised={String(initialised)}
      data-lcd-bus-seen={String(dbg.busSeen)}
      data-lcd-falling-edges={String(dbg.fallingEdges)}
      data-lcd-step={dbg.step === null ? 'n/a' : String(dbg.step)}
      data-lcd-last-command={
        dbg.lastByte < 0
          ? 'none'
          : `${dbg.lastWasCommand ? 'cmd' : 'data'} 0x${dbg.lastByte.toString(16).padStart(2, '0')}`
      }
      pointerEvents="none"
    >
      {resolved ? (
        <PerspectiveLcdVisual
          corners={resolved.corners}
          rows={[line1, line2]}
          visible={visible}
          backlight={backlight}
          cursor={cursor}
        />
      ) : (
        <>
      {/* Backlight and power, applied to the glass the artwork already drew.
          Dimming rather than repainting keeps the artwork's own reflection. */}
      {!backlight && (
        <rect x={gx} y={gy} width={gw} height={gh} fill="#0A140C" opacity={0.36} />
      )}
      {!visible && <rect x={gx} y={gy} width={gw} height={gh} fill="#0A140C" opacity={0.3} />}

      {visible &&
        rows.map((text, row) => (
          <g key={row} data-lcd-row={row}>
            {Array.from(text).map((ch, col) =>
              ch === ' ' ? null : (
                <text
                  key={col}
                  x={areaX + cellW * (col + 0.5)}
                  y={areaY + cellH * (row + 0.5) + fontSize * 0.36}
                  fontSize={fontSize}
                  fontFamily="'DejaVu Sans Mono', 'SFMono-Regular', Menlo, Consolas, monospace"
                  fontWeight={600}
                  textAnchor="middle"
                  fill="#1C2A1E"
                  opacity={0.9}
                  style={{ userSelect: 'none' }}
                >
                  {ch}
                </text>
              ),
            )}
          </g>
        ))}

      {/* Block cursor, only when the design actually enabled it. */}
      {visible && cursor && (
        <rect
          x={areaX + cellW * cursor.col + cellW * 0.12}
          y={areaY + cellH * (cursor.row + 1) - cellH * 0.16}
          width={cellW * 0.76}
          height={cellH * 0.1}
          fill="#1C2A1E"
          opacity={0.75}
        />
      )}
        </>
      )}

      {/*
        The accessible text of the panel. Screen readers get the two lines as
        they are, which is the only way the display is legible to them — the
        characters above are individually positioned and would otherwise be
        announced letter by letter.
      */}
      <title>{visible ? `LCD: ${line1.trimEnd()} / ${line2.trimEnd()}` : 'LCD: off'}</title>
    </g>
  );
});
LcdOverlay.displayName = 'LcdOverlay';
