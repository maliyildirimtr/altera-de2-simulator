import React, { useCallback } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK, hasDetail } from '../../../board/de2Layout';
import { useSwitchValue, useToggleSwitch } from '../../../board/useBoardSelectors';
import { ContactShadow, PartLabel } from './Silkscreen';
import { GOLD, SWITCH } from '../boardPalette';

interface Switch2DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/**
 * DE2 slide switch SW17..SW0, flat top view.
 *
 * The DE2's switches have an IVORY body with a BLACK lever — the opposite way
 * round from the usual black-bodied part, and getting it backwards inverts the
 * whole bottom edge of the board. Checked against the orthographic scan and
 * the switch-bank close-ups.
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

  // Recessed channel the lever travels in.
  const chX = x + 0.62;
  const chW = w - 1.24;
  const chY = y + 1.15;
  const chH = h - 2.3;

  const leverH = chH * 0.47;
  const travel = chH - leverH;

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
      <ContactShadow x={x} y={y} width={w} height={h} rx={0.4} strength={0.32} />

      {/* Through-hole solder pads, top and bottom */}
      <g opacity={0.65}>
        <rect x={x + 0.5} y={y - 0.85} width={w - 1} height={1.1} rx={0.25} fill={GOLD.dark} />
        <rect x={x + 0.5} y={y + h - 0.25} width={w - 1} height={1.1} rx={0.25} fill={GOLD.dark} />
      </g>

      {/* Ivory moulded body */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={0.4}
        fill="url(#de2b-sw-body)"
        stroke={SWITCH.side}
        strokeWidth={0.14}
      />
      {/* Top-edge highlight: sells the moulding as plastic rather than a flat fill */}
      <rect
        x={x + 0.3}
        y={y + 0.22}
        width={w - 0.6}
        height={0.3}
        rx={0.15}
        fill="#FFFFFF"
        opacity={0.5}
      />

      {/* Recessed channel */}
      <rect x={chX} y={chY} width={chW} height={chH} rx={0.22} fill={SWITCH.channel} />
      <rect
        x={chX}
        y={chY}
        width={chW}
        height={0.34}
        rx={0.17}
        fill="#000000"
        opacity={0.28}
      />

      {/* Black lever */}
      {/* Lever position is the state read-out, so it travels the full channel. */}
      <g className="de2-switch-lever" style={{ transform: `translateY(${isOn ? 0 : travel}px)` }}>
        <rect
          x={chX - 0.08}
          y={chY}
          width={chW + 0.16}
          height={leverH}
          rx={0.22}
          fill="url(#de2b-lever)"
        />
        <rect
          x={chX + 0.3}
          y={chY + 0.28}
          width={chW - 0.6}
          height={0.26}
          rx={0.13}
          fill="#FFFFFF"
          opacity={0.3}
        />
        {/* Grip ridge across the lever face */}
        {hasDetail(detail, 'high') && (
          <rect
            x={chX + 0.24}
            y={chY + leverH * 0.58}
            width={chW - 0.48}
            height={0.2}
            rx={0.1}
            fill="#000000"
            opacity={0.45}
          />
        )}
      </g>
      <title>{`SW${index} ${isOn ? 'up (1)' : 'down (0)'}`}</title>

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
