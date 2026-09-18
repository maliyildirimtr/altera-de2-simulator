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
  BOTTOM_SILK,
  userIoCentreX,
  ledGreenCentreX,
} from '../../board/de2Layout';
import type { BoardDetail } from '../../board/de2Layout';
import { BoardDefs } from './BoardDefs';
import { SilkscreenLayer } from './primitives/Silkscreen';
import {
  BankHeading2D,
  MountingHoles2D,
  PcbSurface2D,
  StaticParts2D,
} from './primitives/StaticParts2D';
import { Switch2D } from './primitives/Switch2D';
import { Key2D } from './primitives/Key2D';
import { Led2D } from './primitives/Led2D';
import { SevenSegment2D } from './primitives/SevenSegment2D';

interface DE2Board2DProps {
  detail: BoardDetail;
}

/**
 * Flat 2D technical illustration of the original Terasic / Altera DE2.
 *
 * Every coordinate comes from `de2Layout.ts`; this component places, it does
 * not measure. Live state is read per-component through the granular board
 * selectors, so a single LED change does not re-render the board.
 */
export const DE2Board2D: React.FC<DE2Board2DProps> = React.memo(({ detail }) => (
  <svg
    data-board-view="2d"
    className="de2-board-svg"
    viewBox={`0 0 ${BOARD_MM.width} ${BOARD_MM.height}`}
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    role="group"
    aria-label="Altera DE2 development board, top view"
    shapeRendering="geometricPrecision"
  >
    <BoardDefs />

    <PcbSurface2D detail={detail} />
    <StaticParts2D components={DE2_STATIC_COMPONENTS} detail={detail} />
    <MountingHoles2D />

    <SilkscreenLayer items={DE2_SILKSCREEN} detail={detail} />
    <SilkscreenLayer items={DE2_CONNECTOR_LABELS} detail={detail} />

    {/* Bank headings */}
    <BankHeading2D
      x={(userIoCentreX(17) + userIoCentreX(0)) / 2}
      y={BOTTOM_SILK.switchBankHeadingY}
      text="SW[17..0]  /  LEDR[17..0]"
      detail={detail}
    />
    <BankHeading2D
      x={(ledGreenCentreX(7) + ledGreenCentreX(0)) / 2}
      y={BOTTOM_SILK.greenBankHeadingY}
      text="LEDG[7..0]  /  KEY[3..0]"
      detail={detail}
    />

    {/* ── Live simulation state ── */}
    <g>
      {DE2_HEX_DISPLAYS.map((c) => (
        <SevenSegment2D key={c.id} component={c} detail={detail} />
      ))}
    </g>
    <g>
      {DE2_LEDS_RED.map((c) => (
        <Led2D key={c.id} component={c} detail={detail} />
      ))}
      {DE2_LEDS_GREEN.map((c) => (
        <Led2D key={c.id} component={c} detail={detail} />
      ))}
    </g>
    <g>
      {DE2_SWITCHES.map((c) => (
        <Switch2D key={c.id} component={c} detail={detail} />
      ))}
      {DE2_KEYS.map((c) => (
        <Key2D key={c.id} component={c} detail={detail} />
      ))}
    </g>
  </svg>
));
DE2Board2D.displayName = 'DE2Board2D';
