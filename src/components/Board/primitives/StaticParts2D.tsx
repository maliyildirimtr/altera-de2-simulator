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
import { RefDes, SILK_FONT, SILK_MONO_FONT } from './Silkscreen';
import { GOLD, IC, JACK, PCB, SILK, METAL } from '../boardPalette';

/* ────────────────────────────────────────────────────────────────────────
 * PCB substrate
 * ──────────────────────────────────────────────────────────────────────── */

export const PcbSurface2D: React.FC<{ detail: BoardDetail }> = React.memo(({ detail }) => (
  <g pointerEvents="none" aria-hidden="true">
    {/* Exposed FR-4 core visible as a thin band around the solder mask */}
    <rect
      x={-0.5}
      y={-0.5}
      width={BOARD_MM.width + 1}
      height={BOARD_MM.height + 1}
      rx={PCB_CORNER_RADIUS_MM + 0.5}
      fill="url(#de2b-core)"
      opacity={0.75}
    />
    <rect
      x={0}
      y={0}
      width={BOARD_MM.width}
      height={BOARD_MM.height}
      rx={PCB_CORNER_RADIUS_MM}
      fill="url(#de2b-pcb)"
    />
    {/* Ground pour mesh */}
    <rect
      x={0}
      y={0}
      width={BOARD_MM.width}
      height={BOARD_MM.height}
      rx={PCB_CORNER_RADIUS_MM}
      fill="url(#de2b-pour)"
      opacity={0.5}
    />

    {/* Routed trace hints */}
    {hasDetail(detail, 'normal') && (
      <g fill="none" stroke={PCB.trace} strokeLinecap="round" strokeLinejoin="round">
        {DE2_TRACE_HINTS.map((t) => (
          <path key={t.id} d={t.d} strokeWidth={t.width} opacity={t.opacity * 0.55} />
        ))}
      </g>
    )}

    {/* Copper pour boundary around the user-I/O strip */}
    <rect
      x={4}
      y={113}
      width={BOARD_MM.width - 8}
      height={37}
      rx={1.2}
      fill="none"
      stroke={PCB.pour}
      strokeWidth={0.25}
      opacity={0.45}
    />

    <rect
      x={0}
      y={0}
      width={BOARD_MM.width}
      height={BOARD_MM.height}
      rx={PCB_CORNER_RADIUS_MM}
      fill="url(#de2b-pcb-vignette)"
    />
    <rect
      x={0}
      y={0}
      width={BOARD_MM.width}
      height={BOARD_MM.height}
      rx={PCB_CORNER_RADIUS_MM}
      fill="url(#de2b-pcb-sheen)"
    />
    <rect
      x={0.15}
      y={0.15}
      width={BOARD_MM.width - 0.3}
      height={BOARD_MM.height - 0.3}
      rx={PCB_CORNER_RADIUS_MM}
      fill="none"
      stroke="#03070E"
      strokeWidth={0.3}
      opacity={0.8}
    />
  </g>
));
PcbSurface2D.displayName = 'PcbSurface2D';

export const MountingHoles2D: React.FC = React.memo(() => (
  <g pointerEvents="none" aria-hidden="true">
    {DE2_MOUNTING_HOLES.map((hole) => (
      <g key={hole.id}>
        <circle cx={hole.cx} cy={hole.cy} r={hole.padR} fill="url(#de2b-gold)" opacity={0.92} />
        <circle cx={hole.cx} cy={hole.cy} r={hole.r} fill={PCB.hole} />
        <circle
          cx={hole.cx}
          cy={hole.cy}
          r={hole.r}
          fill="none"
          stroke="#000000"
          strokeWidth={0.2}
          opacity={0.6}
        />
      </g>
    ))}
  </g>
));
MountingHoles2D.displayName = 'MountingHoles2D';

/* ────────────────────────────────────────────────────────────────────────
 * Package bodies
 * ──────────────────────────────────────────────────────────────────────── */

const IcBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const showPins = hasDetail(detail, 'normal') && c.width >= 5 && c.height >= 4;
  const pinLen = 0.55;
  const horizontal = pinPositions(c.x + 1, c.x + c.width - 1, Math.max(3, Math.round(c.width / 1.3)));
  const vertical = pinPositions(c.y + 1, c.y + c.height - 1, Math.max(3, Math.round(c.height / 1.3)));

  return (
    <g>
      {showPins && (
        <g fill={IC.pin} opacity={0.62}>
          {horizontal.map((px) => (
            <React.Fragment key={`h-${px}`}>
              <rect x={px - 0.18} y={c.y - pinLen} width={0.36} height={pinLen} />
              <rect x={px - 0.18} y={c.y + c.height} width={0.36} height={pinLen} />
            </React.Fragment>
          ))}
          {vertical.map((py) => (
            <React.Fragment key={`v-${py}`}>
              <rect x={c.x - pinLen} y={py - 0.18} width={pinLen} height={0.36} />
              <rect x={c.x + c.width} y={py - 0.18} width={pinLen} height={0.36} />
            </React.Fragment>
          ))}
        </g>
      )}
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.3}
        fill="url(#de2b-ic)"
        stroke="#050709"
        strokeWidth={0.15}
      />
      {hasDetail(detail, 'normal') && c.width >= 6 && (
        <circle cx={c.x + 1.1} cy={c.y + 1.1} r={0.45} fill={IC.pin1} opacity={0.75} />
      )}
      {c.type === 'memory' && c.label && c.width >= 12 && hasDetail(detail, 'normal') && (
        <text
          x={c.x + c.width / 2}
          y={c.y + c.height / 2 + 0.7}
          fontSize={Math.min(2.1, c.width / 8)}
          fontFamily={SILK_MONO_FONT}
          fontWeight={600}
          textAnchor="middle"
          fill="#9AA6B4"
          opacity={0.85}
          style={{ userSelect: 'none' }}
        >
          {c.label}
        </text>
      )}
    </g>
  );
};

const ConnectorShellBody: React.FC<{ c: BoardComponent; dark?: boolean }> = ({ c, dark }) => {
  // Top-edge connectors face outward (up); left/right-edge ones face sideways.
  const facesUp = c.y < 20;
  const mouthDepth = Math.min(3.2, (facesUp ? c.height : c.width) * 0.45);
  return (
    <g>
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.4}
        fill={dark ? 'url(#de2b-metal-dark)' : 'url(#de2b-metal)'}
        stroke="#2A2F36"
        strokeWidth={0.18}
      />
      {/* Outward-facing mouth */}
      <rect
        x={facesUp ? c.x + 0.8 : c.x}
        y={facesUp ? c.y : c.y + 0.8}
        width={facesUp ? c.width - 1.6 : mouthDepth}
        height={facesUp ? mouthDepth : c.height - 1.6}
        rx={0.2}
        fill="#0B0E13"
        opacity={0.88}
      />
      <rect
        x={c.x + 0.4}
        y={c.y + c.height * 0.55}
        width={c.width - 0.8}
        height={0.3}
        fill="#FFFFFF"
        opacity={0.16}
      />
    </g>
  );
};

/** D-subminiature shell (VGA DB15, RS-232 DB9), facing off the top edge. */
const DSubBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const mouthH = c.height * 0.46;
  const inner = `M ${c.x + 3.4} ${c.y + mouthH} L ${c.x + 5} ${c.y + 0.6} L ${c.x + c.width - 5} ${c.y + 0.6} L ${c.x + c.width - 3.4} ${c.y + mouthH} Z`;
  const pinRow = pinPositions(c.x + 6.2, c.x + c.width - 6.2, 8);
  return (
    <g>
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.5}
        fill="url(#de2b-metal-dark)"
        stroke="#2A2F36"
        strokeWidth={0.18}
      />
      <path d={inner} fill="#0B0E13" />
      {hasDetail(detail, 'normal') && (
        <g fill={GOLD.base} opacity={0.75}>
          {pinRow.map((px) => (
            <circle key={px} cx={px} cy={c.y + 2.1} r={0.28} />
          ))}
          {pinRow.slice(0, 7).map((px) => (
            <circle key={`b-${px}`} cx={px + 0.9} cy={c.y + 3.6} r={0.28} />
          ))}
        </g>
      )}
      {/* Jack screws either side of the shell */}
      {[c.x + 1.7, c.x + c.width - 1.7].map((sx) => (
        <circle key={sx} cx={sx} cy={c.y + c.height * 0.42} r={1.1} fill="url(#de2b-metal)" stroke="#31363E" strokeWidth={0.14} />
      ))}
      <rect
        x={c.x + 1}
        y={c.y + c.height - 2}
        width={c.width - 2}
        height={0.35}
        fill="#FFFFFF"
        opacity={0.14}
      />
    </g>
  );
};

