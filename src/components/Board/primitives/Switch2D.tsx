import React, { useCallback } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK } from '../../../board/de2Layout';
import { useSwitchValue, useToggleSwitch } from '../../../board/useBoardSelectors';
import { PartLabel } from './Silkscreen';
import { SWITCH } from '../boardPalette';

interface Switch2DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/**
 * DE2 slide switch SW17..SW0, flat top view.
 *
 * `switches[index]` is active-high: `1` = lever up = logic 1.
 */
export const Switch2D: React.FC<Switch2DProps> = React.memo(({ component, detail }) => {
  const index = component.index ?? 0;
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

  const { x, y, width: w, height: h } = component;
  const inset = 0.45;
  const leverW = w - inset * 2 - 0.5;
  const leverH = (h - inset * 2) * 0.46;
  const travel = h - inset * 2 - leverH;
  const leverX = x + (w - leverW) / 2;
  const leverY = y + inset;

  return (
    <g
      data-testid={`de2-switch-${index}`}
      data-active={isOn ? 'true' : 'false'}
      data-board-interactive="true"
      className="de2-hit"
      role="switch"
      aria-checked={isOn}
      aria-label={`Toggle switch SW${index}`}
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'pointer' }}
    >
      {/* Solder pads */}
      <rect x={x - 0.5} y={y + h - 0.2} width={w + 1} height={1.1} rx={0.2} fill="#9A7C34" opacity={0.5} />

      {/* Switch housing */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={0.45}
        fill="url(#de2b-sw-body)"
        stroke="#02040A"
        strokeWidth={0.18}
      />
      {/* Recessed lever channel */}
      <rect
        x={x + inset * 0.6}
        y={y + inset * 0.6}
        width={w - inset * 1.2}
        height={h - inset * 1.2}
        rx={0.3}
        fill={SWITCH.channel}
        opacity={0.85}
      />

      {/* Lever */}
      <g
        className="de2-switch-lever"
        style={{ transform: `translateY(${isOn ? 0 : travel}px)` }}
      >
        <rect
          x={leverX}
          y={leverY}
          width={leverW}
          height={leverH}
          rx={0.28}
          fill="url(#de2b-lever)"
          stroke="#1A1D22"
          strokeWidth={0.12}
        />
        <rect
          x={leverX + 0.35}
          y={leverY + 0.3}
          width={leverW - 0.7}
          height={0.34}
          rx={0.17}
          fill="#FFFFFF"
          opacity={0.5}
        />
      </g>

      {/* Focus indicator — styled in index.css, shown only on keyboard focus */}
      <rect
        className="de2-focus-ring"
        x={x - 0.7}
        y={y - 0.7}
        width={w + 1.4}
        height={h + 1.4}
        rx={0.8}
        fill="none"
        pointerEvents="none"
      />

      <PartLabel
        x={x + w / 2}
        y={BOTTOM_SILK.controlLabelY}
        text={`SW${index}`}
        detail={detail}
        size={1.75}
      />
    </g>
  );
});
Switch2D.displayName = 'Switch2D';
