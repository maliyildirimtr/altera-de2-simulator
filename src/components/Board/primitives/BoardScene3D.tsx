import React from 'react';
import {
  ARTWORK_PLANE,
  DE2_ARTWORK_TRANSPARENT_SRC,
  GROUND_MATERIAL,
  PCB_BODY,
  PCB_SUBSTRATE,
  STANDOFFS,
  STANDOFF_MATERIAL,
  ax,
  ay,
  partFootprint,
} from '../../../board/de2ArtworkLayout';
import type { RaisedPart } from '../../../board/de2ArtworkLayout';
import {
  ARTWORK_BOX,
  GROUND_MARGIN,
  PCB_THICKNESS,
  STANDOFF_DROP,
  STAGE,
  sx,
  sy,
  zUnits,
} from '../../../board/de2Scene3D';

/**
 * CSS 3D primitives for the DE2 board scene.
 *
 * ── What this layer draws ────────────────────────────────────────────────
 * No component. Every piece of hardware in this view is pixels from the one
 * transparent master; this module decides where in THREE dimensions those
 * pixels sit and paints the two things a photograph of a flat board cannot
 * supply — the substrate's cut edge, and the walls a part has because it
 * stands off the board.
 *
 * ── Why no component is drawn twice ──────────────────────────────────────
 * The base artwork contains every part, so lifting a copy of one would leave
 * the original underneath. That is solved at the source: the base artwork is
 * drawn through a mask with a HOLE punched at each raised part's footprint, so
 * there is exactly one copy of every component in the scene. The hole exposes
 * the substrate underneath, and almost all of it is covered again by the part
 * now floating above it — what remains visible is the sliver the part's own
 * wall occupies, which is where a wall belongs.
 *
 * That ordering is the point. The previous renderer kept the original and
 * covered it with a rectangle sized to match; this one removes it. Nothing
 * can drift out of alignment with a hole that is not there.
 *
 * ── Why walls are real faces ─────────────────────────────────────────────
 * A wall is a child div rotated `rotateX(-90deg)` about its top edge, so it
 * leaves the part's plane and descends to the board. The compositor
 * foreshortens it with everything else, so its apparent height comes from the
 * camera rather than from a number chosen to look right, and it shrinks
 * correctly toward the far edge of the board.
 */

/** Shared source image, addressed identically by every crop. */
const ARTWORK_URL = `url(${DE2_ARTWORK_TRANSPARENT_SRC})`;
const ARTWORK_BACKGROUND_SIZE = `${ARTWORK_BOX.width}px ${ARTWORK_BOX.height}px`;

/**
 * A window onto the shared artwork, standing at height `z`.
 *
 * This is the one way a raised component is drawn. It takes artwork
 * coordinates, so a part's crop is the same rectangle the calibration
 * measured, and it never re-exports or redraws anything: the div's background
 * IS the master, offset so the requested region lands in the window.
 *
 * `children` are rendered in an SVG whose viewBox is this part's own artwork
 * rectangle, which is what lets a live overlay be nested here and still be
 * written in plain artwork coordinates. Anything drawn inside inherits the
 * part's 3D transform, so an overlay sits on the part's top face, moves with
 * it and is hit-tested on it, with no projection maths of its own.
 */
export interface ArtworkCropProps {
  /** Normalised artwork bounds of the region to show. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Height above the board plane, in scene units. */
  z: number;
  /** Stable id, used for test hooks. */
  id?: string;
  label?: string;
  /** The part's own wall material, and where it meets the board. */
  wall?: { x: number; width: number; top: string; bottom: string } | null;
  children?: React.ReactNode;
}

