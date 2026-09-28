import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * HTML layer for the projectively warped 2.5D parts (SW, KEY, HEX, LCD).
 *
 * Those parts are HTML boxes under a CSS `matrix3d`. Drawn inside the board
 * SVG through `<foreignObject>`, Safari/WebKit composites transformed HTML in
 * its own layer and ignores the SVG viewBox scale and position, so the parts
 * landed at native pixel size below the board. Instead they are portalled
 * into this plain HTML layer, which sits exactly over the SVG and reproduces
 * its `xMidYMid meet` viewBox mapping with one CSS scale. The SVG keeps the
 * masks and hit polygons, so clicks and the shared store are unchanged.
 *
 * Server rendering (the regression tests) has no layer element, so the parts
 * fall back to `<foreignObject>` and the markup stays inspectable.
 */
const ProjectiveLayerContext = createContext<HTMLElement | null>(null);

export const ProjectiveLayerHost: React.FC<{
  width: number;
  height: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ width, height, style, children }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const [fit, setFit] = useState({ scale: 0, x: 0, y: 0 });

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      const scale = Math.min(w / width, h / height);
      setFit({ scale, x: (w - width * scale) / 2, y: (h - height * scale) / 2 });
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={hostRef} className="de2-projective-host" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ProjectiveLayerContext.Provider value={layer}>{children}</ProjectiveLayerContext.Provider>
      <div
        ref={setLayer}
        data-projective-layer
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height,
          transformOrigin: '0 0',
          transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})`,
          visibility: fit.scale ? 'visible' : 'hidden',
          pointerEvents: 'none',
          ...style,
        }}
      />
    </div>
  );
};

export interface ProjectiveFrameBox {
  x: number;
  y: number;
  width: number;
  height: number;
  matrix: string;
}

/** One warped part: portalled into the HTML layer when it exists. */
export const ProjectiveFrame: React.FC<{
  frame: ProjectiveFrameBox;
  kind: string;
  children: React.ReactNode;
}> = ({ frame, kind, children }) => {
  const layer = useContext(ProjectiveLayerContext);
  const part = (
    <div
      className={`de2-projective-part de2-projective-${kind}`}
      data-projective-matrix={frame.matrix}
      style={{ transform: frame.matrix }}
    >
      {children}
    </div>
  );

  if (layer) {
    return createPortal(
      <div
        className="de2-projective-frame"
        style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
      >
        {part}
      </div>,
      layer,
    );
  }

  return (
    <foreignObject
      x={frame.x}
      y={frame.y}
      width={frame.width}
      height={frame.height}
      overflow="visible"
      pointerEvents="none"
    >
      <div className="de2-projective-frame">{part}</div>
    </foreignObject>
  );
};
