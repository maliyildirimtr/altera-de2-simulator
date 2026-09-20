import React from 'react';
import {
  ARTWORK_PLANE,
  DE2_ARTWORK_TRANSPARENT_SRC,
  PCB_BODY,
  PCB_SUBSTRATE,
  RAISED_PARTS_25D,
  ax,
  ay,
  partFootprint,
} from '../../../board/de2ArtworkLayout';
import type { RaisedPartGroup } from '../../../board/de2ArtworkLayout';
import {
  PCB_EDGE_UNITS,
  SCENE,
  heightUnits,
  planeTransform25d,
  project25d,
} from '../../../board/de2Scene25D';

/**
 * Scene primitives for the artwork-driven 2.5D board.
 *
 * ── What this layer does and does not draw ───────────────────────────────
 * It draws NO component. Every part in this view is pixels from the
 * transparent master; this module only decides where those pixels sit in
 * depth, and paints the two things a photograph of a flat board cannot
 * supply: the substrate's own edge, and the side of a part that has been
 * lifted off it.
 *
 * ── The anti-ghosting rule ───────────────────────────────────────────────
 * Lifting a crop off the board uncovers the copy of that part still baked
 * into the artwork underneath — the duplicate the brief forbids. The fix here
 * is not a patch that happens to be about the right size: the exposed region
 * IS the part's side, so the shape that hides the ghost and the shape that
 * shows the depth are the same rectangle, derived from the same height. They
 * cannot disagree, and changing a height cannot reintroduce a seam.
 *
 * That only holds because the scene has no lateral shear (see `SCENE.shear`).
 * With shear, a strip down one side of every part is uncovered too, and that
 * strip runs the full height of the part — including, for the top connectors,
 * the portion standing above the board where the artwork is transparent. A
 * rectangle there would paint a dark sliver into the empty background, so
 * covering it would need the artwork's own alpha as a mask on every group.
 * Nine units of side reveal is not worth eight masked copies of a 2560 px
 * image, so the projection is a straight-on tilt and the skirt is one band.
 */

/* ────────────────────────────────────────────────────────────────────────
 * Materials
 *
 * One light, upper left, shared with the 2D overlays and the vector views.
 * ──────────────────────────────────────────────────────────────────────── */

const SHADOW = {
  /** Under the whole board. Restrained: this is a board on a desk, not a hero shot. */
  board: '#000000',
  boardOpacity: 0.3,
  /** Where a lifted part meets the board. Short and soft. */
  contact: '#02121D',
} as const;

/**
 * How much narrower the extruded face is than the footprint it stands on.
 *
 * A face drawn to the exact footprint width ends in two hard corners flush
 * with the part above it, which reads as a tab stuck to the bottom of the
 * part. Pulling it in a couple of percent lets the part's own edge overhang
 * its side by a hair, which is what an edge does.
 */
const FACE_INSET = 0.025;

const faceGradientId = (groupId: string, index: number): string =>
  `de2s-face-${groupId}-${index}`;
const clipPathId = (id: string): string => `de2s-clip-${id}`;

/**
 * Paint servers and clip regions for the scene.
 *
 * Ids are prefixed `de2s-` so this renderer can never collide with the 2D
 * overlay defs (`de2a-`) or the vector board's (`de2b-`). All three can be
 * mounted at once — the workspace does exactly that when switching views —
 * and a shared id would silently repaint one board with another's materials.
 */
