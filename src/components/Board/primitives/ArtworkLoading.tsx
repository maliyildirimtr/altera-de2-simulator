import React from 'react';

interface ArtworkLoadingProps {
  width: number;
  height: number;
  ready: boolean;
}

/**
 * Neutral stand-in drawn while the board artwork decodes. It occupies the
 * board's exact footprint so nothing shifts when the real board fades in.
 */
export const ArtworkLoadingPlaceholder: React.FC<ArtworkLoadingProps> = ({ width, height, ready }) => (
  <g
    data-artwork-placeholder
    className="de2-artwork-placeholder"
    aria-hidden="true"
    pointerEvents="none"
    style={{ opacity: ready ? 0 : 1 }}
  >
    <rect
      x={width * 0.03}
      y={height * 0.03}
      width={width * 0.94}
      height={height * 0.94}
      rx={Math.min(width, height) * 0.02}
      className="de2-artwork-placeholder__plate"
    />
  </g>
);

/** Style for the group that holds the artwork and every live overlay. */
export function artworkRevealStyle(ready: boolean): React.CSSProperties {
  return {
    opacity: ready ? 1 : 0,
    transition: 'opacity 260ms ease-out',
    pointerEvents: ready ? undefined : 'none',
  };
}
