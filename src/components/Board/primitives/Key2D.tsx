import React, { useCallback } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK, hasDetail } from '../../../board/de2Layout';
import { useKeyPressed, useSetKey } from '../../../board/useBoardSelectors';
import { ContactShadow, PartLabel } from './Silkscreen';
import { GOLD, METAL } from '../boardPalette';

interface Key2DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/**
 * DE2 momentary push-button KEY3..KEY0, flat top view.
 *
 * These are square through-hole tact switches: a brushed stainless shell with
 * four dark corner posts and a small black moulded plunger in the middle — not
 * the chrome dome an earlier pass drew. Checked against the push-button
 * close-up and the orthographic scan.
 *
 * KEY inputs are ACTIVE-LOW in the simulator: `keys[i] === 0` means pressed.
 * `useKeyPressed` converts that to a plain pressed boolean and
 * `setKey(index, pressed)` writes the active-low value back — this component
 * must never invert the value itself.
 */
export const Key2D: React.FC<Key2DProps> = React.memo(({ component, detail }) => {
  const index = component.index ?? 0;
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

  const { x, y, width: w, height: h } = component;
  const cx = x + w / 2;
  const cy = y + h / 2;

  // Stainless shell: a square slightly inset from the courtyard.
  const shell = w * 0.78;
  const sx = cx - shell / 2;
  const sy = cy - shell / 2;
  // Black moulded plunger.
  const plungerR = w * 0.21;
  const wellR = plungerR + 0.5;

  return (
    <g
      data-testid={`de2-key-${index}`}
      data-active={isPressed ? 'true' : 'false'}
      data-board-interactive="true"
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
      <ContactShadow x={sx} y={sy} width={shell} height={shell} rx={0.5} strength={0.34} />

      {/* Four gold solder posts, one per corner */}
      <g opacity={0.7}>
        {[
          [sx - 0.55, sy - 0.2],
          [sx + shell - 0.75, sy - 0.2],
          [sx - 0.55, sy + shell - 1],
          [sx + shell - 0.75, sy + shell - 1],
        ].map(([px, py], i) => (
          <rect key={i} x={px} y={py} width={1.3} height={1.2} rx={0.22} fill={GOLD.dark} />
        ))}
      </g>

      {/* Brushed stainless shell */}
      <rect
        x={sx}
        y={sy}
        width={shell}
        height={shell}
        rx={0.55}
        fill="url(#de2b-tact)"
        stroke={METAL.shadow}
        strokeWidth={0.16}
      />
      {/* Crimped corner dimples that hold the shell to the base */}
      {hasDetail(detail, 'normal') && (
        <g fill="#000000" opacity={0.42}>
          {[
            [sx + 1, sy + 1],
            [sx + shell - 1, sy + 1],
            [sx + 1, sy + shell - 1],
            [sx + shell - 1, sy + shell - 1],
          ].map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={0.46} />
          ))}
        </g>
      )}
      {/* Specular band across the top-left of the shell */}
      <path
        d={`M ${sx + 0.5} ${sy + shell * 0.42} L ${sx + shell * 0.46} ${sy + 0.5} L ${sx + shell * 0.72} ${sy + 0.5} L ${sx + 0.5} ${sy + shell * 0.68} Z`}
        fill="#FFFFFF"
        opacity={0.2}
      />

      {/* Plunger well and the black moulded plunger itself */}
      <circle cx={cx} cy={cy} r={wellR} fill="#5A616A" />
      <circle cx={cx} cy={cy} r={wellR} fill="#000000" opacity={0.35} />
      <g className="de2-key-cap" data-pressed={isPressed ? 'true' : 'false'}>
        <circle
          cx={cx}
          cy={cy}
          r={plungerR}
          fill={isPressed ? 'url(#de2b-plunger-pressed)' : 'url(#de2b-plunger)'}
        />
        {!isPressed && (
          <ellipse
            cx={cx - plungerR * 0.3}
            cy={cy - plungerR * 0.36}
            rx={plungerR * 0.4}
            ry={plungerR * 0.28}
            fill="#FFFFFF"
            opacity={0.3}
          />
        )}
      </g>

      <title>{`KEY${index} ${isPressed ? 'pressed (active-low 0)' : 'released (1)'}`}</title>

      <rect
        className="de2-focus-ring"
        x={sx - 0.8}
        y={sy - 0.8}
        width={shell + 1.6}
        height={shell + 1.6}
        rx={1}
        fill="none"
        pointerEvents="none"
      />

      <PartLabel
        x={cx}
        y={BOTTOM_SILK.controlLabelY}
        text={`KEY${index}`}
        detail={detail}
        size={1.85}
      />
    </g>
  );
});
Key2D.displayName = 'Key2D';
