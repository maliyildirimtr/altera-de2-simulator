import React, { useMemo, useRef, useState } from 'react';
import {
  CALIBRATION_MIN_SIZE,
  calibrationCorners,
  moveCalibration,
  polygonPoints,
  resolveInputOverlay,
  withQuadShape,
  withRectShape,
} from '../../board/de2InputCalibration';
import type {
  InputOverlayCalibration,
  InputOverlayCalibrationSet,
  QuadCorners,
} from '../../board/de2ReferenceAssets';

type Bank = keyof InputOverlayCalibrationSet;
type Corner = keyof QuadCorners;
type ResizeHandle = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

interface Selection {
  bank: Bank;
  index: number;
}

interface DragState {
  mode: 'move' | 'resize' | 'corner' | 'rotate';
  startX: number;
  startY: number;
  original: InputOverlayCalibration;
  target: Selection;
  corner?: Corner;
  handle?: ResizeHandle;
}

interface CalibrationToolProps {
  width: number;
  height: number;
  value: InputOverlayCalibrationSet;
  onChange: (next: InputOverlayCalibrationSet) => void;
}

const round = (value: number): number => Number(value.toFixed(6));

/** Vite replaces this expression at build time; production emits no tool UI. */
function isDE225DCalibrationAvailable(): boolean {
  return process.env.NODE_ENV === 'development';
}

function pointerInSvg(event: React.PointerEvent<SVGElement>): { x: number; y: number } {
  const svg = event.currentTarget.ownerSVGElement;
  if (!svg) return { x: event.clientX, y: event.clientY };
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = svg.getScreenCTM();
  return matrix ? point.matrixTransform(matrix.inverse()) : point;
}

function replaceCalibration(
  value: InputOverlayCalibrationSet,
  selection: Selection,
  next: InputOverlayCalibration,
): InputOverlayCalibrationSet {
  return {
    ...value,
    [selection.bank]: value[selection.bank].map((item) =>
      item.index === selection.index ? next : item,
    ),
  };
}

function calibrationBoundsFromCorners(corners: QuadCorners): Pick<
  InputOverlayCalibration,
  'x' | 'y' | 'width' | 'height'
> {
  const points = Object.values(corners);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x: round(x),
    y: round(y),
    width: round(Math.max(...xs) - x),
    height: round(Math.max(...ys) - y),
  };
}

