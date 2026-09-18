import React from 'react';
import type { BoardBodyStyle, BoardComponent, BoardDetail } from '../../../board/de2Layout';
import { cylinderSkirt, extrudeBox, faceTransform, projectedEllipse } from '../boardGeometry';
import { StaticPart2D } from './StaticParts2D';

/**
 * Depth treatment for the 2.5D view.
 *
 * ── Why this file is small ────────────────────────────────────────────────
 * The top face of every package is the 2D artwork, placed on the projected
 * plane with a single `faceTransform`. This module therefore only has to
 * describe what the *walls* of a part look like, which is why the two views
 * cannot drift apart: there is exactly one drawing of a USB shell, and 2.5D
 * just stands it up.
 *
 * ── How depth is communicated ─────────────────────────────────────────────
 * Not by extrusion. Package heights are small and the camera is shallow (see
 * `ISO`), so solidity has to come from light instead of geometry:
 *
 *   1. one base colour per body style, holding only the part's hue;
 *   2. the SHARED shade gradients — `de2b-shade-{front,side}` — overlaid on
 *      every wall, so a cream jack and a black shroud are lit identically;
 *   3. a thin top-edge highlight where each wall meets the top face;
 *   4. a soft contact shadow on the board, cast down and to the right.
 *
 * Rule for anything added here: give it a base colour and let the shared
 * gradients light it. A bespoke per-connector gradient is what made the top
 * edge look like a collage in the previous pass.
 */

/** Base wall colours. Hue only — lighting comes from the shared gradients. */
const FACE: Partial<Record<BoardBodyStyle, { side: string; front: string; rim: string }>> = {
  'ic-black': { side: '#12151A', front: '#20242A', rim: '#4A515B' },
  metal: { side: '#7C848F', front: '#A3ACB7', rim: '#DDE3EA' },
  'metal-dark': { side: '#474D55', front: '#61686F', rim: '#9AA2AB' },
  gold: { side: '#8A6E2C', front: '#B99339', rim: '#F0D89A' },
  'plastic-black': { side: '#14171C', front: '#22262C', rim: '#4C535D' },
  'plastic-white': { side: '#9AA0A9', front: '#BEC5CE', rim: '#E8ECF1' },
  barrel: { side: '#14171C', front: '#22262C', rim: '#4C535D' },
  'button-red': { side: '#8A1E17', front: '#B92C24', rim: '#EF7A6D' },
  lcd: { side: '#0B3831', front: '#14544A', rim: '#3E8477' },
  rca: { side: '#7C848F', front: '#A3ACB7', rim: '#DDE3EA' },
  'jack-pink': { side: '#A96A85', front: '#C97E9C', rim: '#F0B8CD' },
  'jack-blue': { side: '#45789C', front: '#5892BE', rim: '#A6CFE9' },
  'jack-green': { side: '#5D8848', front: '#74A35A', rim: '#B9D9A3' },
  'jack-cream': { side: '#A8A294', front: '#CCC5B6', rim: '#EFE9DB' },
  tantalum: { side: '#4E4070', front: '#6B588F', rim: '#A791C9' },
  can: { side: '#2A2F36', front: '#434951', rim: '#7C838C' },
  'indicator-blue': { side: '#2A5E9E', front: '#3C7ECB', rim: '#9CC9F5' },
};

const DEFAULT_FACE = { side: '#12151A', front: '#1F2329', rim: '#474E58' };

/** Round-bodied parts get a cylinder rather than a box. */
const ROUND_BODIES = new Set<BoardBodyStyle>(['button-red', 'gold', 'can']);

/**
 * Soft contact shadow on the board surface, cast down and to the RIGHT —
 * away from the upper-left light. Scaled to the part's height so a tall
 * connector sits more firmly than a chip resistor, and drawn on the board
 * plane (not the part's plane) so it reads as shadow rather than skirt.
 */
const ContactPatch25D: React.FC<{ c: BoardComponent; elevation: number }> = ({ c, elevation }) => {
  const spread = Math.min(1.5, 0.3 + elevation * 0.2);
  return (
    <g transform={faceTransform(0)}>
      <rect
        x={c.x - spread * 0.35}
        y={c.y - spread * 0.2}
        width={c.width + spread * 1.3}
        height={c.height + spread * 1.5}
        rx={Math.min(c.width, c.height) * 0.3 + spread}
        fill="url(#de2b-contact)"
      />
    </g>
  );
};

export const StaticPart25D: React.FC<{ c: BoardComponent; detail: BoardDetail }> = React.memo(
  ({ c, detail }) => {
    const elevation = c.elevation ?? 0.6;
    const face = (c.body && FACE[c.body]) || DEFAULT_FACE;
    // Below roughly a millimetre a wall is thinner than its own highlight, so
    // the part is drawn flat and earns its depth from the contact shadow only.
    const walled = elevation >= 0.9;

    if (c.body && ROUND_BODIES.has(c.body)) {
      const cx = c.x + c.width / 2;
      const cy = c.y + c.height / 2;
      const r = Math.min(c.width, c.height) / 2;
      const skirt = cylinderSkirt(cx, cy, r, elevation);
      const base = projectedEllipse(cx, cy, r, 0);
      return (
        <g data-part={c.id} pointerEvents="none">
          <ellipse
            cx={base.cx + 0.3}
            cy={base.cy + 0.25}
            rx={base.rx * 1.5}
            ry={base.ry * 1.6}
            fill="url(#de2b-contact)"
          />
          <path d={skirt} fill={face.front} />
          <path d={skirt} fill="url(#de2b-shade-front)" />
          <g transform={faceTransform(elevation)}>
            <StaticPart2D c={c} detail={detail} />
          </g>
        </g>
      );
    }

    const box = extrudeBox(c.x, c.y, c.width, c.height, elevation);

    return (
      <g data-part={c.id} pointerEvents="none">
        <ContactPatch25D c={c} elevation={elevation} />
        {walled && (
          <>
            {/* Left wall, turned away from the light */}
            <polygon points={box.side} fill={face.side} />
            <polygon points={box.side} fill="url(#de2b-shade-side)" />
            {/* Wall facing the viewer */}
            <polygon points={box.front} fill={face.front} />
            <polygon points={box.front} fill="url(#de2b-shade-front)" />
            {/* Thin highlight on the top arris, where the walls meet the face */}
            <polygon
              points={box.top}
              fill="none"
              stroke={face.rim}
              strokeWidth={0.12}
              opacity={0.5}
            />
          </>
        )}
        <g transform={faceTransform(elevation)}>
          <StaticPart2D c={c} detail={detail} />
        </g>
      </g>
    );
  },
);
StaticPart25D.displayName = 'StaticPart25D';
