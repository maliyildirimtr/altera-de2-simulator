import React from 'react';
import type { BoardComponent, BoardDetail } from '../../../board/de2Layout';
import {
  BOARD_MM,
  DE2_MOUNTING_HOLES,
  DE2_TRACE_HINTS,
  PCB_CORNER_RADIUS_MM,
  hasDetail,
} from '../../../board/de2Layout';
import { pinPositions } from '../boardGeometry';
import { ContactShadow, RefDes, SILK_FONT, SILK_MONO_FONT } from './Silkscreen';
import {
  CONNECTOR,
  GOLD,
  IC,
  JACK,
  JACK_DARK,
  LCD,
  METAL,
  PASSIVE,
  PCB,
} from '../boardPalette';

/* ────────────────────────────────────────────────────────────────────────
 * PCB substrate
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Regions where solder mask sits over a copper ground pour rather than bare
 * substrate. Purely a surface-finish cue — no component geometry lives here,
 * which is why these stay local to the renderer instead of going in the
 * canonical layout. Real boards read as a patchwork of these areas, and it is
 * most of what stops a PCB looking like a flat rectangle.
 */
const POUR_REGIONS: Array<[number, number, number, number]> = [
  [4, 112, 195, 38], // user-I/O strip
  [86, 24, 52, 36], // analog / video front end
  [108, 60, 38, 34], // FPGA quadrant
  [8, 62, 78, 38], // LCD area
  [150, 28, 48, 66], // GPIO / expansion
  [4, 16, 54, 34], // power section
];

export const PcbSurface2D: React.FC<{ detail: BoardDetail }> = React.memo(({ detail }) => (
  <g pointerEvents="none" aria-hidden="true">
    {/* Exposed FR-4 core, visible as a thin band around the solder mask */}
    <rect
      x={-0.55}
      y={-0.55}
      width={BOARD_MM.width + 1.1}
      height={BOARD_MM.height + 1.1}
      rx={PCB_CORNER_RADIUS_MM + 0.55}
      fill="url(#de2b-core)"
    />

    {/* Solder mask */}
    <rect
      x={0}
      y={0}
      width={BOARD_MM.width}
      height={BOARD_MM.height}
      rx={PCB_CORNER_RADIUS_MM}
      fill="url(#de2b-pcb)"
    />

    {/*
      Mask over copper pour. Held at a very low opacity on purpose: the
      boundary between mask-over-copper and mask-over-substrate is a subtle
      shift in finish on a real board, and anything stronger reads as a set of
      dark panels pasted onto the PCB rather than as the PCB's own surface.
    */}
    <g opacity={0.24}>
      {POUR_REGIONS.map(([px, py, pw, ph]) => (
        <rect key={`${px}-${py}`} x={px} y={py} width={pw} height={ph} rx={1.6} fill={PCB.pour} />
      ))}
    </g>
    {/* Pour mesh, clipped to the board by the rounded rect below it */}
    <rect
      x={0}
      y={0}
      width={BOARD_MM.width}
      height={BOARD_MM.height}
      rx={PCB_CORNER_RADIUS_MM}
      fill="url(#de2b-pour)"
      opacity={0.17}
    />

    {/* Routed trace hints */}
    {hasDetail(detail, 'normal') && (
      <g fill="none" stroke={PCB.trace} strokeLinecap="round" strokeLinejoin="round">
        {DE2_TRACE_HINTS.map((t) => (
          <path key={t.id} d={t.d} strokeWidth={t.width} opacity={t.opacity * 0.6} />
        ))}
      </g>
    )}

    {/* Printed boundary around the user-I/O strip */}
    <rect
      x={4}
      y={112}
      width={BOARD_MM.width - 8}
      height={38}
      rx={1.4}
      fill="none"
      stroke={PCB.courtyard}
      strokeWidth={0.2}
      opacity={0.28}
    />

    {/* Semi-gloss mask sheen, then a corner vignette */}
    <rect
      x={0}
      y={0}
      width={BOARD_MM.width}
      height={BOARD_MM.height}
      rx={PCB_CORNER_RADIUS_MM}
      fill="url(#de2b-pcb-sheen)"
    />
    <rect
      x={0}
      y={0}
      width={BOARD_MM.width}
      height={BOARD_MM.height}
      rx={PCB_CORNER_RADIUS_MM}
      fill="url(#de2b-pcb-vignette)"
    />

    {/* Board outline: a crisp dark keyline reads as a routed edge */}
    <rect
      x={0.2}
      y={0.2}
      width={BOARD_MM.width - 0.4}
      height={BOARD_MM.height - 0.4}
      rx={PCB_CORNER_RADIUS_MM}
      fill="none"
      stroke="#02060C"
      strokeWidth={0.4}
      opacity={0.75}
    />
    <rect
      x={0.55}
      y={0.55}
      width={BOARD_MM.width - 1.1}
      height={BOARD_MM.height - 1.1}
      rx={PCB_CORNER_RADIUS_MM}
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={0.18}
      opacity={0.07}
    />
  </g>
));
PcbSurface2D.displayName = 'PcbSurface2D';

