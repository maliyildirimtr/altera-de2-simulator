import React from 'react';
import {
  polygonPoints,
  projectiveWarpFrame,
} from '../../../board/de2InputCalibration';
import type { ArtworkPoint } from '../../../board/de2ReferenceAssets';

const MASK_FILL = '#073E60';

interface PerspectiveVisualProps {
  corners: readonly [ArtworkPoint, ArtworkPoint, ArtworkPoint, ArtworkPoint];
  index: number;
  active: boolean;
}

const ProjectiveSurface: React.FC<{
  corners: readonly [ArtworkPoint, ArtworkPoint, ArtworkPoint, ArtworkPoint];
  kind: 'switch' | 'key';
  index: number;
  children: React.ReactNode;
}> = ({ corners, kind, index, children }) => {
  const frame = projectiveWarpFrame(corners);
  const quad = polygonPoints(corners);
  return (
    <g
      aria-hidden="true"
      data-projective-visual={`${kind}-${index}`}
      data-projective-quad={quad}
      pointerEvents="none"
    >
      {/* This polygon replaces the baked control before the independent live
          component is painted. It is exactly the same quad as visual + hit. */}
      <polygon data-baked-input-mask={`${kind}-${index}`} points={quad} fill={MASK_FILL} />
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

export const PerspectiveSwitchVisual: React.FC<PerspectiveVisualProps> = ({
  corners,
  index,
  active,
}) => (
  <ProjectiveSurface corners={corners} kind="switch" index={index}>
    <div className="de2-projective-switch__housing">
      <div className="de2-projective-switch__channel">
        <div
          className="de2-projective-switch__lever"
          data-live-position={active ? 'up' : 'down'}
        >
          <i />
          <b />
        </div>
      </div>
    </div>
  </ProjectiveSurface>
);

export const PerspectiveKeyVisual: React.FC<PerspectiveVisualProps> = ({
  corners,
  index,
  active,
}) => (
  <ProjectiveSurface corners={corners} kind="key" index={index}>
    <div className="de2-projective-key__shell">
      <i className="de2-projective-key__fastener de2-projective-key__fastener--tl" />
      <i className="de2-projective-key__fastener de2-projective-key__fastener--tr" />
      <i className="de2-projective-key__fastener de2-projective-key__fastener--br" />
      <i className="de2-projective-key__fastener de2-projective-key__fastener--bl" />
      <div className="de2-projective-key__well">
        <div className="de2-projective-key__plunger" data-live-position={active ? 'down' : 'up'} />
      </div>
    </div>
  </ProjectiveSurface>
);

PerspectiveSwitchVisual.displayName = 'PerspectiveSwitchVisual';
PerspectiveKeyVisual.displayName = 'PerspectiveKeyVisual';