/** RJ45 Ethernet jack: black plastic shell with a latch notch and link LEDs. */
const Rj45Body: React.FC<{ c: BoardComponent }> = ({ c }) => {
  const mouthH = c.height * 0.5;
  return (
    <g>
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.5}
        fill="#15181D"
        stroke="#04060A"
        strokeWidth={0.2}
      />
      <rect x={c.x + 1.6} y={c.y} width={c.width - 3.2} height={mouthH} rx={0.25} fill="#080A0E" />
      {/* Latch notch */}
      <rect
        x={c.x + c.width / 2 - 2}
        y={c.y}
        width={4}
        height={mouthH * 0.45}
        rx={0.2}
        fill="#1E2228"
      />
      <rect
        x={c.x + 2.4}
        y={c.y + mouthH - 1.1}
        width={c.width - 4.8}
        height={0.7}
        fill={GOLD.base}
        opacity={0.5}
      />
      {/* Link / activity indicators */}
      <rect x={c.x + 2.4} y={c.y + c.height - 3.1} width={1.8} height={1.3} rx={0.2} fill="#2E6B3A" />
      <rect x={c.x + c.width - 4.2} y={c.y + c.height - 3.1} width={1.8} height={1.3} rx={0.2} fill="#6B3A2E" />
    </g>
  );
};

const JackBody: React.FC<{ c: BoardComponent }> = ({ c }) => {
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height / 2;
  const r = Math.min(c.width, c.height) / 2;
  const colour = JACK[c.body ?? ''] ?? METAL.mid;
  return (
    <g>
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.5}
        fill={colour}
        stroke="#1A1D22"
        strokeWidth={0.16}
      />
      <circle cx={cx} cy={cy} r={r * 0.72} fill="#11151B" />
      <circle cx={cx} cy={cy} r={r * 0.34} fill="#04060A" />
      <path
        d={`M ${cx - r * 0.7} ${cy - r * 0.55} A ${r * 0.72} ${r * 0.72} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.68}`}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={0.18}
        opacity={0.28}
      />
    </g>
  );
};

const BarrelJackBody: React.FC<{ c: BoardComponent }> = ({ c }) => {
  const cy = c.y + c.height / 2;
  return (
    <g>
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.6}
        fill="#15181D"
        stroke="#05070A"
        strokeWidth={0.18}
      />
      <circle cx={c.x + 2.6} cy={cy} r={c.height * 0.33} fill="#07090D" />
      <circle cx={c.x + 2.6} cy={cy} r={c.height * 0.12} fill={METAL.mid} />
      <rect x={c.x + 5} y={c.y + 1} width={c.width - 6} height={c.height - 2} rx={0.3} fill="#1E2229" />
    </g>
  );
};

const HeaderBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const rows = 2;
  const perRow = 20;
  const colX = pinPositions(c.x + 1.4, c.x + c.width - 1.4, rows);
  const rowY = pinPositions(c.y + 1.4, c.y + c.height - 1.4, perRow);
  return (
    <g>
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.35}
        fill="#101318"
        stroke="#04060A"
        strokeWidth={0.18}
      />
      {hasDetail(detail, 'normal') && (
        <g>
          {rowY.map((py) =>
            colX.map((px) => (
              <rect
                key={`${px}-${py}`}
                x={px - 0.42}
                y={py - 0.42}
                width={0.84}
                height={0.84}
                rx={0.1}
                fill="url(#de2b-gold)"
                opacity={0.85}
              />
            )),
          )}
        </g>
      )}
      <rect
        x={c.x + 0.25}
        y={c.y + 0.25}
        width={c.width - 0.5}
        height={c.height - 0.5}
        rx={0.25}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={0.12}
        opacity={0.1}
      />
    </g>
  );
};

const FpgaBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const cx = c.x + c.width / 2;
  return (
    <g>
      <rect
        x={c.x - 0.5}
        y={c.y - 0.5}
        width={c.width + 1}
        height={c.height + 1}
        rx={0.5}
        fill="#0A0C0F"
        opacity={0.8}
      />
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.6}
        fill="url(#de2b-ic)"
        stroke="#04060A"
        strokeWidth={0.22}
      />
      {/* Heat-spreader lid inset */}
      <rect
        x={c.x + 1.4}
        y={c.y + 1.4}
        width={c.width - 2.8}
        height={c.height - 2.8}
        rx={0.4}
        fill="#2A2E35"
        opacity={0.5}
      />
      {/* Pin-1 chamfer */}
      <path
        d={`M ${c.x} ${c.y + 3.2} L ${c.x + 3.2} ${c.y} L ${c.x} ${c.y} Z`}
        fill={IC.pin1}
        opacity={0.8}
      />
      {hasDetail(detail, 'normal') && (
        <>
          <text
            x={cx}
            y={c.y + c.height * 0.42}
            fontSize={2.5}
            fontFamily={SILK_FONT}
            fontWeight={700}
            letterSpacing={0.35}
            textAnchor="middle"
            fill="#C3CBD6"
            opacity={0.92}
            style={{ userSelect: 'none' }}
          >
            ALTERA
          </text>
          <text
            x={cx}
            y={c.y + c.height * 0.58}
            fontSize={2.9}
            fontFamily={SILK_FONT}
            fontWeight={800}
            fontStyle="italic"
            textAnchor="middle"
            fill="#E4EAF2"
            style={{ userSelect: 'none' }}
          >
            Cyclone II
          </text>
        </>
      )}
      {hasDetail(detail, 'high') && (
        <text
          x={cx}
          y={c.y + c.height * 0.73}
          fontSize={1.85}
          fontFamily={SILK_MONO_FONT}
          fontWeight={500}
          textAnchor="middle"
          fill="#93A2B4"
          style={{ userSelect: 'none' }}
        >
          EP2C35F672C6
        </text>
      )}
    </g>
  );
};

const LcdBody: React.FC<{ c: BoardComponent; detail: BoardDetail }> = ({ c, detail }) => {
  const bezelInset = 2.6;
  const gx = c.x + bezelInset;
  const gy = c.y + bezelInset + 1.4;
  const gw = c.width - bezelInset * 2;
  const gh = c.height - bezelInset * 2 - 1.4;

  return (
    <g>
      {/* Module PCB */}
      <rect
        x={c.x - 0.8}
        y={c.y - 0.8}
        width={c.width + 1.6}
        height={c.height + 1.6}
        rx={0.5}
        fill="#123A22"
        stroke="#08210F"
        strokeWidth={0.2}
      />
      {/* Bezel */}
      <rect
        x={c.x}
        y={c.y}
        width={c.width}
        height={c.height}
        rx={0.5}
        fill="url(#de2b-lcd-bezel)"
        stroke="#0B0D11"
        strokeWidth={0.2}
      />
      {/* Glass */}
      <rect x={gx} y={gy} width={gw} height={gh} rx={0.3} fill="url(#de2b-lcd-glass)" />
      <rect
        x={gx}
        y={gy}
        width={gw}
        height={gh}
        rx={0.3}
        fill="none"
        stroke="#0A1A05"
        strokeWidth={0.35}
        opacity={0.55}
      />
      {/*
        16 x 2 character cells. The DE2 LCD is NOT simulated, so the module is
        drawn unlit and the cells stay blank — never faked with sample text.
      */}
      {hasDetail(detail, 'normal') && (() => {
        const padX = 3.2;
        const padY = 3.4;
        const cellW = (gw - padX * 2) / 16;
        const cellH = (gh - padY * 2) / 2;
        return (
          <g opacity={0.2}>
            {Array.from({ length: 2 }).map((_, row) =>
              Array.from({ length: 16 }).map((__, col) => (
                <rect
                  key={`${row}-${col}`}
                  x={gx + padX + col * cellW + cellW * 0.12}
                  y={gy + padY + row * cellH + cellH * 0.1}
                  width={cellW * 0.76}
                  height={cellH * 0.8}
                  rx={0.1}
                  fill="#24370E"
                />
              )),
            )}
          </g>
        );
      })()}
      {/* Specular sweep across the glass */}
      <path
        d={`M ${gx} ${gy + gh} L ${gx + gw * 0.42} ${gy} L ${gx + gw * 0.62} ${gy} L ${gx + gw * 0.2} ${gy + gh} Z`}
        fill="#FFFFFF"
        opacity={0.07}
      />
      {/* Corner mount holes */}
      {[
        [c.x + 1.3, c.y + 1.3],
        [c.x + c.width - 1.3, c.y + 1.3],
        [c.x + 1.3, c.y + c.height - 1.3],
        [c.x + c.width - 1.3, c.y + c.height - 1.3],
      ].map(([hx, hy], i) => (
        <circle key={i} cx={hx} cy={hy} r={0.55} fill="#07090D" stroke={METAL.dark} strokeWidth={0.12} />
      ))}
    </g>
  );
};

