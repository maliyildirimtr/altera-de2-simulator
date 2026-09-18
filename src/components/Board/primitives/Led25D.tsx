import React from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { BOTTOM_SILK, hasDetail } from '../../../board/de2Layout';
import { useLedGreenValue, useLedRedValue } from '../../../board/useBoardSelectors';
import { extrudeBox, faceTransform, project } from '../boardGeometry';
import { PartLabel } from './Silkscreen';
import { LED, PCB } from '../boardPalette';

interface Led25DProps {
  component: BoardComponent;
  detail: BoardDetail;
}

/*
 * Heights here are deliberately shallow and match the elevation the canonical
 * layout gives this part. Depth is carried by the shared shade gradients,
 * the top-arris highlight and the contact shadow — not by extrusion. See the
 * header of `StaticParts25D.tsx` for the reasoning.
 */
const LENS_H = 1.55;

/**
 * DE2 indicator LED in the 2.5D view: a raised lens with visible side walls
 * and a halo that only appears while the LED is driven.
 *
 * Both banks are ACTIVE-HIGH, matching the 2D renderer and the store.
 *
 * The per-LED designator is printed here as well as in 2D. On the real board
 * that silkscreen sits ABOVE the LED row — between the resistor networks and
 * the lenses — which keeps it clear of the raised switch and push-button
 * bodies in front. An earlier pass had the line below the row, where those
 * bodies hid it, and dropped it from this view as a result.
 */
export const Led25D: React.FC<Led25DProps> = React.memo(({ component, detail }) => {
  const index = component.index ?? 0;
  const isRed = component.type === 'led-red';
  const redValue = useLedRedValue(isRed ? index : -1);
  const greenValue = useLedGreenValue(isRed ? -1 : index);
  const isOn = (isRed ? redValue : greenValue) === 1;

  const { x, y, width: w, height: h } = component;
  const box = extrudeBox(x, y, w, h, LENS_H);
  const label = `${isRed ? 'LEDR' : 'LEDG'}${index}`;
  const labelY = !isRed && index === 8 ? BOTTOM_SILK.ledg8LabelY : BOTTOM_SILK.ledLabelY;
  const halo = project(x + w / 2, y + h / 2, LENS_H);

  return (
    <g
      data-testid={isRed ? `de2-ledr-${index}` : `de2-ledg-${index}`}
      data-active={isOn ? 'true' : 'false'}
      role="img"
      aria-label={`${label} ${isOn ? 'on' : 'off'}`}
      pointerEvents="none"
    >
      {/* Printed courtyard box and silkscreen sit on the board plane */}
      <g transform={faceTransform(0)}>
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
            opacity={0.38}
          />
        )}
        <rect
          x={x - 0.2}
          y={y + 0.3}
          width={w + 0.8}
          height={h + 0.4}
          rx={0.3}
          fill="#02060C"
          opacity={0.32}
        />
        <PartLabel x={x + w / 2} y={labelY} text={label} detail={detail} size={1.55} minDetail="high" />
      </g>

      {isOn && (
        <ellipse
          cx={halo.x}
          cy={halo.y}
          rx={w * 2.4}
          ry={w * 1.7}
          fill={isRed ? 'url(#de2b-ledr-halo)' : 'url(#de2b-ledg-halo)'}
        />
      )}

      <polygon points={box.side} fill={isOn ? (isRed ? LED.redEdge : LED.greenEdge) : LED.rim} />
      <polygon
        points={box.front}
        fill={isOn ? (isRed ? '#D42A18' : '#25A849') : LED.rimLight}
      />
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
      <g transform={faceTransform(LENS_H)}>
        <rect
          x={x + 0.42}
          y={y + 0.34}
          width={w - 0.84}
          height={h * 0.26}
          rx={0.16}
          fill="#FFFFFF"
          opacity={isOn ? 0.46 : 0.12}
        />
      </g>
    </g>
  );
});
Led25D.displayName = 'Led25D';
