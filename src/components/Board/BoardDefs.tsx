import React from 'react';
import { PCB, IC, METAL, GOLD, LED, SEVEN_SEG, LCD, SWITCH, BUTTON_RED } from './boardPalette';

/**
 * Shared SVG paint server definitions for the DE2 board renderers.
 *
 * Deliberately gradient-based rather than filter-based: `feGaussianBlur` on
 * dozens of live indicators is the single most expensive thing an SVG board can
 * do, and the LED / segment glow reads just as well as a radial halo. The only
 * filter here is one small board drop shadow that never re-renders.
 */
export const BoardDefs: React.FC = () => (
  <defs>
    {/* ── PCB solder mask ── */}
    <linearGradient id="de2b-pcb" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stopColor={PCB.light} />
      <stop offset="45%" stopColor={PCB.base} />
      <stop offset="100%" stopColor={PCB.dark} />
    </linearGradient>

    <radialGradient id="de2b-pcb-vignette" cx="0.5" cy="0.42" r="0.78">
      <stop offset="0%" stopColor="#000000" stopOpacity="0" />
      <stop offset="70%" stopColor="#000000" stopOpacity="0.08" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.34" />
    </radialGradient>

    <linearGradient id="de2b-pcb-sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.055" />
      <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.012" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.09" />
    </linearGradient>

    {/* Ground-pour mesh showing faintly through the mask. */}
    <pattern id="de2b-pour" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
      <rect width="2.4" height="2.4" fill="none" />
      <circle cx="1.2" cy="1.2" r="0.32" fill={PCB.pour} opacity="0.4" />
    </pattern>

    {/* Board edge: exposed FR-4 core. */}
    <linearGradient id="de2b-core" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={PCB.core} />
      <stop offset="100%" stopColor={PCB.coreDark} />
    </linearGradient>

    {/* ── Packages ── */}
    <linearGradient id="de2b-ic" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stopColor={IC.top} />
      <stop offset="55%" stopColor={IC.mid} />
      <stop offset="100%" stopColor={IC.dark} />
    </linearGradient>

    <linearGradient id="de2b-ic-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={IC.mid} />
      <stop offset="100%" stopColor="#0A0C0F" />
    </linearGradient>

    <linearGradient id="de2b-metal" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stopColor="#E2E7ED" />
      <stop offset="35%" stopColor={METAL.bright} />
      <stop offset="72%" stopColor={METAL.mid} />
      <stop offset="100%" stopColor={METAL.dark} />
    </linearGradient>

    <linearGradient id="de2b-metal-dark" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stopColor="#8A929C" />
      <stop offset="50%" stopColor={METAL.dark} />
      <stop offset="100%" stopColor={METAL.shadow} />
    </linearGradient>

    <linearGradient id="de2b-gold" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stopColor={GOLD.light} />
      <stop offset="50%" stopColor={GOLD.base} />
      <stop offset="100%" stopColor={GOLD.dark} />
    </linearGradient>

    <radialGradient id="de2b-cap" cx="0.38" cy="0.32" r="0.75">
      <stop offset="0%" stopColor="#EDF0F4" />
      <stop offset="42%" stopColor={METAL.cap} />
      <stop offset="78%" stopColor={METAL.capDark} />
      <stop offset="100%" stopColor="#3B4048" />
    </radialGradient>

    <radialGradient id="de2b-cap-pressed" cx="0.42" cy="0.44" r="0.72">
      <stop offset="0%" stopColor="#9BA2AB" />
      <stop offset="55%" stopColor="#6B727B" />
      <stop offset="100%" stopColor="#2E3339" />
    </radialGradient>

    <radialGradient id="de2b-button-red" cx="0.36" cy="0.3" r="0.76">
      <stop offset="0%" stopColor="#F5786C" />
      <stop offset="40%" stopColor={BUTTON_RED.light} />
      <stop offset="78%" stopColor={BUTTON_RED.base} />
      <stop offset="100%" stopColor={BUTTON_RED.dark} />
    </radialGradient>

    {/* ── Toggle switch ── */}
    <linearGradient id="de2b-sw-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={SWITCH.bodyTop} />
      <stop offset="100%" stopColor={SWITCH.body} />
    </linearGradient>

    <linearGradient id="de2b-lever" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor={SWITCH.leverDark} />
      <stop offset="28%" stopColor={SWITCH.leverLight} />
      <stop offset="62%" stopColor={SWITCH.leverMid} />
      <stop offset="100%" stopColor={SWITCH.leverDark} />
    </linearGradient>

    {/* ── LEDs ── */}
    <radialGradient id="de2b-ledr-on" cx="0.36" cy="0.3" r="0.8">
      <stop offset="0%" stopColor={LED.redCore} />
      <stop offset="34%" stopColor={LED.redOn} />
      <stop offset="100%" stopColor="#B21B12" />
    </radialGradient>
    <radialGradient id="de2b-ledr-off" cx="0.36" cy="0.3" r="0.85">
      <stop offset="0%" stopColor={LED.redOff} />
      <stop offset="100%" stopColor={LED.redOffDark} />
    </radialGradient>
    <radialGradient id="de2b-ledr-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#FF4034" stopOpacity="0.55" />
      <stop offset="45%" stopColor="#FF2A1C" stopOpacity="0.2" />
      <stop offset="100%" stopColor="#FF2A1C" stopOpacity="0" />
    </radialGradient>

    <radialGradient id="de2b-ledg-on" cx="0.36" cy="0.3" r="0.8">
      <stop offset="0%" stopColor={LED.greenCore} />
      <stop offset="34%" stopColor={LED.greenOn} />
      <stop offset="100%" stopColor="#1E8F3C" />
    </radialGradient>
    <radialGradient id="de2b-ledg-off" cx="0.36" cy="0.3" r="0.85">
      <stop offset="0%" stopColor={LED.greenOff} />
      <stop offset="100%" stopColor={LED.greenOffDark} />
    </radialGradient>
    <radialGradient id="de2b-ledg-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#3FE06A" stopOpacity="0.5" />
      <stop offset="45%" stopColor="#25C951" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#25C951" stopOpacity="0" />
    </radialGradient>

    {/* ── Seven-segment display ── */}
    <linearGradient id="de2b-seg-pkg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={SEVEN_SEG.packageTop} />
      <stop offset="100%" stopColor="#1A0C0C" />
    </linearGradient>
    <linearGradient id="de2b-seg-glass" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stopColor="#2B1312" />
      <stop offset="100%" stopColor="#140807" />
    </linearGradient>
    <radialGradient id="de2b-seg-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#FF3B2E" stopOpacity="0.42" />
      <stop offset="60%" stopColor="#FF3B2E" stopOpacity="0.1" />
      <stop offset="100%" stopColor="#FF3B2E" stopOpacity="0" />
    </radialGradient>

    {/* ── LCD module ── */}
    <linearGradient id="de2b-lcd-bezel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={LCD.bezelLight} />
      <stop offset="100%" stopColor={LCD.bezel} />
    </linearGradient>
    <linearGradient id="de2b-lcd-glass" x1="0.1" y1="0" x2="0.7" y2="1">
      <stop offset="0%" stopColor="#A3B489" />
      <stop offset="55%" stopColor={LCD.glass} />
      <stop offset="100%" stopColor={LCD.glassDark} />
    </linearGradient>

    {/* ── 2.5D substrate faces ── */}
    <linearGradient id="de2b-slab-front" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={PCB.core} />
      <stop offset="45%" stopColor={PCB.coreDark} />
      <stop offset="100%" stopColor="#5A4720" />
    </linearGradient>
    <linearGradient id="de2b-slab-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={PCB.coreDark} />
      <stop offset="100%" stopColor="#4A3A1B" />
    </linearGradient>

    {/* One cheap, static shadow under the whole board in 2.5D. */}
    <radialGradient id="de2b-board-shadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#000000" stopOpacity="0.38" />
      <stop offset="65%" stopColor="#000000" stopOpacity="0.14" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
    </radialGradient>
  </defs>
);
