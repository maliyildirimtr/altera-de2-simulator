import React from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK } from '../../../board/de2Layout';
import { useLedGreenValue, useLedRedValue } from '../../../board/useBoardSelectors';
import { PartLabel } from './Silkscreen';
import { LED } from '../boardPalette';

interface Led2DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/**
 * DE2 indicator LED, flat top view. Red (LEDR17..0) and green (LEDG8..0) banks
 * share this component; both are ACTIVE-HIGH in the simulator.
 *
 * Not focusable — LEDs are output-only, so they are exposed to assistive
 * technology as a live status image rather than a control.
 */
export const Led2D: React.FC<Led2DProps> = React.memo(({ component, detail }) => {
  const index = component.index ?? 0;
  const isRed = component.type === 'led-red';
  // Both hooks are called so hook order stays stable; only one subscribes to a
  // value that ever changes for this component.
  const redValue = useLedRedValue(isRed ? index : -1);
  const greenValue = useLedGreenValue(isRed ? -1 : index);
  const isOn = (isRed ? redValue : greenValue) === 1;

  const { x, y, width: w, height: h } = component;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const label = `${isRed ? 'LEDR' : 'LEDG'}${index}`;
  // LEDG8 stands apart from the green bank, so it gets its own silkscreen line.
  const labelY = !isRed && index === 8 ? BOTTOM_SILK.ledg8LabelY : BOTTOM_SILK.ledLabelY;

  return (
    <g
      data-testid={isRed ? `de2-ledr-${index}` : `de2-ledg-${index}`}
      data-active={isOn ? 'true' : 'false'}
      role="img"
      aria-label={`${label} ${isOn ? 'on' : 'off'}`}
      pointerEvents="none"
    >
      {isOn && (
        <circle
          cx={cx}
          cy={cy}
          r={w * 2.1}
          fill={isRed ? 'url(#de2b-ledr-halo)' : 'url(#de2b-ledg-halo)'}
        />
      )}

      {/* Rectangular LED package seated on the board */}
      <rect
        x={x - 0.22}
        y={y - 0.22}
        width={w + 0.44}
        height={h + 0.44}
        rx={0.3}
        fill={LED.rim}
        opacity={0.55}
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={0.25}
        className="de2-led-lens"
        fill={
          isOn
            ? isRed
              ? 'url(#de2b-ledr-on)'
              : 'url(#de2b-ledg-on)'
            : isRed
              ? 'url(#de2b-ledr-off)'
              : 'url(#de2b-ledg-off)'
        }
        stroke="#0A0F16"
        strokeWidth={0.12}
      />
      {isOn && (
        <rect
          x={x + 0.45}
          y={y + 0.4}
          width={w - 0.9}
          height={h * 0.3}
          rx={0.18}
          fill="#FFFFFF"
          opacity={0.45}
        />
      )}

      <PartLabel
        x={cx}
        y={labelY}
        text={label}
        detail={detail}
        size={1.6}
        minDetail="high"
      />
    </g>
  );
});
Led2D.displayName = 'Led2D';