export const MountingHoles2D: React.FC = React.memo(() => (
  <g pointerEvents="none" aria-hidden="true">
    {DE2_MOUNTING_HOLES.map((hole) => (
      <g key={hole.id}>
        {/* Annular gold ring */}
        <circle cx={hole.cx} cy={hole.cy} r={hole.padR} fill="url(#de2b-gold)" />
        <circle
          cx={hole.cx}
          cy={hole.cy}
          r={hole.padR}
          fill="none"
          stroke={GOLD.dark}
          strokeWidth={0.14}
          opacity={0.8}
        />
        {/* Drill, with the inner wall catching light at the bottom-right */}
        <circle cx={hole.cx} cy={hole.cy} r={hole.r} fill={PCB.hole} />
        <path
          d={`M ${hole.cx - hole.r} ${hole.cy} A ${hole.r} ${hole.r} 0 0 0 ${hole.cx + hole.r} ${hole.cy}`}
          fill="none"
          stroke={GOLD.light}
          strokeWidth={0.18}
          opacity={0.45}
        />
      </g>
    ))}
  </g>
));
MountingHoles2D.displayName = 'MountingHoles2D';


/* ────────────────────────────────────────────────────────────────────────
 * Package bodies
 *
 * Every body draws from the top-left light and carries a contact shadow, so
 * parts read as seated in the board rather than pasted onto it.
 * ──────────────────────────────────────────────────────────────────────── */

const IcBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const showPins = hasDetail(detail, 'normal') && c.width >= 5 && c.height >= 4;
  const pinLen = 0.58;
  const horizontal = pinPositions(
    c.x + 1,
    c.x + c.width - 1,
    Math.max(3, Math.round(c.width / 1.3)),
  );
  const vertical = pinPositions(
    c.y + 1,
    c.y + c.height - 1,
    Math.max(3, Math.round(c.height / 1.3)),
  );

  return (
    <g>
      <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.3} strength={0.3} />

      {showPins && (
        <g opacity={0.72}>
          {horizontal.map((px) => (
            <React.Fragment key={`h-${px}`}>
              <rect x={px - 0.2} y={c.y - pinLen} width={0.4} height={pinLen} fill={IC.pin} />
              <rect
                x={px - 0.2}
                y={c.y + c.height}
                width={0.4}
                height={pinLen}
                fill={IC.pinDark}
              />
            </React.Fragment>
          ))}
          {vertical.map((py) => (
            <React.Fragment key={`v-${py}`}>
              <rect x={c.x - pinLen} y={py - 0.2} width={pinLen} height={0.4} fill={IC.pin} />
              <rect
                x={c.x + c.width}
                y={py - 0.2}
                width={pinLen}
                height={0.4}
                fill={IC.pinDark}
              />
            </React.Fragment>
          ))}
        </g>
      )}

      {/* Glossy chamfer, then the matte moulded top inset within it */}
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.32}
        fill="url(#de2b-ic-bevel)"
      />
      <rect
        x={c.x + 0.22}
        y={c.y + 0.22}
        width={c.width - 0.44}
        height={c.height - 0.44}
        rx={0.22}
        fill="url(#de2b-ic)"
      />

      {/* Mould parting line down the package centre */}
      {hasDetail(detail, 'high') && c.height >= 5 && (
        <rect
          x={c.x + 0.5}
          y={c.y + c.height / 2 - 0.05}
          width={c.width - 1}
          height={0.1}
          fill={IC.seam}
          opacity={0.6}
        />
      )}

      {/* Pin-1 dimple */}
      {hasDetail(detail, 'normal') && c.width >= 6 && (
        <>
          <circle cx={c.x + 1.15} cy={c.y + 1.15} r={0.46} fill="#000000" opacity={0.45} />
          <circle cx={c.x + 1.1} cy={c.y + 1.1} r={0.38} fill={IC.pin1} opacity={0.7} />
        </>
      )}

      {/* Memory part names survive LOW: a board whose SDRAM, SRAM and flash
          are anonymous black rectangles has lost the identity that makes it
          readable as a teaching illustration. */}
      {c.type === 'memory' && c.label && c.width >= 12 && (
        <text
          x={c.x + c.width / 2}
          y={c.y + c.height / 2 + 0.72}
          fontSize={Math.min(2, c.width / 8.5)}
          fontFamily={SILK_MONO_FONT}
          fontWeight={500}
          textAnchor="middle"
          fill="#A8B2BF"
          opacity={0.85}
          style={{ userSelect: 'none' }}
        >
          {c.label}
        </text>
      )}
    </g>
  );
};

/**
 * Bright-metal connector shell (USB, SD shield). Drawn as a top face plus a
 * darker outward face with a recessed mouth, so it reads as a metal box rather
 * than a gradient sticker.
 */
const MetalShellBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const faceH = Math.min(3.4, c.height * 0.42);
  return (
    <g>
      <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.4} strength={0.34} />
      {/* Body */}
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.42}
        fill="url(#de2b-metal)"
        stroke={METAL.shadow}
        strokeWidth={0.16}
      />
      {/* Outward-facing end, in shadow */}
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={faceH}
        rx={0.4}
        fill="url(#de2b-metal-face)"
      />
      {/* Mouth */}
      <rect
        x={c.x + 0.85}
        y={c.y + 0.35}
        width={c.width - 1.7}
        height={faceH - 0.7}
        rx={0.18}
        fill={CONNECTOR.mouth}
      />
      {/* Plastic tongue inside the mouth */}
      {hasDetail(detail, 'normal') && (
        <rect
          x={c.x + 1.3}
          y={c.y + faceH * 0.42}
          width={c.width - 2.6}
          height={faceH * 0.3}
          rx={0.1}
          fill="#C9CDD3"
          opacity={0.55}
        />
      )}
      {/* Seam and specular band across the shell top */}
      <rect
        x={c.x + 0.5}
        y={c.y + faceH + 0.45}
        width={c.width - 1}
        height={0.14}
        fill="#FFFFFF"
        opacity={0.28}
      />
      <path
        d={`M ${c.x + 0.4} ${c.y + c.height - 0.5} L ${c.x + c.width * 0.42} ${c.y + faceH + 0.3} L ${c.x + c.width * 0.6} ${c.y + faceH + 0.3} L ${c.x + 0.4} ${c.y + c.height - 0.5} Z`}
        fill="#FFFFFF"
        opacity={0.12}
      />
    </g>
  );
};

/** D-subminiature shell (VGA DB15, RS-232 DB9), facing off the top edge. */
const DSubBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const mouthH = c.height * 0.44;
  const inner = `M ${c.x + 3.6} ${c.y + mouthH} L ${c.x + 5.2} ${c.y + 0.7} L ${c.x + c.width - 5.2} ${c.y + 0.7} L ${c.x + c.width - 3.6} ${c.y + mouthH} Z`;
  const pinRow = pinPositions(c.x + 6.4, c.x + c.width - 6.4, 8);
  return (
    <g>
      <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.5} strength={0.34} />
      {/* Black moulded insulator body */}
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.5}
        fill="url(#de2b-conn-plastic)"
        stroke="#05080C"
        strokeWidth={0.18}
      />
      {/* Nickel shell wrapping the opening */}
      <path
        d={`M ${c.x + 2.4} ${c.y + mouthH + 0.9} L ${c.x + 4.4} ${c.y + 0.2} L ${c.x + c.width - 4.4} ${c.y + 0.2} L ${c.x + c.width - 2.4} ${c.y + mouthH + 0.9} Z`}
        fill="url(#de2b-metal-dark)"
        stroke={METAL.shadow}
        strokeWidth={0.14}
      />
      <path d={inner} fill={CONNECTOR.mouth} />
      {hasDetail(detail, 'normal') && (
        <g fill={GOLD.base} opacity={0.8}>
          {pinRow.map((px) => (
            <circle key={px} cx={px} cy={c.y + 2.2} r={0.3} />
          ))}
          {pinRow.slice(0, 7).map((px) => (
            <circle key={`b-${px}`} cx={px + 0.95} cy={c.y + 3.7} r={0.3} />
          ))}
        </g>
      )}
      {/* Jack screws */}
      {[c.x + 1.75, c.x + c.width - 1.75].map((sx) => (
        <g key={sx}>
          <circle cx={sx} cy={c.y + c.height * 0.4} r={1.15} fill="url(#de2b-metal)" />
          <circle
            cx={sx}
            cy={c.y + c.height * 0.4}
            r={1.15}
            fill="none"
            stroke={METAL.shadow}
            strokeWidth={0.14}
          />
          <circle cx={sx} cy={c.y + c.height * 0.4} r={0.42} fill="#000000" opacity={0.35} />
        </g>
      ))}
    </g>
  );
};

/** RJ45 Ethernet jack: black plastic shell with a latch notch and gold contacts. */
const Rj45Body: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const mouthH = c.height * 0.52;
  return (
    <g>
      <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.5} strength={0.36} />
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.5}
        fill="url(#de2b-conn-plastic)"
        stroke="#04070A"
        strokeWidth={0.2}
      />
      {/* Opening with the RJ45 latch cut-out at the top */}
      <path
        d={`M ${c.x + 1.7} ${c.y + mouthH} L ${c.x + 1.7} ${c.y + 0.3}
            L ${c.x + c.width / 2 - 2.1} ${c.y + 0.3}
            L ${c.x + c.width / 2 - 2.1} ${c.y + mouthH * 0.4}
            L ${c.x + c.width / 2 + 2.1} ${c.y + mouthH * 0.4}
            L ${c.x + c.width / 2 + 2.1} ${c.y + 0.3}
            L ${c.x + c.width - 1.7} ${c.y + 0.3}
            L ${c.x + c.width - 1.7} ${c.y + mouthH} Z`}
        fill={CONNECTOR.mouth}
      />
      {/* Gold contacts on the roof of the opening */}
      {hasDetail(detail, 'normal') && (
        <g fill={GOLD.base} opacity={0.6}>
          {pinPositions(c.x + 3.2, c.x + c.width - 3.2, 8).map((px) => (
            <rect key={px} x={px - 0.16} y={c.y + mouthH - 1.5} width={0.32} height={1.2} />
          ))}
        </g>
      )}
      {/* Link / activity indicators moulded into the housing front */}
      <rect
        x={c.x + 2.2}
        y={c.y + c.height - 3.2}
        width={2}
        height={1.4}
        rx={0.22}
        fill={CONNECTOR.linkGreen}
      />
      <rect
        x={c.x + c.width - 4.2}
        y={c.y + c.height - 3.2}
        width={2}
        height={1.4}
        rx={0.22}
        fill={CONNECTOR.linkAmber}
      />
      <rect
        x={c.x + 0.6}
        y={c.y + mouthH + 0.55}
        width={c.width - 1.2}
        height={0.14}
        fill="#FFFFFF"
        opacity={0.1}
      />
    </g>
  );
};

