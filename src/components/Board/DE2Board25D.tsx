import React from 'react';
import {
  BOARD_MM,
  DE2_CONNECTOR_LABELS,
  DE2_HEX_DISPLAYS,
  DE2_KEYS,
  DE2_LEDS_GREEN,
  DE2_LEDS_RED,
  DE2_SILKSCREEN,
  DE2_STATIC_COMPONENTS,
  DE2_SWITCHES,
  PCB_CORNER_RADIUS_MM,
  PCB_THICKNESS_MM,
  sortByDepth,
} from '../../board/de2Layout';
import type { BoardDetail } from '../../board/de2Layout';
import { FLAT_TRANSFORM, ISO_VIEWBOX_ATTR, polygon, project } from './boardGeometry';
import { BoardDefs } from './BoardDefs';
import { SilkscreenLayer } from './primitives/Silkscreen';
import { MountingHoles2D, PcbSurface2D } from './primitives/StaticParts2D';
import { StaticPart25D } from './primitives/StaticParts25D';
import { Switch25D } from './primitives/Switch25D';
import { Key25D } from './primitives/Key25D';
import { Led25D } from './primitives/Led25D';
import { SevenSegment25D } from './primitives/SevenSegment25D';

/**
 * Painter's-algorithm draw order, computed once. Every component — static
 * furniture and live indicators alike — is sorted together so nearer packages
 * correctly overlap the ones behind them.
 */
const ORDERED_COMPONENTS = sortByDepth([
  ...DE2_STATIC_COMPONENTS,
  ...DE2_HEX_DISPLAYS,
  ...DE2_LEDS_RED,
  ...DE2_LEDS_GREEN,
  ...DE2_SWITCHES,
  ...DE2_KEYS,
]);

const R = PCB_CORNER_RADIUS_MM;
const W = BOARD_MM.width;
const H = BOARD_MM.height;
const T = PCB_THICKNESS_MM;

/** Front and left walls of the FR-4 substrate, from the surface downward. */
const SUBSTRATE_FRONT = polygon([
  project(R, H, 0),
  project(W - R, H, 0),
  project(W - R, H, -T),
  project(R, H, -T),
]);

const SUBSTRATE_SIDE = polygon([
  project(0, R, 0),
  project(0, H - R, 0),
  project(0, H - R, -T),
  project(0, R, -T),
]);

const SHADOW_CENTRE = project(W / 2, H / 2, -T);

interface DE2Board25DProps {
  detail: BoardDetail;
}

/**
 * Elevated 2.5D view of the original Terasic / Altera DE2.
 *
 * This is NOT a separate DE2 implementation. It consumes the same
 * `de2Layout.ts` geometry and the same `boardStore` selectors as the 2D view;
 * the board surface and every static package top is literally the 2D artwork
 * placed onto a projected plane. Only the extruded walls and the depth-aware
 * interactive parts are specific to this renderer.
 *
 * No Three.js and no render loop: the projection is a handful of
 * multiplications and a single SVG transform per face.
 */
export const DE2Board25D: React.FC<DE2Board25DProps> = React.memo(({ detail }) => (
  <svg
    data-board-view="2.5d"
    className="de2-board-svg de2-board-svg--iso"
    viewBox={ISO_VIEWBOX_ATTR}
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    role="group"
    aria-label="Altera DE2 development board, elevated view"
    shapeRendering="geometricPrecision"
  >
    <BoardDefs />

    {/* Contact shadow under the board */}
    <ellipse
      cx={SHADOW_CENTRE.x + 2}
      cy={SHADOW_CENTRE.y + 3}
      rx={W * 0.6}
      ry={H * 0.34}
      fill="url(#de2b-board-shadow)"
    />

    {/* FR-4 substrate walls */}
    <polygon points={SUBSTRATE_SIDE} fill="url(#de2b-slab-side)" />
    <polygon points={SUBSTRATE_FRONT} fill="url(#de2b-slab-front)" />

    {/* Board surface: the 2D artwork, projected onto the board plane */}
    <g transform={FLAT_TRANSFORM}>
      <PcbSurface2D detail={detail} />
      <MountingHoles2D />
      <SilkscreenLayer items={DE2_SILKSCREEN} detail={detail} />
      <SilkscreenLayer items={DE2_CONNECTOR_LABELS} detail={detail} />
    </g>

    {/* Depth-sorted components */}
    {ORDERED_COMPONENTS.map((c) => {
      switch (c.type) {
        case 'switch':
          return <Switch25D key={c.id} component={c} detail={detail} />;
        case 'key':
          return <Key25D key={c.id} component={c} detail={detail} />;
        case 'led-red':
        case 'led-green':
          return <Led25D key={c.id} component={c} detail={detail} />;
        case 'seven-segment':
          return <SevenSegment25D key={c.id} component={c} detail={detail} />;
        default:
          return <StaticPart25D key={c.id} c={c} detail={detail} />;
      }
    })}
  </svg>
));
DE2Board25D.displayName = 'DE2Board25D';