export const ArtworkCrop: React.FC<ArtworkCropProps> = React.memo(
  ({ x, y, width, height, z, id, label, wall, children }) => {
    // CSS geometry in scene px; the child SVG's viewBox stays in ARTWORK
    // units, so nested overlays keep drawing in the coordinates the
    // calibration measured and need no knowledge of the scene's scale.
    const left = sx(x);
    const top = sy(y);
    const w = sx(width);
    const h = sy(height);

    return (
      <div
        data-artwork-crop={id}
        data-crop-z={z.toFixed(1)}
        aria-hidden={label ? undefined : true}
        style={{
          position: 'absolute',
          left,
          top,
          width: w,
          height: h,
          transform: `translateZ(${z}px)`,
          transformStyle: 'preserve-3d',
          backgroundImage: ARTWORK_URL,
          backgroundSize: ARTWORK_BACKGROUND_SIZE,
          backgroundPosition: `${ARTWORK_BOX.x - left}px ${ARTWORK_BOX.y - top}px`,
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/*
          The part's wall: from its lower edge on the top face, down to the
          board. A genuine 3D face — the browser decides how tall it looks.

          Drawn to the part's FOOTPRINT, not its crop. A crop is a rectangle
          around a shape and the DC jack's is 10% wider than the jack, so a
          wall spanning the crop would put a bar across the board beside it.
        */}
        {wall && z > 0 && (
          <div
            data-crop-wall={id}
            style={{
              position: 'absolute',
              left: wall.x - left,
              top: h,
              width: wall.width,
              height: z,
              transformOrigin: 'top center',
              transform: 'rotateX(-90deg)',
              backgroundImage: `linear-gradient(to bottom, ${wall.top}, ${wall.bottom})`,
            }}
          />
        )}

        {children && (
          <svg
            viewBox={`${ax(x)} ${ay(y)} ${ax(width)} ${ay(height)}`}
            width={w}
            height={h}
            style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
            aria-hidden={label ? undefined : true}
          >
            {children}
          </svg>
        )}
      </div>
    );
  },
);
ArtworkCrop.displayName = 'ArtworkCrop';

/**
 * Turns a measured part into the crop that draws it.
 *
 * `zOverride` exists for parts whose height is state rather than a constant —
 * a tact switch sinks toward the board when it is held down. The wall shortens
 * with it, because the wall's depth IS the height.
 */
export const RaisedPart3D: React.FC<{
  part: RaisedPart;
  zOverride?: number;
  children?: React.ReactNode;
}> = React.memo(({ part, zOverride, children }) => {
    const foot = partFootprint(part);
    return (
      <ArtworkCrop
        id={part.id}
        label={part.label}
        x={part.x}
        y={part.y}
        width={part.width}
        height={part.height}
        z={zOverride ?? zUnits(part.heightMm)}
        wall={{
          x: sx(foot.x),
          width: sx(foot.width),
          top: part.wallTop,
          bottom: part.wallBottom,
        }}
      >
        {children}
      </ArtworkCrop>
    );
  });
RaisedPart3D.displayName = 'RaisedPart3D';

/* ────────────────────────────────────────────────────────────────────────
 * The substrate
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The PCB as a shallow solid.
 *
 * Only `PCB_BODY` is given thickness — never the artwork's alpha contour. The
 * standoffs, the DC jack, the VGA shield and the SD socket all overhang the
 * fibreglass, so extruding the silhouette would wrap board thickness around
 * the outline of the assembly instead of putting an edge on the board.
 *
 * Two faces are visible under this camera: the near edge, because the board is
 * tilted toward the viewer, and the right edge, because of the two degrees of
 * `rotateY`. The far and left faces point away and are simply not drawn —
 * there is nothing to see and nothing to pay for.
 *
 * The top face is filled with the measured solder-mask colour. It is both the
 * surface the artwork sits on and, where the artwork has holes punched for
 * raised parts, the underlay those holes reveal.
 */
export const PcbSlab3D: React.FC = React.memo(() => {
  const left = sx(PCB_BODY.x);
  const top = sy(PCB_BODY.y);
  const w = sx(PCB_BODY.width);
  const h = sy(PCB_BODY.height);
  const radius = sx(PCB_BODY.radius);

  return (
    <div
      data-scene-layer="pcb-slab"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left,
        top,
        width: w,
        height: h,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        data-pcb-surface=""
        style={{
          position: 'absolute',
          inset: 0,
          background: PCB_SUBSTRATE.surface,
          borderRadius: radius,
        }}
      />

      {/* Near edge. */}
      <div
        data-pcb-edge="front"
        style={{
          position: 'absolute',
          left: 0,
          top: h,
          width: w,
          height: PCB_THICKNESS,
          transformOrigin: 'top center',
          transform: 'rotateX(-90deg)',
          backgroundImage:
            `linear-gradient(to bottom, ${PCB_SUBSTRATE.faceTop}, ${PCB_SUBSTRATE.faceBottom})`,
          borderBottomLeftRadius: radius,
          borderBottomRightRadius: radius,
        }}
      />

      {/* Right edge, revealed by the small rotateY. */}
      <div
        data-pcb-edge="right"
        style={{
          position: 'absolute',
          left: w,
          top: 0,
          width: PCB_THICKNESS,
          height: h,
          transformOrigin: 'left center',
          transform: 'rotateY(90deg)',
          backgroundImage:
            `linear-gradient(to right, ${PCB_SUBSTRATE.faceTop}, ${PCB_SUBSTRATE.faceBottom})`,
        }}
      />
    </div>
  );
});
PcbSlab3D.displayName = 'PcbSlab3D';

/* ────────────────────────────────────────────────────────────────────────
 * The board surface
 * ──────────────────────────────────────────────────────────────────────── */

const BASE_MASK_ID = 'de2p-base-holes';

/**
 * The board surface: one layer, at z = 0.
 *
 * ── What is in it ────────────────────────────────────────────────────────
 * The transparent artwork drawn through a mask with a HOLE punched at every
 * raised part, plus everything that belongs flat ON the board — the live LED
 * lenses and the silkscreen corrections. `holes` is the list of parts actually
 * lifted, so the mask can never punch a hole for a component that is still
 * flat: the renderer passes one array to both this and the crops.
 *
 * The hole is the part's CROP, exactly the region the raised copy draws. Under
 * perspective the raised copy is magnified and displaced, so it does not land
 * back on its own hole precisely; what shows through is a sliver at the part's
 * lower edge, which is where that part's wall stands.
 *
 * ── Why one layer and not two ────────────────────────────────────────────
 * The artwork and the flat overlays were separate elements, both the size of
 * the whole board. In a `preserve-3d` subtree each is rasterised into its own
 * texture at DEVICE pixels, so two full-board layers cost twice the texture
 * budget for no benefit — they are coplanar and never move relative to each
 * other. Merging them halves the largest cost in the scene and removes a
 * coplanar pair the compositor would otherwise have to sort.
 *
 * The element is sized in SCENE px while the SVG viewBox stays in ARTWORK
 * units, which is what lets the overlay components be the very ones the 2D
 * board mounts, in their original coordinates.
 */
export const BoardSurface3D: React.FC<{
  holes: readonly RaisedPart[];
  children?: React.ReactNode;
}> = React.memo(({ holes, children }) => (
  <div
    data-scene-layer="board-surface"
    style={{
      position: 'absolute',
      left: ARTWORK_BOX.x,
      top: ARTWORK_BOX.y,
      width: ARTWORK_BOX.width,
      height: ARTWORK_BOX.height,
      transformStyle: 'preserve-3d',
    }}
  >
    <svg
      viewBox={
        `${ARTWORK_PLANE.x} ${ARTWORK_PLANE.y} ${ARTWORK_PLANE.width} ${ARTWORK_PLANE.height}`
      }
      width={ARTWORK_BOX.width}
      height={ARTWORK_BOX.height}
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
    >
      <defs>
        <mask
          id={BASE_MASK_ID}
          maskUnits="userSpaceOnUse"
          x={ARTWORK_PLANE.x}
          y={ARTWORK_PLANE.y}
          width={ARTWORK_PLANE.width}
          height={ARTWORK_PLANE.height}
        >
          <rect
            x={ARTWORK_PLANE.x}
            y={ARTWORK_PLANE.y}
            width={ARTWORK_PLANE.width}
            height={ARTWORK_PLANE.height}
            fill="#fff"
          />
          {holes.map((part) => (
            <rect
              key={part.id}
              data-base-hole={part.id}
              x={ax(part.x)}
              y={ay(part.y)}
              width={ax(part.width)}
              height={ay(part.height)}
              fill="#000"
            />
          ))}
        </mask>
      </defs>
      <image
        href={DE2_ARTWORK_TRANSPARENT_SRC}
        x={ARTWORK_PLANE.x}
        y={ARTWORK_PLANE.y}
        width={ARTWORK_PLANE.width}
        height={ARTWORK_PLANE.height}
        preserveAspectRatio="xMidYMid meet"
        mask={`url(#${BASE_MASK_ID})`}
        style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
      />
      {children}
    </svg>
  </div>
));
BoardSurface3D.displayName = 'BoardSurface3D';

/**
 * A transparent plane at a given height, for things that belong at a part's
 * elevation without being a part.
 *
 * The HEX designators are the case it exists for: they are the one row of
 * silkscreen on this board printed ABOVE the part it names rather than below,
 * so a 7 mm display standing toward the viewer covers its own label. Drawing
 * that row at the modules' height keeps each designator over its display at
 * any camera angle. Everything else stays on the board, where ink belongs.
 */
export const RaisedPlane3D: React.FC<{
  id: string;
  z: number;
  children?: React.ReactNode;
}> = React.memo(({ id, z, children }) => (
  <div
    data-raised-plane={id}
    style={{
      position: 'absolute',
      left: ARTWORK_BOX.x,
      top: ARTWORK_BOX.y,
      width: ARTWORK_BOX.width,
      height: ARTWORK_BOX.height,
      transform: `translateZ(${z}px)`,
      transformStyle: 'preserve-3d',
      pointerEvents: 'none',
    }}
  >
    <svg
      viewBox={
        `${ARTWORK_PLANE.x} ${ARTWORK_PLANE.y} ${ARTWORK_PLANE.width} ${ARTWORK_PLANE.height}`
      }
      width={ARTWORK_BOX.width}
      height={ARTWORK_BOX.height}
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
      aria-hidden="true"
    >
      {children}
    </svg>
  </div>
));
RaisedPlane3D.displayName = 'RaisedPlane3D';

/* ────────────────────────────────────────────────────────────────────────
 * Physical grounding
 *
 * A board floating in UI space reads as an image however good the camera is.
 * What sells it as an object is the three things below: a surface under it,
 * four feet holding it off that surface, and one shadow that agrees with both.
 * ──────────────────────────────────────────────────────────────────────── */

/** Uniform margin of surface around the board, in scene units. */
const GROUND_INSET = GROUND_MARGIN * STAGE.width;
const GROUND_Z = -(PCB_THICKNESS + STANDOFF_DROP);
/**
 * How far the shadow sits from the board, as a fraction of the board — not a
 * pixel count. The scene has been rescaled once already; a literal offset
 * survives that silently wrong, which is how this shadow ended up 2.2x the
 * size of the board it belongs to.
 */
const SHADOW_OFFSET = {
  x: 0.014 * sx(PCB_BODY.width),
  y: 0.022 * sy(PCB_BODY.height),
} as const;

/**
 * The surface the board rests on.
 *
 * Parallel to the board, a standoff's height below it — which is correct
 * rather than convenient: the board is lying on a desk, so the desk and the
 * board share a plane, and the camera's tilt is what makes both recede.
 *
 * It fades out with a radial gradient instead of ending at an edge. A finite
 * rectangle of surface reads as a card the board has been placed on; a pool of
 * light that falls off reads as a surface continuing past the frame.
 */
export const GroundPlane3D: React.FC = React.memo(() => (
  <div
    data-scene-layer="ground"
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: sx(PCB_BODY.x) - GROUND_INSET,
      top: sy(PCB_BODY.y) - GROUND_INSET,
      width: sx(PCB_BODY.width) + 2 * GROUND_INSET,
      height: sy(PCB_BODY.height) + 2 * GROUND_INSET,
      transform: `translateZ(${GROUND_Z}px)`,
      /*
        The lit core reaches under the board, then falls fully transparent well
        before the element's bounds. Letting colour survive to the bounds makes
        this layer read as the large flat rectangle the reference explicitly
        avoids; the scene needs a pool of light, not a second slab.

        Themed through tokens rather than fixed: light theme needs a surface
        darker than its canvas, dark theme one lighter than its own.
      */
      background:
        `radial-gradient(70% 70% at 47% 47%,` +
        ` var(--board-ground-lit, ${GROUND_MATERIAL.lit}) 0%,` +
        ` var(--board-ground-lit, ${GROUND_MATERIAL.lit}) 34%,` +
        ` var(--board-ground-edge, ${GROUND_MATERIAL.edge}) 60%, transparent 82%)`,
    }}
  />
));
GroundPlane3D.displayName = 'GroundPlane3D';