/** 3.5 mm audio jack: a tall colour-coded housing with a black barrel. */
const JackBody: React.FC<{ c: BoardComponent }> = ({ c }) => {
  const cx = c.x + c.width / 2;
  const barrelCy = c.y + c.height * 0.42;
  const r = Math.min(c.width, c.height) * 0.3;
  const colour = JACK[c.body ?? ''] ?? METAL.mid;
  const dark = JACK_DARK[c.body ?? ''] ?? METAL.dark;
  return (
    <g>
      <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.5} strength={0.34} />
      {/* Housing, with a darker lower half so it reads as a raised block */}
      <rect x={c.x} y={c.y} width={c.width} height={c.height} rx={0.55} fill={dark} />
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height * 0.66}
        rx={0.55}
        fill={colour}
      />
      <rect
        x={c.x + 0.3}
        y={c.y + 0.25}
        width={c.width - 0.6}
        height={0.3}
        rx={0.15}
        fill="#FFFFFF"
        opacity={0.45}
      />
      {/* Barrel */}
      <circle cx={cx} cy={barrelCy} r={r + 0.34} fill={dark} />
      <circle cx={cx} cy={barrelCy} r={r} fill="#0C1014" />
      <circle cx={cx} cy={barrelCy} r={r * 0.4} fill="#04070A" />
      <path
        d={`M ${cx - r * 0.72} ${barrelCy - r * 0.5} A ${r} ${r} 0 0 1 ${cx + r * 0.18} ${barrelCy - r * 0.72}`}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={0.18}
        opacity={0.3}
      />
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.55}
        fill="none"
        stroke="#0A0D11"
        strokeWidth={0.14}
        opacity={0.6}
      />
    </g>
  );
};

/** Chrome RCA barrel (VIDEO IN) — nickel-plated, not a yellow moulding. */
const RcaBody: React.FC<{ c: BoardComponent }> = ({ c }) => {
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height * 0.44;
  const r = Math.min(c.width, c.height) * 0.36;
  return (
    <g>
      <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.5} strength={0.34} />
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.5}
        fill="url(#de2b-metal)"
        stroke={METAL.shadow}
        strokeWidth={0.16}
      />
      <circle cx={cx} cy={cy} r={r + 0.5} fill="url(#de2b-metal-face)" />
      <circle cx={cx} cy={cy} r={r} fill="#0A0E13" />
      <circle cx={cx} cy={cy} r={r * 0.34} fill={METAL.mid} />
      <path
        d={`M ${cx - r * 0.74} ${cy - r * 0.5} A ${r} ${r} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.74}`}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={0.2}
        opacity={0.38}
      />
    </g>
  );
};

/** 2.1 mm barrel power jack. */
const BarrelJackBody: React.FC<{ c: BoardComponent }> = ({ c }) => {
  const cy = c.y + c.height / 2;
  return (
    <g>
      <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.6} strength={0.36} />
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.6}
        fill="url(#de2b-conn-plastic)"
        stroke="#04070A"
        strokeWidth={0.18}
      />
      {/* Socket mouth on the outward (left) end */}
      <circle cx={c.x + 2.9} cy={cy} r={c.height * 0.36} fill="#05080C" />
      <circle
        cx={c.x + 2.9}
        cy={cy}
        r={c.height * 0.36}
        fill="none"
        stroke="#3A4048"
        strokeWidth={0.16}
      />
      <circle cx={c.x + 2.9} cy={cy} r={c.height * 0.12} fill={METAL.mid} />
      {/* Moulded strain-relief ribs */}
      <g fill="#000000" opacity={0.3}>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={c.x + 6 + i * 2} y={c.y + 1} width={0.55} height={c.height - 2} rx={0.2} />
        ))}
      </g>
    </g>
  );
};

