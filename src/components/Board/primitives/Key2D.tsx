import React, { useCallback } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK } from '../../../board/de2Layout';
import { useKeyPressed, useSetKey } from '../../../board/useBoardSelectors';
import { PartLabel } from './Silkscreen';

interface Key2DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/**
 * DE2 momentary push-button KEY3..KEY0, flat top view.
 *
 * KEY inputs are ACTIVE-LOW in the simulator: `keys[i] === 0` means pressed.
 * `useKeyPressed` already converts that to a plain pressed boolean, and
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
  const housing = w * 0.5;
  const capR = w * 0.36;

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
      <rect
        x={cx - housing}
        y={cy - housing}
        width={housing * 2}
        height={housing * 2}
        rx={0.6}
        fill="#15181D"
        stroke="#05070A"
        strokeWidth={0.2}
      />
      {/* Four corner legs */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sy], i) => (
        <rect
          key={i}
          x={cx + sx * housing - (sx > 0 ? 0 : 0.9)}
          y={cy + sy * housing - (sy > 0 ? 0 : 0.7)}
          width={0.9}
          height={0.7}
          fill="#9A7C34"
          opacity={0.55}
        />
      ))}

      {/* Metal cap */}
      <g className="de2-key-cap" data-pressed={isPressed ? 'true' : 'false'}>
        <circle cx={cx} cy={cy} r={capR + 0.32} fill="#0B0D11" opacity={0.7} />
        <circle
          cx={cx}
          cy={cy}
          r={capR}
          fill={isPressed ? 'url(#de2b-cap-pressed)' : 'url(#de2b-cap)'}
          stroke="#2B3037"
          strokeWidth={0.15}
        />
        {!isPressed && (
          <ellipse
            cx={cx - capR * 0.24}
            cy={cy - capR * 0.34}
            rx={capR * 0.42}
            ry={capR * 0.26}
            fill="#FFFFFF"
            opacity={0.34}
          />
        )}
      </g>

      <rect
        className="de2-focus-ring"
        x={cx - housing - 0.7}
        y={cy - housing - 0.7}
        width={housing * 2 + 1.4}
        height={housing * 2 + 1.4}
        rx={1}
        fill="none"
        pointerEvents="none"
      />

      <PartLabel
        x={cx}
        y={BOTTOM_SILK.controlLabelY}
        text={`KEY${index}`}
        detail={detail}
        size={1.9}
      />
    </g>
  );
});
Key2D.displayName = 'Key2D';
