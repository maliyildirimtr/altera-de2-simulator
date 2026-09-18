import React from 'react';
import type { BoardBodyStyle, BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { cylinderSkirt, extrudeBox, faceTransform, projectedEllipse } from '../boardGeometry';
import { StaticPart2D } from './StaticParts2D';

/**
 * Side / front face colours for each body treatment. The 2.5D renderer only
 * needs to know what the *walls* of a package look like: the top face reuses
 * the 2D artwork verbatim via `faceTransform`, which is what keeps the two
 * views in the same visual family without a second set of drawings.
 */
const FACE: Partial<Record<BoardBodyStyle, { side: string; front: string }>> = {
  'ic-black': { side: '#0A0C0F', front: '#191C21' },
  metal: { side: '#5F6771', front: '#8A939E' },
  'metal-dark': { side: '#363B42', front: '#4E555E' },
  gold: { side: '#7E6427', front: '#A9883A' },
  'plastic-black': { side: '#0A0C10', front: '#1A1E24' },
  'plastic-white': { side: '#8A9099', front: '#B2B9C2' },
  barrel: { side: '#0A0C10', front: '#1A1E24' },
  'button-red': { side: '#71150E', front: '#A0221A' },
  lcd: { side: '#0B3A33', front: '#14584E' },
  rca: { side: '#5F6771', front: '#8A939E' },
  'jack-pink': { side: '#8E4E68', front: '#A35F7D' },
  'jack-blue': { side: '#35678B', front: '#3C7AA6' },
  'jack-green': { side: '#4E7A38', front: '#5B9042' },
  'jack-cream': { side: '#9A9486', front: '#C4BEAF' },
  tantalum: { side: '#463962', front: '#5C4B7E' },
  can: { side: '#22262C', front: '#3A3F48' },
  'indicator-blue': { side: '#1F5FB8', front: '#2E7FE0' },
};

const DEFAULT_FACE = { side: '#0A0C0F', front: '#171A1F' };

/** Round-bodied parts get a cylinder rather than a box. */
const ROUND_BODIES = new Set<BoardBodyStyle>(['button-red', 'gold', 'can']);

export const StaticPart25D: React.FC<{ c: BoardComponent; detail: BoardDetail }> = React.memo(
  ({ c, detail }) => {
    const elevation = c.elevation ?? 0.6;
    const face = (c.body && FACE[c.body]) || DEFAULT_FACE;

    if (c.body && ROUND_BODIES.has(c.body)) {
      const cx = c.x + c.width / 2;
      const cy = c.y + c.height / 2;
      const r = Math.min(c.width, c.height) / 2;
      const base = projectedEllipse(cx, cy, r, 0);
      return (
        <g data-part={c.id} pointerEvents="none">
          <ellipse cx={base.cx} cy={base.cy + 0.35} rx={base.rx * 1.1} ry={base.ry * 1.1} fill="#000000" opacity={0.28} />
          <path d={cylinderSkirt(cx, cy, r, elevation)} fill={face.side} />
          <g transform={faceTransform(elevation)}>
            <StaticPart2D c={c} detail={detail} />
          </g>
        </g>
      );
    }

    const box = extrudeBox(c.x, c.y, c.width, c.height, elevation);
    const showShadow = elevation >= 1.4;

    return (
      <g data-part={c.id} pointerEvents="none">
        {showShadow && (
          <g transform={faceTransform(0)}>
            <rect
              x={c.x - 0.5}
              y={c.y + 0.4}
              width={c.width + 1.4}
              height={c.height + 0.8}
              rx={0.5}
              fill="#000000"
              opacity={0.22}
            />
          </g>
        )}
        <polygon points={box.side} fill={face.side} />
        <polygon points={box.front} fill={face.front} />
        <g transform={faceTransform(elevation)}>
          <StaticPart2D c={c} detail={detail} />
        </g>
      </g>
    );
  },
);
StaticPart25D.displayName = 'StaticPart25D';
