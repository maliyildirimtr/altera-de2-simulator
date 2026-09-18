import React, { useCallback } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK } from '../../../board/de2Layout';
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

const HOUSING_H = 2.4;
/** Cap height when released. */
const CAP_H = 3;
/** Travel of the cap when pressed, millimetres. */
const CAP_TRAVEL = 1.4;

/**
 * DE2 momentary push-button in the 2.5D view. Pressing lowers the cap by a
 * real height, so the depth change is visible rather than implied.
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
  const housingHalf = w * 0.5;
  const capR = w * 0.35;

  const housing = extrudeBox(
    cx - housingHalf,
    cy - housingHalf,
    housingHalf * 2,
    housingHalf * 2,
    HOUSING_H,
  );

  const capHeight = isPressed ? CAP_H - CAP_TRAVEL : CAP_H;
  const skirt = cylinderSkirt(cx, cy, capR, capHeight, HOUSING_H);
  const cap = projectedEllipse(cx, cy, capR, HOUSING_H + capHeight);

  const yTop = project(cx - housingHalf, cy - housingHalf, HOUSING_H + CAP_H).y;
  const yBottom = project(cx - housingHalf, cy + housingHalf, 0).y;

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
      {/* Black plastic housing */}
      <polygon points={housing.side} fill="#0A0C10" />
      <polygon points={housing.front} fill="#13161B" />
      <polygon points={housing.top} fill="#1B1F25" stroke="#04060A" strokeWidth={0.12} />

      {/* Machined metal cap */}
      <g className="de2-key-cap-25d" data-pressed={isPressed ? 'true' : 'false'}>
        <path d={skirt} fill={isPressed ? '#4A5059' : METAL.capDark} />
        <ellipse
          cx={cap.cx}
          cy={cap.cy}
          rx={cap.rx}
          ry={cap.ry}
          fill={isPressed ? 'url(#de2b-cap-pressed)' : 'url(#de2b-cap)'}
          stroke="#2B3037"
          strokeWidth={0.13}
        />
        {!isPressed && (
          <ellipse
            cx={cap.cx - cap.rx * 0.26}
            cy={cap.cy - cap.ry * 0.32}
            rx={cap.rx * 0.4}
            ry={cap.ry * 0.34}
            fill="#FFFFFF"
            opacity={0.3}
          />
        )}
      </g>

      <rect
        className="de2-focus-ring"
        x={cx - housingHalf - 0.9}
        y={yTop - 0.9}
        width={housingHalf * 2 + (HOUSING_H + CAP_H) * ISO.shear + 1.8}
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
          size={1.9}
        />
      </g>
    </g>
  );
});
Key25D.displayName = 'Key25D';