/**
 * The board's shadow, on the surface.
 *
 * Drawn at the ground's own depth, so the camera foreshortens it with the
 * surface it is cast on and it cannot slide out of register with the board.
 * Offset down and right, away from the scene's one light in the upper left.
 *
 * Restrained on purpose. With a real camera, real Z and real feet, depth is
 * already carried by the geometry; a heavy shadow under a board that is
 * visibly standing up reads as a sticker with a glow.
 */
export const BoardShadow3D: React.FC = React.memo(() => (
  <div
    data-scene-layer="board-shadow"
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: sx(PCB_BODY.x) + SHADOW_OFFSET.x,
      top: sy(PCB_BODY.y) + SHADOW_OFFSET.y,
      width: sx(PCB_BODY.width),
      height: sy(PCB_BODY.height),
      transform: `translateZ(${GROUND_Z + 1}px)`,
      borderRadius: sx(PCB_BODY.radius) * 3,
      background:
        'radial-gradient(74% 74% at 50% 52%, rgba(0,0,0,0.62) 0%,' +
        ' rgba(0,0,0,0.42) 52%, rgba(0,0,0,0) 100%)',
    }}
  />
));
BoardShadow3D.displayName = 'BoardShadow3D';

/**
 * The four corner standoffs, below the board.
 *
 * Each is one quad standing on the surface at the barrel's front edge, with a
 * small contact shadow where it meets the ground. A quad rather than a
 * cylinder because a cylinder needs geometry CSS cannot express, and because
 * a horizontal three-stop gradient reads as a round barrel at this size — the
 * cheap trick is indistinguishable from the expensive one here.
 *
 * All four are drawn. The two at the far edge are behind the board and the
 * compositor hides them, which is the correct amount of work to do about it.
 */
