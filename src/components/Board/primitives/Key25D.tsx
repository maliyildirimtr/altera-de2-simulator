import React, { useCallback } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK, hasDetail } from '../../../board/de2Layout';
import { useKeyPressed, useSetKey } from '../../../board/useBoardSelectors';
import {
  ISO,
  cylinderSkirt,
  extrudeBox,
  faceTransform,
  project,
  projectedEllipse,
} from '../boardGeometry';
import { PartLabel } from './Silkscreen';
import { METAL } from '../boardPalette';

interface Key25DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/** Stainless shell height above the board. */
/*
 * Heights here are deliberately shallow and match the elevation the canonical
 * layout gives this part. Depth is carried by the shared shade gradients,
 * the top-arris highlight and the contact shadow — not by extrusion. See the
 * header of `StaticParts25D.tsx` for the reasoning.
 */
const SHELL_H = 2.2;
/** Plunger height above the shell when released. */
const PLUNGER_H = 1.05;
/** Travel when pressed, millimetres. */
const PLUNGER_TRAVEL = 0.68;

/**
 * DE2 momentary push-button in the 2.5D view.
 *
 * Same part as the 2D view: a square brushed-stainless tact switch with a
 * small black moulded plunger. Pressing lowers the plunger by a real height,
 * so the depth change is visible rather than implied.
 *
 * KEY inputs are ACTIVE-LOW in the simulator; `useKeyPressed` handles that
 * conversion and `setKey(index, pressed)` writes it back.
 */
export const Key25D: React.FC<Key25DProps> = React.memo(({ component, detail }) => {
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
  const shell = w * 0.78;
  const sx = cx - shell / 2;
  const sy = cy - shell / 2;
  const plungerR = w * 0.21;

  const shellBox = extrudeBox(sx, sy, shell, shell, SHELL_H);
  const plungerH = isPressed ? PLUNGER_H - PLUNGER_TRAVEL : PLUNGER_H;
  const skirt = cylinderSkirt(cx, cy, plungerR, plungerH, SHELL_H);
  const cap = projectedEllipse(cx, cy, plungerR, SHELL_H + plungerH);
  const well = projectedEllipse(cx, cy, plungerR + 0.5, SHELL_H);

  const yTop = project(sx, sy, SHELL_H + PLUNGER_H).y;
  const yBottom = project(sx, sy + shell, 0).y;

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
      {/* Contact shadow on the board plane */}
      <g transform={faceTransform(0)}>
        <rect
          x={sx - 0.4}
          y={sy + 0.3}
          width={shell + 1.4}
          height={shell + 0.6}
          rx={0.6}
          fill="#02060C"
          opacity={0.36}
        />
      </g>

      {/* Brushed stainless shell */}
      <polygon points={shellBox.side} fill="#5C636C" />
      <polygon points={shellBox.front} fill={METAL.tactDark} />
      <polygon
        points={shellBox.top}
        fill="url(#de2b-tact)"
        stroke={METAL.shadow}
        strokeWidth={0.14}
      />

      {/* Crimp dimples, drawn on the shell's top face */}
      {hasDetail(detail, 'normal') && (
        <g transform={faceTransform(SHELL_H)} fill="#000000" opacity={0.4}>
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

      {/* Plunger well, then the black moulded plunger */}
      <ellipse cx={well.cx} cy={well.cy} rx={well.rx} ry={well.ry} fill="#4A5158" />
      <ellipse cx={well.cx} cy={well.cy} rx={well.rx} ry={well.ry} fill="#000000" opacity={0.4} />
      <g className="de2-key-cap-25d" data-pressed={isPressed ? 'true' : 'false'}>
        <path d={skirt} fill={isPressed ? '#0D0F12' : '#1E2126'} />
        <ellipse
          cx={cap.cx}
          cy={cap.cy}
          rx={cap.rx}
          ry={cap.ry}
          fill={isPressed ? 'url(#de2b-plunger-pressed)' : 'url(#de2b-plunger)'}
        />
        {!isPressed && (
          <ellipse
            cx={cap.cx - cap.rx * 0.3}
            cy={cap.cy - cap.ry * 0.34}
            rx={cap.rx * 0.38}
            ry={cap.ry * 0.32}
            fill="#FFFFFF"
            opacity={0.28}
          />
        )}
      </g>

      <title>{`KEY${index} ${isPressed ? 'pressed (active-low 0)' : 'released (1)'}`}</title>

      <rect
        className="de2-focus-ring"
        x={sx - 0.9}
        y={yTop - 0.9}
        width={shell + (SHELL_H + PLUNGER_H) * ISO.shear + 1.8}
        height={yBottom - yTop + 1.8}
        rx={1}
        fill="none"
        pointerEvents="none"
      />

      <g transform={faceTransform(0)}>
        <PartLabel
          x={cx}
          y={BOTTOM_SILK.controlLabelY}
          text={`KEY${index}`}
          detail={detail}
          size={1.85}
        />
      </g>
    </g>
  );
});
Key25D.displayName = 'Key25D';
