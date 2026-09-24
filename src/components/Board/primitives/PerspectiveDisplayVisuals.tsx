import React, { useMemo } from 'react';
import { polygonPoints, projectiveWarpFrame } from '../../../board/de2InputCalibration';
import type { ArtworkPoint } from '../../../board/de2ReferenceAssets';
import { isSegmentLit } from '../../../board/useBoardSelectors';
import { sevenSegmentShapes, SEGMENT_SLANT_DEG } from '../boardGeometry';
import {
  LCD_DOT_CANVAS_HEIGHT,
  LCD_DOT_CANVAS_WIDTH,
  LCD_DOT_CELL_HEIGHT,
  LCD_DOT_CELL_WIDTH,
  LCD_DOT_COLUMNS,
  LCD_DOT_GAP_X,
  LCD_DOT_GAP_Y,
  LCD_DOT_GRID_X,
  LCD_DOT_GRID_Y,
  LCD_DOT_ROWS,
  LCD_DOT_SIZE,
  lcdDotGlyph,
} from './lcdDotMatrix';

const HEX_SOURCE_WIDTH = 72;
const HEX_SOURCE_HEIGHT = 94;

interface PerspectivePlaneProps {
  corners: readonly [ArtworkPoint, ArtworkPoint, ArtworkPoint, ArtworkPoint];
  kind: 'hex' | 'lcd';
  identity: string;
  maskFill: string;
  children: React.ReactNode;
}

const PerspectivePlane: React.FC<PerspectivePlaneProps> = ({
  corners,
  kind,
  identity,
  maskFill,
  children,
}) => {
  const frame = projectiveWarpFrame(corners);
  const quad = polygonPoints(corners);
  return (
    <g
      aria-hidden="true"
      data-projective-display={`${kind}-${identity}`}
      data-projective-quad={quad}
      pointerEvents="none"
    >
      <polygon
        data-baked-state-mask={kind}
        points={quad}
        fill={maskFill}
      />
      <foreignObject
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        overflow="visible"
        pointerEvents="none"
      >
        <div className="de2-projective-frame">
          <div
            className={`de2-projective-part de2-projective-${kind}`}
            data-projective-matrix={frame.matrix}
            style={{ transform: frame.matrix }}
          >
            {children}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export const PerspectiveHexVisual: React.FC<{
  corners: readonly [ArtworkPoint, ArtworkPoint, ArtworkPoint, ArtworkPoint];
  index: number;
  segments: readonly number[];
}> = ({ corners, index, segments }) => {
  const shapes = useMemo(
    () => sevenSegmentShapes(HEX_SOURCE_WIDTH, HEX_SOURCE_HEIGHT),
    [],
  );
  const gradientId = `de2-25d-hex-face-${index}`;
  const glowId = `de2-25d-hex-glow-${index}`;
  return (
    <PerspectivePlane
      corners={corners}
      kind="hex"
      identity={String(index)}
      maskFill="url(#de2a-hex-face)"
    >
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="de2-projective-hex__svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0.08" y2="1">
            <stop offset="0%" stopColor="#77706D" />
            <stop offset="100%" stopColor="#686765" />
          </linearGradient>
          <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.65">
            <stop offset="0%" stopColor="#FF4A2C" stopOpacity="0.17" />
            <stop offset="100%" stopColor="#FF2F18" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gradientId})`} />
        {segments.some((value) => isSegmentLit(value)) && (
          <rect width="100" height="100" fill={`url(#${glowId})`} />
        )}
        <g transform={`translate(14 3) skewX(-${SEGMENT_SLANT_DEG})`}>
          {shapes.map((shape) => {
            const lit = isSegmentLit(segments[shape.index]);
            return (
              <polygon
                key={shape.index}
                className="de2-seg"
                data-segment={shape.index}
                data-lit={lit ? 'true' : 'false'}
                points={shape.points}
                fill={lit ? '#FF3A1C' : '#493C3A'}
                stroke={lit ? '#B81D06' : 'none'}
                strokeWidth={lit ? 1.1 : 0}
                opacity={lit ? 1 : 0.52}
              />
            );
          })}
        </g>
      </svg>
    </PerspectivePlane>
  );
};