export const Scene25DDefs: React.FC = () => (
  <defs>
    {/* Board shadow. A gradient rather than a blur filter: same softness, no
        filter region to rasterise on every zoom step. */}
    <radialGradient id="de2s-board-shadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor={SHADOW.board} stopOpacity={SHADOW.boardOpacity} />
      <stop offset="58%" stopColor={SHADOW.board} stopOpacity={SHADOW.boardOpacity * 0.42} />
      <stop offset="100%" stopColor={SHADOW.board} stopOpacity="0" />
    </radialGradient>

    {/* The substrate's cut edge: fibreglass and mask, darkening downward. */}
    <linearGradient id="de2s-pcb-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={PCB_SUBSTRATE.faceTop} />
      <stop offset="100%" stopColor={PCB_SUBSTRATE.faceBottom} />
    </linearGradient>

    {/* Contact shadow, cast onto the board by whatever stands on it. */}
    <linearGradient id="de2s-contact" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={SHADOW.contact} stopOpacity="0.5" />
      <stop offset="60%" stopColor={SHADOW.contact} stopOpacity="0.14" />
      <stop offset="100%" stopColor={SHADOW.contact} stopOpacity="0" />
    </linearGradient>

    {/*
      One side-face gradient per PART, from that part's own lower body.

      Per part rather than per group because the connector row is pink, blue,
      green, silver, black and navy across twelve members. Giving them one
      shared grey was the single worst thing about the first pass: it read as a
      row of black bars sitting under the connectors instead of the connectors
      having sides.
    */}
    {RAISED_PARTS_25D.flatMap((group) =>
      group.parts.map((part, i) => (
        <linearGradient
          key={`${group.id}-${i}`}
          id={faceGradientId(group.id, i)}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={part.faceTop ?? group.faceTop} />
          <stop offset="100%" stopColor={part.faceBottom ?? group.faceBottom} />
        </linearGradient>
      )),
    )}

    {/*
      Crop regions, in board space.

      A clipPath may hold many rects and clips to their UNION, which is what
      lets one image reference lift a whole bank — eighteen switch housings
      and none of the board between them — with one clip instead of eighteen.
    */}
    {RAISED_PARTS_25D.map((group) => (
      <clipPath key={group.id} id={clipPathId(group.id)} clipPathUnits="userSpaceOnUse">
        {group.parts.map((part, i) => (
          <rect
            key={i}
            x={ax(part.x)}
            y={ay(part.y)}
            width={ax(part.width)}
            height={ay(part.height)}
          />
        ))}
      </clipPath>
    ))}
  </defs>
);

/* ────────────────────────────────────────────────────────────────────────
 * The board
 * ──────────────────────────────────────────────────────────────────────── */

const PCB_LEFT = ax(PCB_BODY.x);
const PCB_RIGHT = ax(PCB_BODY.x + PCB_BODY.width);
const PCB_TOP = ay(PCB_BODY.y);
const PCB_BOTTOM = ay(PCB_BODY.y + PCB_BODY.height);
const PCB_RADIUS = ax(PCB_BODY.radius);

/** Where the board's own front edge starts and ends, in scene space. */
const FRONT_EDGE_TOP = project25d(PCB_LEFT, PCB_BOTTOM, 0).y;
const FRONT_EDGE_BOTTOM = project25d(PCB_LEFT, PCB_BOTTOM, -PCB_EDGE_UNITS).y;

/**
 * Shadow cast by the board onto whatever it is sitting on.
 *
 * Centred just below the board's front half, because a board tilted away from
 * the viewer throws its shadow toward them. Wider than the board by a margin
 * the scene's viewBox already reserves.
 */
export const BoardShadow25D: React.FC = () => (
  <ellipse
    data-scene-layer="board-shadow"
    cx={(PCB_LEFT + PCB_RIGHT) / 2}
    cy={FRONT_EDGE_BOTTOM - (FRONT_EDGE_BOTTOM - project25d(0, PCB_TOP, 0).y) * 0.34}
    rx={(PCB_RIGHT - PCB_LEFT) / 2 + 74}
    ry={(FRONT_EDGE_BOTTOM - project25d(0, PCB_TOP, 0).y) * 0.62}
    fill="url(#de2s-board-shadow)"
    pointerEvents="none"
  />
);

/**
 * The substrate, as a solid with thickness.
 *
 * Only the PCB_BODY rectangle is extruded — never the alpha contour. The
 * standoffs, the DC jack, the VGA shield and the SD socket all overhang the
 * substrate, and giving them board thickness would draw a lip around the
 * outline of the assembly instead of an edge on the board.
 *
 * The top face is filled even though the artwork covers it: it guarantees no
 * background shows through anywhere the render is not fully opaque, and it is
 * what the front edge's colour is matched to.
 */
export const PcbBody25D: React.FC = () => (
  <g data-scene-layer="pcb-body" pointerEvents="none">
    {/* Front edge, from the board plane downward. Drawn before the surface so
        the surface's own bottom edge stays crisp on top of it. */}
    <path
      data-pcb-edge="front"
      d={
        `M ${PCB_LEFT} ${FRONT_EDGE_TOP}` +
        ` L ${PCB_RIGHT} ${FRONT_EDGE_TOP}` +
        ` L ${PCB_RIGHT} ${FRONT_EDGE_BOTTOM}` +
        ` Q ${PCB_RIGHT} ${FRONT_EDGE_BOTTOM + PCB_RADIUS} ${PCB_RIGHT - PCB_RADIUS} ${FRONT_EDGE_BOTTOM + PCB_RADIUS}` +
        ` L ${PCB_LEFT + PCB_RADIUS} ${FRONT_EDGE_BOTTOM + PCB_RADIUS}` +
        ` Q ${PCB_LEFT} ${FRONT_EDGE_BOTTOM + PCB_RADIUS} ${PCB_LEFT} ${FRONT_EDGE_BOTTOM}` +
        ' Z'
      }
      fill="url(#de2s-pcb-face)"
    />
    {/* Substrate top face, under the artwork. */}
    <g transform={planeTransform25d(0)}>
      <rect
        data-pcb-surface=""
        x={PCB_LEFT}
        y={PCB_TOP}
        width={PCB_RIGHT - PCB_LEFT}
        height={PCB_BOTTOM - PCB_TOP}
        rx={PCB_RADIUS}
        fill={PCB_SUBSTRATE.surface}
      />
    </g>
  </g>
);