/** 2 x 20 expansion header: gold pins in a black moulded shroud. */
const HeaderBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  // 2.54 mm pitch, derived from the footprint — JP1/JP2 are 2 x 20 while the
  // small JP3 programming header is 2 x 3, and both come through here.
  const PITCH = 2.54;
  const cols = Math.max(1, Math.round((c.width - 2.9) / PITCH) + 1);
  const rows = Math.max(1, Math.round((c.height - 3) / PITCH) + 1);
  const colX = pinPositions(c.x + 1.45, c.x + c.width - 1.45, cols);
  const rowY = pinPositions(c.y + 1.5, c.y + c.height - 1.5, rows);
  return (
    <g>
      <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.35} strength={0.34} />
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.35}
        fill="url(#de2b-conn-plastic)"
        stroke="#04070A"
        strokeWidth={0.18}
      />
      {/* Recessed pin field */}
      <rect
        x={c.x + 0.5}
        y={c.y + 0.5}
        width={c.width - 1}
        height={c.height - 1}
        rx={0.25}
        fill="#0A0D11"
      />
      {/*
        At LOW the individual pads are too small to resolve, but a featureless
        black slab reads as a missing part rather than a simplified one — so
        the field keeps a gold wash and the pads themselves drop out.
      */}
      {!hasDetail(detail, 'normal') && (
        <rect
          x={c.x + 0.9}
          y={c.y + 0.9}
          width={c.width - 1.8}
          height={c.height - 1.8}
          rx={0.2}
          fill="url(#de2b-gold)"
          opacity={0.3}
        />
      )}
      {hasDetail(detail, 'normal') && (
        <g>
          {rowY.map((py) =>
            colX.map((px) => (
              <g key={`${px}-${py}`}>
                <rect
                  x={px - 0.44}
                  y={py - 0.44}
                  width={0.88}
                  height={0.88}
                  rx={0.1}
                  fill="url(#de2b-gold)"
                />
                <rect
                  x={px - 0.44}
                  y={py + 0.18}
                  width={0.88}
                  height={0.26}
                  fill="#000000"
                  opacity={0.35}
                />
              </g>
            )),
          )}
        </g>
      )}
      {/* Shroud highlight */}
      <rect
        x={c.x + 0.2}
        y={c.y + 0.18}
        width={c.width - 0.4}
        height={0.2}
        rx={0.1}
        fill="#FFFFFF"
        opacity={0.14}
      />
    </g>
  );
};

/** Cyclone II BGA: heat-spreader lid, chamfered substrate, laser-etched text. */
const FpgaBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const cx = c.x + c.width / 2;
  return (
    <g>
      <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.6} strength={0.42} />

      {/*
        Package substrate, visible as a narrow border. Charcoal rather than
        the green of the first pass: a saturated frame made the FPGA read as
        a coloured accent, when it should be the board's focal point by
        refinement — crisp typography, a clean bevel, a restrained sheen.
      */}
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.5}
        fill={IC.substrate}
        stroke={IC.substrateEdge}
        strokeWidth={0.2}
      />
      {/* Moulded lid, inset from the substrate */}
      <rect
        x={c.x + 1.3}
        y={c.y + 1.3}
        width={c.width - 2.6}
        height={c.height - 2.6}
        rx={0.4}
        fill="url(#de2b-ic-bevel)"
      />
      <rect
        x={c.x + 1.65}
        y={c.y + 1.65}
        width={c.width - 3.3}
        height={c.height - 3.3}
        rx={0.3}
        fill="url(#de2b-ic)"
      />
      {/* Corner chamfer marking pin A1 */}
      <path
        d={`M ${c.x + 1.3} ${c.y + 4.4} L ${c.x + 4.4} ${c.y + 1.3} L ${c.x + 1.3} ${c.y + 1.3} Z`}
        fill={IC.pin1}
        opacity={0.75}
      />

      {/*
        The FPGA's identity survives every level of detail. At LOW the board
        still has to be recognisably a Cyclone II DE2 — stripping the part
        number is fine, stripping the vendor and family is not.
      */}
      <>
        <text
            x={cx}
            y={c.y + c.height * 0.44}
            fontSize={2.45}
            fontFamily={SILK_FONT}
            fontWeight={700}
            letterSpacing={0.4}
            textAnchor="middle"
            fill="#CBD3DE"
            opacity={0.9}
            style={{ userSelect: 'none' }}
          >
            ALTERA
          </text>
          <text
            x={cx}
            y={c.y + c.height * 0.6}
            fontSize={2.85}
            fontFamily={SILK_FONT}
            fontWeight={800}
            fontStyle="italic"
            textAnchor="middle"
            fill="#E8EDF4"
            style={{ userSelect: 'none' }}
          >
            Cyclone II
          </text>
      </>
      {hasDetail(detail, 'high') && (
        <text
          x={cx}
          y={c.y + c.height * 0.74}
          fontSize={1.8}
          fontFamily={SILK_MONO_FONT}
          fontWeight={500}
          textAnchor="middle"
          fill="#94A2B4"
          style={{ userSelect: 'none' }}
        >
          EP2C35F672C6
        </text>
      )}
      {/* Faint lid sheen, and the shared top-face shade so the package is
          lit by the same light as everything else on the board. */}
      <path
        d={`M ${c.x + 1.65} ${c.y + c.height - 1.65} L ${c.x + c.width * 0.5} ${c.y + 1.65} L ${c.x + c.width * 0.66} ${c.y + 1.65} L ${c.x + c.width * 0.3} ${c.y + c.height - 1.65} Z`}
        fill="#FFFFFF"
        opacity={0.035}
      />
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.5}
        fill="url(#de2b-shade-top)"
      />
    </g>
  );
};