function toTypeScript(value: InputOverlayCalibrationSet): string {
  return `export const DE2_25D_INPUT_CALIBRATION = ${JSON.stringify(value, null, 2)} as const;`;
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export const DE225DCalibrationTool: React.FC<CalibrationToolProps> = ({
  width,
  height,
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>({ bank: 'switches', index: 17 });
  const [copyStatus, setCopyStatus] = useState('');
  const drag = useRef<DragState | null>(null);
  const allItems = useMemo(
    () => [
      ...value.switches.map((item) => ({ bank: 'switches' as const, item })),
      ...value.keys.map((item) => ({ bank: 'keys' as const, item })),
    ],
    [value],
  );

  if (!isDE225DCalibrationAvailable()) return null;

  const selected = value[selection.bank].find((item) => item.index === selection.index)
    ?? value.switches[0];
  const selectedResolved = resolveInputOverlay(selected, width, height);
  const selectedJson = JSON.stringify(selected, null, 2);

  const commit = (next: InputOverlayCalibration): void => {
    onChange(replaceCalibration(value, selection, next));
  };

  const startDrag = (
    event: React.PointerEvent<SVGElement>,
    target: Selection,
    mode: DragState['mode'],
    corner?: Corner,
    handle?: ResizeHandle,
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    const start = pointerInSvg(event);
    const original = value[target.bank].find((item) => item.index === target.index);
    if (!original) return;
    setSelection(target);
    drag.current = { mode, startX: start.x, startY: start.y, original, target, corner, handle };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<SVGElement>): void => {
    const state = drag.current;
    if (!state) return;
    const point = pointerInSvg(event);
    const dx = (point.x - state.startX) / width;
    const dy = (point.y - state.startY) / height;
    let next = state.original;

    if (state.mode === 'move') {
      next = moveCalibration(state.original, dx, dy);
    } else if (state.mode === 'corner' && state.corner) {
      const corners = { ...calibrationCorners(state.original) };
      corners[state.corner] = {
        x: round(corners[state.corner].x + dx),
        y: round(corners[state.corner].y + dy),
      };
      next = { ...state.original, ...calibrationBoundsFromCorners(corners), corners };
    } else if (state.mode === 'resize' && state.handle) {
      let { x, y, width: boxWidth, height: boxHeight } = state.original;
      if (state.handle.includes('Left')) {
        x += dx;
        boxWidth -= dx;
      } else {
        boxWidth += dx;
      }
      if (state.handle.includes('top')) {
        y += dy;
        boxHeight -= dy;
      } else {
        boxHeight += dy;
      }
      next = {
        ...state.original,
        x: round(x),
        y: round(y),
        width: round(Math.max(CALIBRATION_MIN_SIZE, boxWidth)),
        height: round(Math.max(CALIBRATION_MIN_SIZE, boxHeight)),
      };
    } else if (state.mode === 'rotate') {
      const centre = resolveInputOverlay(state.original, width, height).centre;
      next = {
        ...state.original,
        rotate: round((Math.atan2(point.y - centre.y, point.x - centre.x) * 180) / Math.PI + 90),
      };
    }
    onChange(replaceCalibration(value, state.target, next));
  };

  const endDrag = (event: React.PointerEvent<SVGElement>): void => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const updateNumber = (field: keyof InputOverlayCalibration, raw: string): void => {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return;
    commit({ ...selected, [field]: numeric });
  };

  const copy = (text: string, label: string): void => {
    void copyText(text).then(() => {
      setCopyStatus(label);
      window.setTimeout(() => setCopyStatus(''), 1400);
    });
  };

  if (!open) {
    return (
      <foreignObject x={width - 270} y={18} width={250} height={52} data-calibration-toggle="2.5d">
        <button className="de2-calibration-toggle" type="button" onClick={() => setOpen(true)}>
          Calibrate SW / KEY
        </button>
      </foreignObject>
    );
  }

  const rotationHandle = {
    x: selectedResolved.centre.x,
    y: selectedResolved.centre.y - selectedResolved.height / 2 - 34,
  };

  return (
    <g data-calibration-mode="2.5d-inputs" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
      {allItems.map(({ bank, item }) => {
        const resolved = resolveInputOverlay(item, width, height);
        const active = bank === selection.bank && item.index === selection.index;
        return (
          <g key={`${bank}-${item.index}`}>
            <polygon
              points={polygonPoints(resolved.corners)}
              fill={active ? 'rgba(255, 196, 0, 0.16)' : 'rgba(0, 207, 255, 0.08)'}
              stroke={active ? '#FFC400' : '#00CFFF'}
              strokeWidth={active ? 3 : 2}
              vectorEffect="non-scaling-stroke"
              style={{ cursor: 'move' }}
              onPointerDown={(event) => startDrag(event, { bank, index: item.index }, 'move')}
            />
            <text
              x={resolved.centre.x}
              y={resolved.y - 8}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              fill={active ? '#FFC400' : '#E8FBFF'}
              stroke="#07131D"
              strokeWidth={4}
              paintOrder="stroke"
              pointerEvents="none"
            >
              {item.label}
            </text>
          </g>
        );
      })}

      <line
        x1={selectedResolved.centre.x}
        y1={selectedResolved.centre.y - selectedResolved.height / 2}
        x2={rotationHandle.x}
        y2={rotationHandle.y}
        stroke="#FFC400"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={rotationHandle.x}
        cy={rotationHandle.y}
        r={9}
        fill="#FFC400"
        stroke="#07131D"
        strokeWidth={2}
        style={{ cursor: 'grab' }}
        onPointerDown={(event) => startDrag(event, selection, 'rotate')}
      />

      {selectedResolved.corners.map((cornerPoint, cornerIndex) => {
        const names: readonly Corner[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
        const corner = names[cornerIndex];
        return (
          <rect
            key={corner}
            data-calibration-corner={corner}
            data-calibration-target={selected.label}
            x={cornerPoint.x - 7}
            y={cornerPoint.y - 7}
            width={14}
            height={14}
            fill={selected.shape === 'quad' ? '#FF4FD8' : '#FFC400'}
            stroke="#07131D"
            strokeWidth={2}
            style={{ cursor: selected.shape === 'quad' ? 'crosshair' : 'nwse-resize' }}
            onPointerDown={(event) =>
              startDrag(
                event,
                selection,
                selected.shape === 'quad' ? 'corner' : 'resize',
                selected.shape === 'quad' ? corner : undefined,
                selected.shape === 'rect' ? corner : undefined,
              )
            }
          />
        );
      })}

      <foreignObject x={width - 430} y={82} width={410} height={650}>
        <div className="de2-calibration-panel">
          <div className="de2-calibration-panel__title">
            <strong>{selected.label}</strong>
            <button type="button" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="de2-calibration-panel__grid">
            {(['x', 'y', 'width', 'height', 'rotate', 'scaleX', 'scaleY', 'skewX', 'skewY'] as const).map((field) => (
              <label key={field}>
                <span>{field}</span>
                <input
                  type="number"
                  step={field === 'rotate' || field.startsWith('skew') ? 0.1 : 0.0001}
                  value={selected[field]}
                  onChange={(event) => updateNumber(field, event.currentTarget.value)}
                />
              </label>
            ))}
          </div>
          <div className="de2-calibration-panel__actions">
            <button
              type="button"
              onClick={() => commit(selected.shape === 'rect' ? withQuadShape(selected) : withRectShape(selected))}
            >
              Convert to {selected.shape === 'rect' ? 'quad' : 'rect'}
            </button>
            <button type="button" onClick={() => copy(selectedJson, 'Selected JSON copied')}>
              Copy JSON
            </button>
            <button type="button" onClick={() => copy(toTypeScript(value), 'Full TS copied')}>
              Export TS
            </button>
          </div>
          <textarea readOnly value={selectedJson} aria-label={`${selected.label} normalized calibration`} />
          <small>{copyStatus || 'Values are normalized to the 2168 × 1477 source image.'}</small>
        </div>
      </foreignObject>
    </g>
  );
};

DE225DCalibrationTool.displayName = 'DE225DCalibrationTool';