const PassiveBody: React.FC<{ c: BoardComponent }> = ({ c }) => (
  <g>
    <rect x={c.x} y={c.y} width={c.width} height={c.height} rx={0.12} fill="#1B1E24" />
    <rect x={c.x} y={c.y} width={c.width * 0.22} height={c.height} fill={METAL.mid} opacity={0.75} />
    <rect
      x={c.x + c.width * 0.78}
      y={c.y}
      width={c.width * 0.22}
      height={c.height}
      fill={METAL.mid}
      opacity={0.75}
    />
  </g>
);

const SdCardBody: React.FC<{ c: BoardComponent }> = ({ c }) => (
  <g>
    <rect
      x={c.x}
      y={c.y}
      width={c.width}
      height={c.height}
      rx={0.5}
      fill="url(#de2b-metal)"
      stroke="#3A3F47"
      strokeWidth={0.2}
    />
    <rect
      x={c.x + c.width - 2.6}
      y={c.y + 1.6}
      width={2.6}
      height={c.height - 3.2}
      rx={0.3}
      fill="#0B0E13"
      opacity={0.9}
    />
    <rect
      x={c.x + 1.5}
      y={c.y + 1.5}
      width={c.width - 5}
      height={c.height - 3}
      rx={0.3}
      fill="none"
      stroke="#6D757F"
      strokeWidth={0.18}
      opacity={0.8}
    />
  </g>
);

const RoundBody: React.FC<{ c: BoardComponent; fill: string; ring?: string }> = ({ c, fill, ring }) => {
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height / 2;
  const r = Math.min(c.width, c.height) / 2;
  return (
    <g>
      {ring && <circle cx={cx} cy={cy} r={r} fill={ring} />}
      <circle cx={cx} cy={cy} r={ring ? r * 0.78 : r} fill={fill} stroke="#0A0D12" strokeWidth={0.16} />
      <ellipse cx={cx - r * 0.24} cy={cy - r * 0.3} rx={r * 0.38} ry={r * 0.24} fill="#FFFFFF" opacity={0.28} />
    </g>
  );
};

const SlideSwitchBody: React.FC<{ c: BoardComponent }> = ({ c }) => (
  <g>
    <rect
      x={c.x}
      y={c.y}
      width={c.width}
      height={c.height}
      rx={0.35}
      fill="#15181D"
      stroke="#05070A"
      strokeWidth={0.16}
    />
    <rect
      x={c.x + 0.5}
      y={c.y + 0.6}
      width={c.width - 1}
      height={c.height * 0.4}
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
    else if (c.id === 'conn-sd-card') body = <SdCardBody c={c} />;
    else if (c.body === 'barrel') body = <BarrelJackBody c={c} />;
    else if (c.body === 'button-red') body = <RoundBody c={c} fill="url(#de2b-button-red)" ring="#15181D" />;
    else if (c.body === 'gold') body = <RoundBody c={c} fill="url(#de2b-gold)" ring="#15181D" />;
    else if (c.body && c.body.startsWith('jack-')) body = <JackBody c={c} />;
    else if (c.id === 'conn-ethernet') body = <Rj45Body c={c} />;
    else if (c.body === 'metal-dark') body = <DSubBody c={c} detail={detail} />;
    else if (c.body === 'metal') body = <ConnectorShellBody c={c} />;
    else if (c.id === 'ctl-run-prog') body = <SlideSwitchBody c={c} />;
    else if (c.type === 'passive') body = <PassiveBody c={c} />;
    else body = <IcBody c={c} detail={detail} />;

    return (
      <g data-part={c.id} pointerEvents="none">
        {body}
        {c.refDes && c.width >= 4 && c.y >= 3 && (
          <RefDes x={c.x + c.width / 2} y={c.y - 0.6} text={c.refDes} detail={detail} />
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

/** Bank heading silkscreen, e.g. `SW[17..0]`. */
export const BankHeading2D: React.FC<{
  x: number;
  y: number;
  text: string;
  detail: BoardDetail;
}> = React.memo(({ x, y, text, detail }) => {
  if (!hasDetail(detail, 'normal')) return null;
  return (
    <text
      x={x}
      y={y}
      fontSize={2.1}
      fontFamily={SILK_MONO_FONT}
      fontWeight={600}
      textAnchor="middle"
      fill={SILK.white}
      opacity={0.65}
      style={{ userSelect: 'none' }}
    >
      {text}
    </text>
  );
});
BankHeading2D.displayName = 'BankHeading2D';