/** 16 x 2 character LCD on its own teal carrier PCB. */
const LcdBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  // Thinner than the first pass: the module keeps its real 72 x 29 mm
  // footprint, but a slimmer bezel gives more of that area to the glass and
  // less to bright metal, which is what made it out-shout the FPGA.
  const bezelInset = 1.7;
  const gx = c.x + bezelInset;
  const gy = c.y + bezelInset + 1.5;
  const gw = c.width - bezelInset * 2;
  const gh = c.height - bezelInset * 2 - 1.5;

  return (
    <g>
      <ContactShadow
        x={c.x - 0.7}
        y={c.y - 0.7}
        width={c.width + 1.4}
        height={c.height + 1.4}
        rx={0.6}
        strength={0.3}
      />

      {/* Carrier PCB — reads as green against the navy, without shouting */}
      <rect
        x={c.x - 0.7}
        y={c.y - 0.7}
        width={c.width + 1.4}
        height={c.height + 1.4}
        rx={0.55}
        fill="url(#de2b-lcd-pcb)"
        stroke={LCD.pcbDark}
        strokeWidth={0.2}
      />
      {/* Soldered header along the module's top edge */}
      {hasDetail(detail, 'normal') && (
        <g>
          {pinPositions(c.x + 1.5, c.x + c.width - 1.5, 16).map((px) => (
            <rect
              key={px}
              x={px - 0.3}
              y={c.y - 0.5}
              width={0.6}
              height={1.1}
              rx={0.14}
              fill="url(#de2b-gold)"
              opacity={0.85}
            />
          ))}
        </g>
      )}

      {/* Metal bezel */}
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.45}
        fill="url(#de2b-lcd-bezel)"
        stroke="#090C10"
        strokeWidth={0.2}
      />
      <rect
        x={c.x + 0.35}
        y={c.y + 0.28}
        width={c.width - 0.7}
        height={0.18}
        rx={0.09}
        fill="#FFFFFF"
        opacity={0.13}
      />

      {/* STN glass, unlit */}
      <rect x={gx} y={gy} width={gw} height={gh} rx={0.28} fill="url(#de2b-lcd-glass)" />
      {/* A single soft reflection across the glass — the one thing that makes
          a flat panel read as covered by something transparent. */}
      <path
        d={`M ${gx} ${gy + gh * 0.62} L ${gx + gw * 0.46} ${gy} L ${gx + gw * 0.7} ${gy} L ${gx} ${gy + gh} Z`}
        fill="#FFFFFF"
        opacity={0.055}
      />
      {/* Inner bezel shadow around the glass */}
      <rect
        x={gx}
        y={gy}
        width={gw}
        height={gh}
        rx={0.28}
        fill="none"
        stroke="#0D1A08"
        strokeWidth={0.45}
        opacity={0.45}
      />

      {/*
        16 x 2 character cells. The DE2 LCD is NOT simulated, so the module is
        drawn unlit and the cells stay blank — never faked with sample text.
      */}
      {hasDetail(detail, 'normal') &&
        (() => {
          const padX = 3.4;
          const padY = 3.6;
          const cellW = (gw - padX * 2) / 16;
          const cellH = (gh - padY * 2) / 2;
          return (
            <g opacity={0.3}>
              {Array.from({ length: 2 }).map((_, row) =>
                Array.from({ length: 16 }).map((__, col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={gx + padX + col * cellW + cellW * 0.14}
                    y={gy + padY + row * cellH + cellH * 0.12}
                    width={cellW * 0.72}
                    height={cellH * 0.76}
                    rx={0.1}
                    fill={LCD.cell}
                  />
                )),
              )}
            </g>
          );
        })()}

      {/* Specular sweep across the glass */}
      <path
        d={`M ${gx} ${gy + gh} L ${gx + gw * 0.4} ${gy} L ${gx + gw * 0.58} ${gy} L ${gx + gw * 0.18} ${gy + gh} Z`}
        fill="#FFFFFF"
        opacity={0.1}
      />

      {/* Corner mount holes */}
      {[
        [c.x + 1.25, c.y + 1.25],
        [c.x + c.width - 1.25, c.y + 1.25],
        [c.x + 1.25, c.y + c.height - 1.25],
        [c.x + c.width - 1.25, c.y + c.height - 1.25],
      ].map(([hx, hy], i) => (
        <g key={i}>
          <circle cx={hx} cy={hy} r={0.68} fill="url(#de2b-gold)" opacity={0.8} />
          <circle cx={hx} cy={hy} r={0.34} fill="#06090D" />
        </g>
      ))}
    </g>
  );
};

/** Chip resistor / capacitor with metallised terminations. */
const PassiveBody: React.FC<{ c: BoardComponent }> = ({ c }) => {
  const vertical = c.height > c.width;
  return (
    <g>
      <rect
        x={c.x - 0.14}
        y={c.y + 0.1}
        width={c.width + 0.28}
        height={c.height + 0.22}
        rx={0.12}
        fill="#02060C"
        opacity={0.3}
      />
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.12}
        fill="url(#de2b-passive)"
      />
      {vertical ? (
        <>
          <rect x={c.x} y={c.y} width={c.width} height={c.height * 0.22} fill={PASSIVE.cap} opacity={0.8} />
          <rect
            x={c.x}
            y={c.y + c.height * 0.78}
            width={c.width}
            height={c.height * 0.22}
            fill={PASSIVE.cap}
            opacity={0.65}
          />
        </>
      ) : (
        <>
          <rect x={c.x} y={c.y} width={c.width * 0.22} height={c.height} fill={PASSIVE.cap} opacity={0.8} />
          <rect
            x={c.x + c.width * 0.78}
            y={c.y}
            width={c.width * 0.22}
            height={c.height}
            fill={PASSIVE.cap}
            opacity={0.65}
          />
        </>
      )}
    </g>
  );
};

