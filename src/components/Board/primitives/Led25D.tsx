import React from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { useLedGreenValue, useLedRedValue } from '../../../board/useBoardSelectors';
import { extrudeBox, faceTransform, project } from '../boardGeometry';

interface Led25DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

const LENS_H = 1.9;

/**
 * DE2 indicator LED in the 2.5D view: a raised lens with visible side walls
 * and a halo that only appears while the LED is driven.
 *
 * Both banks are ACTIVE-HIGH, matching the 2D renderer and the store.
 *
 * Unlike the flat view this renderer prints no per-LED silkscreen. On the real
 * board that text is a 1.5 mm line wedged between the LED row and the switch
 * bank, and from an elevated angle the raised switch and push-button bodies
 * stand in front of it. Drawing it here would only ever be half-legible, so the
 * bank headings carry the labelling and the 2D view remains the place to read
 * individual designators.
 */
export const Led25D: React.FC<Led25DProps> = React.memo(({ component }) => {
  const index = component.index ?? 0;
  const isRed = component.type === 'led-red';
  const redValue = useLedRedValue(isRed ? index : -1);
  const greenValue = useLedGreenValue(isRed ? -1 : index);
  const isOn = (isRed ? redValue : greenValue) === 1;

  const { x, y, width: w, height: h } = component;
  const box = extrudeBox(x, y, w, h, LENS_H);
  const label = `${isRed ? 'LEDR' : 'LEDG'}${index}`;
  const halo = project(x + w / 2, y + h / 2, LENS_H);

  return (
    <g
      data-testid={isRed ? `de2-ledr-${index}` : `de2-ledg-${index}`}
      data-active={isOn ? 'true' : 'false'}
      role="img"
      aria-label={`${label} ${isOn ? 'on' : 'off'}`}
      pointerEvents="none"
    >
      {isOn && (
        <ellipse
          cx={halo.x}
          cy={halo.y}
          rx={w * 2.3}
          ry={w * 1.7}
          fill={isRed ? 'url(#de2b-ledr-halo)' : 'url(#de2b-ledg-halo)'}
        />
      )}

      <polygon points={box.side} fill={isOn ? (isRed ? '#8E1A12' : '#17762F') : '#1B222C'} />
      <polygon points={box.front} fill={isOn ? (isRed ? '#B8241A' : '#1E9A3E') : '#242C38'} />
      <polygon
        points={box.top}
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
        strokeWidth={0.1}
      />
      {isOn && (
        <g transform={faceTransform(LENS_H)}>
          <rect
            x={x + 0.45}
            y={y + 0.4}
            width={w - 0.9}
            height={h * 0.3}
            rx={0.18}
            fill="#FFFFFF"
            opacity={0.45}
          />
        </g>
      )}
    </g>
  );
});
Led25D.displayName = 'Led25D';