/* ────────────────────────────────────────────────────────────────────────
 * Artwork planes
 * ──────────────────────────────────────────────────────────────────────── */

/** The transparent render, placed so its board lands on the 2D calibration. */
const ArtworkImage: React.FC = () => (
  <image
    href={DE2_ARTWORK_TRANSPARENT_SRC}
    x={ARTWORK_PLANE.x}
    y={ARTWORK_PLANE.y}
    width={ARTWORK_PLANE.width}
    height={ARTWORK_PLANE.height}
    preserveAspectRatio="xMidYMid meet"
    pointerEvents="none"
    style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
  />
);

/**
 * The board plane: the artwork, and anything that belongs flat on the board.
 *
 * Children are drawn in the artwork's own normalised coordinates, exactly as
 * the 2D renderer passes them, because at height zero the projection is a
 * single vertical scale about the board's centre line. That is the whole
 * reason the approved 2D overlays can be reused here without a second
 * calibration: they are not ported, they are the same components.
 */
export const BoardPlane25D: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <g data-scene-layer="board-plane" transform={planeTransform25d(0)}>
    <ArtworkImage />
    {children}
  </g>
);

/**
 * One group of artwork lifted off the board, with the side it now shows.
 *
 * Draw order within the group is the order the light reaches it: the contact
 * shadow onto the board, then the extruded side standing on it, then the part
 * itself, then whatever of the part is live.
 *
 * `children` are rendered in the part's own raised plane, in unmodified
 * artwork coordinates — so a seven-segment overlay lands on the top face of
 * the display it belongs to without knowing the display has been raised.
 */
export const RaisedGroup25D: React.FC<{
  group: RaisedPartGroup;
  children?: React.ReactNode;
}> = ({ group, children }) => {
  const h = heightUnits(group.heightMm);
  const drop = h * SCENE.lift;

  return (
    <g data-scene-raised={group.id} data-raised-height={h.toFixed(1)}>
      {/* Contact shadow, on the board, under the part's leading edge. */}
      <g pointerEvents="none">
        {group.parts.map((part, i) => {
          const foot = partFootprint(part);
          const base = project25d(0, ay(part.y + part.height), 0).y;
          return (
            <rect
              key={i}
              x={ax(foot.x)}
              y={base}
              width={ax(foot.width)}
              height={Math.max(2, drop * 0.5)}
              fill="url(#de2s-contact)"
            />
          );
        })}
      </g>

      {/*
        The extruded side.

        Its top is the part's bottom edge at the RAISED height and its bottom
        is the same edge on the BOARD, so it spans precisely the band the lift
        uncovered — the geometry and the occlusion are one calculation, and no
        height can leave a seam behind. Every band lies over the board rather
        than over the transparent background, because a part's lower edge is
        where it meets the PCB.

        Drawn to the part's FOOTPRINT, not its crop: a crop is a rectangle
        around a shape, and the DC jack's is 10% wider than the jack.
      */}
      <g pointerEvents="none">
        {group.parts.map((part, i) => {
          const foot = partFootprint(part);
          const inset = ax(foot.width) * FACE_INSET;
          const bottomEdge = ay(part.y + part.height);
          return (
            <rect
              key={i}
              data-raised-face={group.id}
              x={ax(foot.x) + inset}
              y={project25d(0, bottomEdge, h).y}
              width={Math.max(1, ax(foot.width) - 2 * inset)}
              height={drop}
              fill={`url(#${faceGradientId(group.id, i)})`}
            />
          );
        })}
      </g>

      {/* The part itself: the same artwork, cropped and lifted. */}
      <g transform={planeTransform25d(h)}>
        <g clipPath={`url(#${clipPathId(group.id)})`}>
          <ArtworkImage />
        </g>
        {children}
      </g>
    </g>
  );
};