export const PerspectiveLcdVisual: React.FC<{
  corners: readonly [ArtworkPoint, ArtworkPoint, ArtworkPoint, ArtworkPoint];
  rows: readonly [string, string];
  visible: boolean;
  backlight: boolean;
  cursor: { row: number; col: number } | null;
}> = ({ corners, rows, visible, backlight, cursor }) => {
  const displayRows = rows.map((row) => row.padEnd(LCD_DOT_COLUMNS).slice(0, LCD_DOT_COLUMNS));
  const dotPitchX = LCD_DOT_SIZE + LCD_DOT_GAP_X;
  const dotPitchY = LCD_DOT_SIZE + LCD_DOT_GAP_Y;
  const glyphWidth = LCD_DOT_SIZE * 5 + LCD_DOT_GAP_X * 4;
  const glyphHeight = LCD_DOT_SIZE * 8 + LCD_DOT_GAP_Y * 7;
  const glyphInsetX = (LCD_DOT_CELL_WIDTH - glyphWidth) / 2;
  const glyphInsetY = (LCD_DOT_CELL_HEIGHT - glyphHeight) / 2;

  return (
    <PerspectivePlane
      corners={corners}
      kind="lcd"
      identity="screen"
      maskFill="#687F65"
    >
      <svg
        width="100"
        height="100"
        viewBox={`0 0 ${LCD_DOT_CANVAS_WIDTH} ${LCD_DOT_CANVAS_HEIGHT}`}
        preserveAspectRatio="none"
        className="de2-projective-lcd__svg"
        data-lcd-renderer="5x8-dot-matrix"
        data-lcd-columns={LCD_DOT_COLUMNS}
        data-lcd-rows={LCD_DOT_ROWS}
        data-lcd-cell-width={LCD_DOT_CELL_WIDTH}
        data-lcd-cell-height={LCD_DOT_CELL_HEIGHT}
        data-lcd-dot-size={LCD_DOT_SIZE}
        data-lcd-row-pitch={LCD_DOT_CELL_HEIGHT}
      >
        <defs>
          <linearGradient id="de2-25d-lcd-glass" x1="0" y1="0" x2="0.04" y2="1">
            <stop offset="0%" stopColor="#61785F" />
            <stop offset="18%" stopColor="#6C8468" />
            <stop offset="58%" stopColor="#748B6D" />
            <stop offset="100%" stopColor="#627A60" />
          </linearGradient>
          <radialGradient id="de2-25d-lcd-illumination" cx="0.52" cy="0.48" r="0.72">
            <stop offset="0%" stopColor="#A7B995" stopOpacity="0.15" />
            <stop offset="62%" stopColor="#8EA381" stopOpacity="0.055" />
            <stop offset="100%" stopColor="#263A29" stopOpacity="0.1" />
          </radialGradient>
          <linearGradient id="de2-25d-lcd-inner-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17281A" stopOpacity="0.2" />
            <stop offset="14%" stopColor="#17281A" stopOpacity="0" />
            <stop offset="84%" stopColor="#17281A" stopOpacity="0" />
            <stop offset="100%" stopColor="#17281A" stopOpacity="0.16" />
          </linearGradient>
          <clipPath id="de2-25d-lcd-clip">
            <rect width={LCD_DOT_CANVAS_WIDTH} height={LCD_DOT_CANVAS_HEIGHT} rx="48" ry="28" />
          </clipPath>
        </defs>
        <g clipPath="url(#de2-25d-lcd-clip)">
          <rect
            width={LCD_DOT_CANVAS_WIDTH}
            height={LCD_DOT_CANVAS_HEIGHT}
            fill="url(#de2-25d-lcd-glass)"
          />
          <rect
            width={LCD_DOT_CANVAS_WIDTH}
            height={LCD_DOT_CANVAS_HEIGHT}
            fill="url(#de2-25d-lcd-illumination)"
          />
          <rect
            width={LCD_DOT_CANVAS_WIDTH}
            height={LCD_DOT_CANVAS_HEIGHT}
            fill="url(#de2-25d-lcd-inner-shade)"
          />
          <rect
            x="10"
            y="10"
            width={LCD_DOT_CANVAS_WIDTH - 20}
            height={LCD_DOT_CANVAS_HEIGHT - 20}
            rx="40"
            ry="22"
            fill="none"
            stroke="#263A29"
            strokeWidth="18"
            opacity="0.16"
          />

          {visible && displayRows.map((text, row) => (
            <g key={row} data-lcd-row={row}>
              {Array.from({ length: LCD_DOT_COLUMNS }, (_, col) => {
                const character = text[col] ?? ' ';
                const characterGlyph = lcdDotGlyph(character);
                const cellX = LCD_DOT_GRID_X + col * LCD_DOT_CELL_WIDTH;
                const cellY = LCD_DOT_GRID_Y + row * LCD_DOT_CELL_HEIGHT;
                return (
                  <g
                    key={col}
                    data-lcd-cell={`${row}:${col}`}
                    data-lcd-char={character}
                    transform={`translate(${cellX + glyphInsetX} ${cellY + glyphInsetY})`}
                  >
                    {characterGlyph.flatMap((pixelRow, pixelY) =>
                      Array.from({ length: 5 }, (_, pixelX) => {
                        const cursorPixel = cursor?.row === row && cursor.col === col && pixelY === 7;
                        const lit = pixelRow[pixelX] === '1' || cursorPixel;
                        return (
                          <rect
                            key={`${pixelY}-${pixelX}`}
                            data-lcd-dot={lit ? 'on' : 'off'}
                            x={pixelX * dotPitchX}
                            y={pixelY * dotPitchY}
                            width={LCD_DOT_SIZE}
                            height={LCD_DOT_SIZE}
                            rx="1.4"
                            ry="1.4"
                            fill={lit ? '#20321F' : '#344B35'}
                            opacity={lit ? 0.92 : 0.065}
                          />
                        );
                      }),
                    )}
                  </g>
                );
              })}
            </g>
          ))}

          {!backlight && (
            <rect
              width={LCD_DOT_CANVAS_WIDTH}
              height={LCD_DOT_CANVAS_HEIGHT}
              fill="#0A140C"
              opacity="0.34"
            />
          )}
          {!visible && (
            <rect
              width={LCD_DOT_CANVAS_WIDTH}
              height={LCD_DOT_CANVAS_HEIGHT}
              fill="#0A140C"
              opacity="0.24"
            />
          )}
        </g>
      </svg>
    </PerspectivePlane>
  );
};

PerspectiveHexVisual.displayName = 'PerspectiveHexVisual';
PerspectiveLcdVisual.displayName = 'PerspectiveLcdVisual';