export const Standoffs3D: React.FC = React.memo(() => (
  <>
    {STANDOFFS.map((s) => {
      const d = sx(s.diameter);
      const left = sx(s.cx) - d / 2;
      const top = sy(s.cy) - d / 2;
      return (
        <div
          key={s.id}
          data-standoff={s.id}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left,
            top,
            width: d,
            height: d,
            transform: `translateZ(${-PCB_THICKNESS}px)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/*
            The barrel, from the board's underside down to the surface.

            It hangs from the pad's CENTRE, not from the front of its
            footprint. Hung from the front edge the quad emerges from in front
            of the board rather than from under it, and at this camera that
            reads as a flag stuck to the board's edge instead of a foot
            holding it up. Slightly narrower than the pad for the same reason
            a real standoff is: the screw head is wider than the barrel.
          */}
          <div
            data-standoff-barrel={s.id}
            style={{
              position: 'absolute',
              left: d * 0.13,
              top: d * 0.5,
              width: d * 0.74,
              height: STANDOFF_DROP,
              transformOrigin: 'top center',
              transform: 'rotateX(-90deg)',
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 100%),' +
                ` linear-gradient(to right, ${STANDOFF_MATERIAL.barrelDark} 0%,` +
                ` ${STANDOFF_MATERIAL.barrelLight} 38%,` +
                ` ${STANDOFF_MATERIAL.barrelEdge} 100%)`,
            }}
          />
          {/* Where it meets the surface. */}
          <div
            data-standoff-contact={s.id}
            style={{
              position: 'absolute',
              left: -d * 0.3,
              top: -d * 0.3,
              width: d * 1.6,
              height: d * 1.6,
              transform: `translateZ(${-STANDOFF_DROP + 1}px)`,
              background:
                'radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
            }}
          />
        </div>
      );
    })}
  </>
));
Standoffs3D.displayName = 'Standoffs3D';
