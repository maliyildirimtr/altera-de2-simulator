// ============================================================
// waveformRenderer.tsx — Pure SVG Rendering Engine
//
// F2.3: VIEWPORT CULLING (Sanal Çizim)
//   renderSignalWaveform artık isteğe bağlı bir `viewport`
//   parametresi alır. Bu parametre verildiğinde yalnızca
//   görünür zaman aralığındaki (+ buffer) geçişler çizilir.
//   Görünmeyen SVG element'leri hiç oluşturulmaz.
//   → Büyük VCD dosyalarında scroll sırasında FPS korunur.
//
// F2.6: BASE SCALE (Ölçeklendirme)
//   BASE_PIXELS_PER_UNIT = 20 eklendi. Zaman değerleri bu
//   katsayı ile çarpılarak piksellere dönüştürülür.
// ============================================================

import React from 'react';
import type { VCDSignal, VCDTimescale } from './vcdParser';

export const WAVE_Y_HIGH = 8;
export const WAVE_Y_LOW  = 32;
export const WAVE_Y_MID  = 20;
export const BASE_PIXELS_PER_UNIT = 20;

/** Visible time window for viewport culling (F2.3). */
export interface ViewportWindow {
  /** Leftmost visible time (ps) — with buffer already applied. */
  startTime: number;
  /** Rightmost visible time (ps) — with buffer already applied. */
  endTime: number;
}

/** Convert raw ps timestamp to a human-readable string using the VCD timescale. */
export function formatTime(rawTime: number, ts: VCDTimescale | undefined): string {
  if (!ts) return `${rawTime} ps`;

  // Icarus Verilog often emits `$timescale 1s $end` even for ps-level sims.
  // In that case toPsFactor = 1e12 → value = rawTime / 1e12 → 0.000... s (unreadable).
  // Instead, treat raw ticks as the display value and show the unit as-is.
  // The ruler / TIME panel will be readable (e.g. "10 ps" or "30 ns").
  if (ts.unit === 's' || ts.toPsFactor >= 1e9) {
    // Prefer to show ticks directly labelled as "ps" for clarity
    const val = rawTime;
    return `${Number.isInteger(val) ? val : val.toFixed(2)} ps`;
  }

  const value = rawTime / ts.toPsFactor;
  return `${Number.isInteger(value) ? value : value.toFixed(2)} ${ts.unit}`;
}

/** Binary search: last transition value at or before `time`. */
export function getSignalValueAtTime(signal: VCDSignal, time: number): number | string {
  for (let i = signal.transitions.length - 1; i >= 0; i--) {
    if (signal.transitions[i].time <= time) return signal.transitions[i].val;
  }
  return 'X';
}

/** Construct a synthetic 1-bit VCDSignal by extracting one bit from a bus. */
export function extractBitSignal(signal: VCDSignal, bitIndex: number): VCDSignal {
  return {
    name: `${signal.name}[${bitIndex}]`,
    type: signal.type,
    symbol: signal.symbol,
    width: 1,
    transitions: signal.transitions.map(t => {
      const strVal = String(t.val);
      const padded = strVal.padStart(signal.width, '0');
      const char   = padded[padded.length - 1 - bitIndex];
      const bitVal: number | string = (char === '0' || char === '1') ? parseInt(char, 10) : char;
      return { time: t.time, val: bitVal };
    }),
  };
}

// ── F2.3: Transition slicer ──────────────────────────────────
// Returns a narrowed slice of the transition array that covers the
// viewport window. One extra transition before and after is included
// so that partially-visible segments start from the correct value.
function sliceTransitions(
  signal: VCDSignal,
  vp: ViewportWindow,
): typeof signal.transitions {
  const trans = signal.transitions;
  if (!trans.length) return trans;

  // Find the index of the last transition that begins before startTime
  let first = 0;
  for (let i = trans.length - 1; i >= 0; i--) {
    if (trans[i].time <= vp.startTime) { first = i; break; }
  }

  // Find the index of the first transition that begins after endTime
  let last = trans.length - 1;
  for (let i = first; i < trans.length; i++) {
    if (trans[i].time > vp.endTime) { last = i; break; }
  }

  return trans.slice(first, last + 1);
}

// ── Main renderer ────────────────────────────────────────────
/**
 * Render the SVG waveform for a signal (1-bit or multi-bit bus).
 *
 * @param signal    VCDSignal to render
 * @param maxTime   Total simulation time (ps)
 * @param zoomLevel User zoom multiplier
 * @param radix     Display radix for bus values
 * @param viewport  Optional viewport window for culling (F2.3)
 */