/** Violet tantalum capacitor with its polarity stripe. */
const TantalumBody: React.FC<{ c: BoardComponent }> = ({ c }) => (
  <g>
    <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.5} strength={0.3} />
    <rect
      x={c.x}
      y={c.y}
      width={c.width}
      height={c.height}
      rx={0.55}
      fill="url(#de2b-tantalum)"
      stroke={PASSIVE.tantalumDark}
      strokeWidth={0.14}
    />
    {/* Polarity bar on the positive end */}
    <rect
      x={c.x + 0.35}
      y={c.y + 0.35}
      width={c.width - 0.7}
      height={0.6}
      rx={0.22}
      fill="#EDE6F8"
      opacity={0.72}
    />
    <ellipse
      cx={c.x + c.width * 0.36}
      cy={c.y + c.height * 0.4}
      rx={c.width * 0.22}
      ry={c.height * 0.16}
      fill="#FFFFFF"
      opacity={0.2}
    />
  </g>
);

/** Aluminium electrolytic can, seen from above. */
const CanBody: React.FC<{ c: BoardComponent }> = ({ c }) => {
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height / 2;
  const r = Math.min(c.width, c.height) / 2;
  return (
    <g>
      <circle cx={cx} cy={cy + 0.22} r={r} fill="#02060C" opacity={0.34} />
      <circle cx={cx} cy={cy} r={r} fill="url(#de2b-can)" stroke="#20242A" strokeWidth={0.16} />
      {/* Crimp ring and the moulded relief cross on the can top */}
      <circle cx={cx} cy={cy} r={r * 0.74} fill="none" stroke="#1C2026" strokeWidth={0.18} opacity={0.7} />
      <path
        d={`M ${cx - r * 0.5} ${cy} L ${cx + r * 0.5} ${cy} M ${cx} ${cy - r * 0.5} L ${cx} ${cy + r * 0.5}`}
        stroke="#14171B"
        strokeWidth={0.2}
        opacity={0.6}
      />
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.34} rx={r * 0.34} ry={r * 0.22} fill="#FFFFFF" opacity={0.18} />
    </g>
  );
};

/** Always-lit blue power-rail indicator. Not simulated — hard-wired. */
const IndicatorBody: React.FC<{ c: BoardComponent }> = ({ c }) => (
  <g>
    <ellipse
      cx={c.x + c.width / 2}
      cy={c.y + c.height / 2}
      rx={c.width * 2.1}
      ry={c.height * 2.1}
      fill="url(#de2b-ledb-halo)"
    />
    <rect
      x={c.x - 0.2}
      y={c.y - 0.2}
      width={c.width + 0.4}
      height={c.height + 0.4}
      rx={0.2}
      fill="url(#de2b-led-rim)"
    />
    <rect
      x={c.x}
      y={c.y}
      width={c.width}
      height={c.height}
      rx={0.16}
      fill="url(#de2b-ledb-on)"
    />
    <rect
      x={c.x + 0.28}
      y={c.y + 0.22}
      width={c.width - 0.56}
      height={c.height * 0.28}
      rx={0.1}
      fill="#FFFFFF"
      opacity={0.5}
    />
  </g>
);

/** Metal-can oscillator. */
const OscillatorBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => (
  <g>
    <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.5} strength={0.3} />
    <rect
      x={c.x}
      y={c.y}
      width={c.width}
      height={c.height}
      rx={0.75}
      fill="url(#de2b-metal-dark)"
      stroke={METAL.shadow}
      strokeWidth={0.14}
    />
    <rect
      x={c.x + 0.4}
      y={c.y + 0.3}
      width={c.width - 0.8}
      height={0.26}
      rx={0.13}
      fill="#FFFFFF"
      opacity={0.32}
    />
    {c.label && hasDetail(detail, 'high') && (
      <text
        x={c.x + c.width / 2}
        y={c.y + c.height / 2 + 0.62}
        fontSize={1.5}
        fontFamily={SILK_MONO_FONT}
        fontWeight={600}
        textAnchor="middle"
        fill="#1C2026"
        style={{ userSelect: 'none' }}
      >
        {c.label}
      </text>
    )}
  </g>
);

const SdCardBody: React.FC<{ c: BoardComponent }> = ({ c }) => (
  <g>
    <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.5} strength={0.34} />
    <rect
      x={c.x}
      y={c.y}
      width={c.width}
      height={c.height}
      rx={0.5}
      fill="url(#de2b-metal)"
      stroke={METAL.shadow}
      strokeWidth={0.18}
    />
    {/* Card slot on the outward (right) edge */}
    <rect
      x={c.x + c.width - 2.8}
      y={c.y + 1.7}
      width={2.8}
      height={c.height - 3.4}
      rx={0.3}
      fill={CONNECTOR.mouth}
    />
    {/* Shield stamping lines */}
    <rect
      x={c.x + 1.6}
      y={c.y + 1.6}
      width={c.width - 5.2}
      height={c.height - 3.2}
      rx={0.35}
      fill="none"
      stroke={METAL.dark}
      strokeWidth={0.18}
      opacity={0.75}
    />
    <path
      d={`M ${c.x + 0.6} ${c.y + c.height - 0.8} L ${c.x + c.width * 0.36} ${c.y + 0.8} L ${c.x + c.width * 0.5} ${c.y + 0.8} L ${c.x + 0.6} ${c.y + c.height - 0.8} Z`}
      fill="#FFFFFF"
      opacity={0.14}
    />
  </g>
);

