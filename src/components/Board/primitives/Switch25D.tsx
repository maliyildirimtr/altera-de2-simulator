import React, { useCallback } from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK } from '../../../board/de2Layout';
import { useSwitchValue, useToggleSwitch } from '../../../board/useBoardSelectors';
import { ISO, extrudeBox, faceTransform, project } from '../boardGeometry';
import { PartLabel } from './Silkscreen';
import { SWITCH } from '../boardPalette';

interface Switch25DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

const BODY_H = 3.6;
const LEVER_H = 1.7;

/**
 * DE2 slide switch in the 2.5D view: an extruded IVORY housing with a BLACK
 * lever that has real height and slides along the board's depth axis.
 *
 * Materials match the 2D switch exactly — same gradients, same way round —
 * because the two views are the same board seen differently, not two styles.
 *
 * State semantics are identical to the 2D switch: `switches[index] === 1`
 * means the lever is up. Both renderers read the same store selector.
 */
export const Switch25D: React.FC<Switch25DProps> = React.memo(({ component, detail }) => {
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
  const housing = extrudeBox(x, y, w, h, BODY_H);

  const inset = 0.62;
  const leverW = w - inset * 2;
  const leverD = (h - inset * 2) * 0.47;
  const travel = h - inset * 2 - leverD;
  const lever = extrudeBox(x + inset, y + inset, leverW, leverD, LEVER_H, BODY_H);

  // Sliding the lever along board depth becomes a vertical screen offset.
  const slide = isOn ? 0 : travel * ISO.tilt;

  const totalH = BODY_H + LEVER_H;
  const yTop = project(x, y, totalH).y;
  const yBottom = project(x, y + h, 0).y;

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
      {/* Contact shadow on the board plane */}
      <g transform={faceTransform(0)}>
        <rect
          x={x - 0.3}
          y={y + 0.3}
          width={w + 1.3}
          height={h + 0.5}
          rx={0.5}
          fill="#02060C"
          opacity={0.34}
        />
      </g>

      {/* Ivory housing */}
      <polygon points={housing.side} fill={SWITCH.side} />
      <polygon points={housing.front} fill={SWITCH.bodyDark} />
      <polygon points={housing.top} fill="url(#de2b-sw-body)" stroke={SWITCH.side} strokeWidth={0.12} />
      <g transform={faceTransform(BODY_H)}>
        <rect
          x={x + 0.45}
          y={y + 0.5}
          width={w - 0.9}
          height={h - 1}
          rx={0.24}
          fill={SWITCH.channel}
        />
      </g>

      {/* Black lever */}
      <g className="de2-switch-lever" style={{ transform: `translateY(${slide}px)` }}>
        <polygon points={lever.side} fill={SWITCH.leverDark} />
        <polygon points={lever.front} fill={SWITCH.lever} />
        <polygon points={lever.top} fill="url(#de2b-lever)" stroke="#0B0D10" strokeWidth={0.1} />
      </g>

      <title>{`SW${index} ${isOn ? 'up (1)' : 'down (0)'}`}</title>

      <rect
        className="de2-focus-ring"
        x={x - 0.9}
        y={yTop - 0.9}
        width={w + totalH * ISO.shear + 1.8}
        height={yBottom - yTop + 1.8}
        rx={0.8}
        fill="none"
        pointerEvents="none"
      />

      {/* Silkscreen sits on the board plane, so it shares the flat transform */}
      <g transform={faceTransform(0)}>
        <PartLabel
          x={x + w / 2}
          y={BOTTOM_SILK.controlLabelY}
          text={`SW${index}`}
          detail={detail}
          size={1.75}
        />
      </g>
    </g>
  );
});
Switch25D.displayName = 'Switch25D';