export function renderSignalWaveform(
  signal: VCDSignal,
  maxTime: number,
  zoomLevel: number,
  radix: 'hex' | 'dec' | 'bin' = 'hex',
  viewport?: ViewportWindow,
): React.ReactElement {
  const yHigh = WAVE_Y_HIGH;
  const yLow  = WAVE_Y_LOW;
  const yMid  = WAVE_Y_MID;

  // Effective scale multiplier
  const scale = BASE_PIXELS_PER_UNIT * zoomLevel;

  // F2.3: Narrow the transition array to the visible window
  const transitions = viewport ? sliceTransitions(signal, viewport) : signal.transitions;

  if (signal.width === 1) {
    // ── 1-BIT ─────────────────────────────────────────────────
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < transitions.length; i++) {
      const trans     = transitions[i];
      const nextTrans = transitions[i + 1] ?? signal.transitions[signal.transitions.indexOf(trans) + 1];
      const startX    = trans.time * scale;
      const endX      = nextTrans ? nextTrans.time * scale : maxTime * scale;
      if (startX >= endX) continue;

      const isX = trans.val === 'x' || trans.val === 'X';
      const isZ = trans.val === 'z' || trans.val === 'Z';
      const y   = trans.val === 1 ? yHigh : isZ ? yMid : yLow;

      let strokeColor = '#00ff00';
      if (isX) strokeColor = '#ff0000';
      if (isZ) strokeColor = '#888888';

      // Determine previous transition for vertical edge
      const globalIdx = signal.transitions.indexOf(trans);
      let pathStr = `M ${startX} ${y} L ${endX} ${y}`;
      if (globalIdx > 0) {
        const prev    = signal.transitions[globalIdx - 1];
        const prevIsZ = prev.val === 'z' || prev.val === 'Z';
        const prevY   = prev.val === 1 ? yHigh : prevIsZ ? yMid : yLow;
        pathStr = `M ${startX} ${prevY} L ${startX} ${y} ` + pathStr;
      }

      if (trans.val === 1) {
        elements.push(<path key={`fill-${i}`}
          d={`M ${startX} ${yHigh} L ${endX} ${yHigh} L ${endX} ${yLow} L ${startX} ${yLow} Z`}
          fill="#005a00" stroke="none" />);
      } else if (isX) {
        elements.push(<path key={`fill-${i}`}
          d={`M ${startX} ${yHigh} L ${endX} ${yHigh} L ${endX} ${yLow} L ${startX} ${yLow} Z`}
          fill="rgba(255,0,0,0.5)" stroke="none" />);
      }
      elements.push(<path key={`line-${i}`} d={pathStr}
        fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" />);
    }
    return React.createElement('g', null, ...elements);
  }

  // ── MULTI-BIT (BUS) ────────────────────────────────────────
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < transitions.length; i++) {
    let paths   = '';
    const trans     = transitions[i];
    const nextTrans = transitions[i + 1] ?? signal.transitions[signal.transitions.indexOf(trans) + 1];
    const startX    = trans.time * scale;
    const endX      = nextTrans ? nextTrans.time * scale : maxTime * scale;
    if (startX >= endX) continue;

    const isX = String(trans.val).toLowerCase().includes('x');
    const isZ = String(trans.val).toLowerCase().includes('z');
    let strokeColor = '#00ff00';
    if (isX) strokeColor = '#ff0000';
    if (isZ) strokeColor = '#888888';

    // Format display value per radix
    let displayVal = trans.val as string;
    if (typeof displayVal === 'string' && /^[01xz]+$/i.test(displayVal)) {
      if (radix === 'hex') {
        displayVal = 'h' + parseInt(displayVal, 2).toString(16).toUpperCase();
        if (displayVal.includes('NaN')) displayVal = 'hX';
      } else if (radix === 'dec') {
        displayVal = parseInt(displayVal, 2).toString(10);
        if (displayVal.includes('NaN')) displayVal = 'X';
      } else {
        displayVal = 'b' + displayVal;
      }
    } else {
      displayVal = String(trans.val);
    }

    const globalIdx = signal.transitions.indexOf(trans);
    const cxStart   = globalIdx === 0 ? startX : startX + 3;
    const cxEnd     = nextTrans ? endX - 3 : endX;

    if (endX - startX < 6 && nextTrans) {
      paths += ` M ${startX} ${yMid} L ${endX} ${yMid}`;
    } else {
      paths += ` M ${cxStart} ${yHigh} L ${cxEnd} ${yHigh}`;
      paths += ` M ${cxStart} ${yLow}  L ${cxEnd} ${yLow}`;

      if (globalIdx === 0) {
        paths += ` M ${startX} ${yHigh} L ${startX} ${yLow}`;
      } else {
        paths += ` M ${startX} ${yMid} L ${cxStart} ${yHigh}`;
        paths += ` M ${startX} ${yMid} L ${cxStart} ${yLow}`;
      }

      if (nextTrans) {
        paths += ` M ${cxEnd} ${yHigh} L ${endX} ${yMid}`;
        paths += ` M ${cxEnd} ${yLow}  L ${endX} ${yMid}`;
      } else {
        paths += ` M ${endX} ${yHigh} L ${endX} ${yLow}`;
      }

      const width = endX - startX;
      if (width > 20) {
        elements.push(React.createElement('text', {
          key:    `text-${i}`,
          x:      startX + width / 2,
          y:      yMid + 4,
          fill:   isX ? '#ff8888' : '#ffffff',
          fontSize:   '10',
          fontFamily: 'monospace',
          textAnchor: 'middle',
        }, width < displayVal.length * 7 ? '..' : displayVal));
      }
    }

    elements.push(<path key={`path-${i}`} d={paths}
      fill={isX ? 'rgba(255,0,0,0.3)' : 'none'}
      stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" />);
  }

  return React.createElement('g', null, ...elements);
}
