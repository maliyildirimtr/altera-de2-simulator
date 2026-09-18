import React from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK, hasDetail } from '../../../board/de2Layout';
import { useLedGreenValue, useLedRedValue } from '../../../board/useBoardSelectors';
import { PartLabel } from './Silkscreen';
import { LED, PCB } from '../boardPalette';

interface Led2DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/**
 * DE2 indicator LED, flat top view. Red (LEDR17..0) and green (LEDG8..0)
 * banks share this component; both are ACTIVE-HIGH in the simulator.
 *
 * Each lens sits inside a printed silkscreen courtyard box, as on the real
 * board, and its designator is printed ABOVE the row — see `BOTTOM_SILK`.
 *
 * Unlit lenses are drawn darker than a real diffused package would look. A
 * genuinely photographic "off" LED is pale enough to be misread as lit, and
 * the whole point of this panel is answering "which outputs are driven" at a
 * glance.
 *
 * Not focusable — LEDs are output-only, so they are exposed to assistive
 * technology as a live status image rather than a control.
 */
export const Led2D: React.FC<Led2DProps> = React.memo(({ component, detail }) => {
  const index = component.index ?? 0;
  const isRed = component.type === 'led-red';
  // Both hooks run so hook order stays stable; only one tracks a value that
  // ever changes for this component.
  const redValue = useLedRedValue(isRed ? index : -1);
  const greenValue = useLedGreenValue(isRed ? -1 : index);
  const isOn = (isRed ? redValue : greenValue) === 1;

  const { x, y, width: w, height: h } = component;
  const cx = x + w / 2;
  const label = `${isRed ? 'LEDR' : 'LEDG'}${index}`;
  const labelY = !isRed && index === 8 ? BOTTOM_SILK.ledg8LabelY : BOTTOM_SILK.ledLabelY;

  return (
    <g
      data-testid={isRed ? `de2-ledr-${index}` : `de2-ledg-${index}`}
      data-active={isOn ? 'true' : 'false'}
      role="img"
      aria-label={`${label} ${isOn ? 'on' : 'off'}`}
      pointerEvents="none"
    >
      {/* Printed courtyard box */}
      {hasDetail(detail, 'normal') && (
        <rect
          x={x - 0.85}
          y={y - 0.85}
          width={w + 1.7}
          height={h + 1.7}
          rx={0.2}
          fill="none"
          stroke={PCB.courtyard}
          strokeWidth={0.14}
          opacity={0.42}
        />
      )}

      {isOn && (
        <ellipse
          cx={cx}
          cy={y + h / 2}
          rx={w * 2.3}
          ry={h * 1.5}
          fill={isRed ? 'url(#de2b-ledr-halo)' : 'url(#de2b-ledg-halo)'}
        />
      )}

      {/* Seating shadow, then the lens rim, then the lens */}
      <rect
        x={x - 0.2}
        y={y + 0.12}
        width={w + 0.4}
        height={h + 0.3}
        rx={0.3}
        fill="#02060C"
        opacity={0.34}
      />
      <rect
        x={x - 0.24}
        y={y - 0.24}
        width={w + 0.48}
        height={h + 0.48}
        rx={0.28}
        fill="url(#de2b-led-rim)"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={0.22}
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
      />
      {/* Diffuser highlight — present lit or unlit, stronger when driven */}
      <rect
        x={x + 0.42}
        y={y + 0.34}
        width={w - 0.84}
        height={h * 0.26}
        rx={0.16}
        fill="#FFFFFF"
        opacity={isOn ? 0.46 : 0.12}
      />
      {isOn && (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={0.22}
          fill="none"
          stroke={isRed ? LED.redCore : LED.greenCore}
          strokeWidth={0.16}
          opacity={0.55}
        />
      )}

      <PartLabel x={cx} y={labelY} text={label} detail={detail} size={1.55} minDetail="high" />
    </g>
  );
});
Led2D.displayName = 'Led2D';