const RoundBody: React.FC<{ c: BoardComponent; fill: string; ring?: string }> = ({
  c,
  fill,
  ring,
}) => {
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height / 2;
  const r = Math.min(c.width, c.height) / 2;
  return (
    <g>
      <circle cx={cx} cy={cy + 0.25} r={r} fill="#02060C" opacity={0.36} />
      {ring && <circle cx={cx} cy={cy} r={r} fill={ring} />}
      <circle
        cx={cx}
        cy={cy}
        r={ring ? r * 0.8 : r}
        fill={fill}
        stroke="#0A0D12"
        strokeWidth={0.16}
      />
      <ellipse
        cx={cx - r * 0.26}
        cy={cy - r * 0.32}
        rx={r * 0.36}
        ry={r * 0.24}
        fill="#FFFFFF"
        opacity={0.3}
      />
    </g>
  );
};

/** The RUN / PROG mode slide switch on the left edge. */
const SlideSwitchBody: React.FC<{ c: BoardComponent }> = ({ c }) => (
  <g>
    <ContactShadow x={c.x} y={c.y} width={c.width} height={c.height} rx={0.4} strength={0.3} />
    <rect
      x={c.x}
      y={c.y}
      width={c.width}
      height={c.height}
      rx={0.4}
      fill="url(#de2b-sw-body)"
      stroke="#8E8A7F"
      strokeWidth={0.14}
    />
    <rect
      x={c.x + 0.5}
      y={c.y + 0.7}
      width={c.width - 1}
      height={c.height - 1.4}
      rx={0.22}
      fill="#8E8A7F"
    />
    <rect
      x={c.x + 0.42}
      y={c.y + 0.7}
      width={c.width - 0.84}
      height={(c.height - 1.4) * 0.46}
      rx={0.2}
      fill="url(#de2b-lever)"
    />
  </g>
);

/* ────────────────────────────────────────────────────────────────────────
 * Dispatch
 * ──────────────────────────────────────────────────────────────────────── */

export const StaticPart2D: React.FC<{ c: BoardComponent; detail: BoardDetail }> = React.memo(
  ({ c, detail }) => {
    let body: React.ReactNode;

    if (c.type === 'fpga') body = <FpgaBody c={c} detail={detail} />;
    else if (c.type === 'lcd') body = <LcdBody c={c} detail={detail} />;
    else if (c.type === 'header') body = <HeaderBody c={c} detail={detail} />;
    else if (c.type === 'oscillator') body = <OscillatorBody c={c} detail={detail} />;
    else if (c.id === 'conn-sd-card') body = <SdCardBody c={c} />;
    else if (c.id === 'ctl-run-prog') body = <SlideSwitchBody c={c} />;
    else if (c.body === 'barrel') body = <BarrelJackBody c={c} />;
    else if (c.body === 'rca') body = <RcaBody c={c} />;
    else if (c.body === 'tantalum') body = <TantalumBody c={c} />;
    else if (c.body === 'can') body = <CanBody c={c} />;
    else if (c.body === 'indicator-blue') body = <IndicatorBody c={c} />;
    else if (c.body === 'button-red') body = <RoundBody c={c} fill="url(#de2b-button-red)" ring="#15181D" />;
    else if (c.body === 'gold') body = <RoundBody c={c} fill="url(#de2b-gold)" ring="#15181D" />;
    else if (c.body && c.body.startsWith('jack-')) body = <JackBody c={c} />;
    else if (c.id === 'conn-ethernet') body = <Rj45Body c={c} detail={detail} />;
    else if (c.body === 'metal-dark') body = <DSubBody c={c} detail={detail} />;
    else if (c.body === 'metal') body = <MetalShellBody c={c} detail={detail} />;
    else if (c.type === 'passive') body = <PassiveBody c={c} />;
    else body = <IcBody c={c} detail={detail} />;

    return (
      <g data-part={c.id} pointerEvents="none">
        {body}
        {c.refDes && c.width >= 4 && c.y >= 3 && (
          <RefDes x={c.x + c.width / 2} y={c.y - 0.65} text={c.refDes} detail={detail} />
        )}
      </g>
    );
  },
);
StaticPart2D.displayName = 'StaticPart2D';

export const StaticParts2D: React.FC<{ components: BoardComponent[]; detail: BoardDetail }> =
  React.memo(({ components, detail }) => (
    <g aria-hidden="true">
      {components.map((c) => (
        <StaticPart2D key={c.id} c={c} detail={detail} />
      ))}
    </g>
  ));
StaticParts2D.displayName = 'StaticParts2D';

