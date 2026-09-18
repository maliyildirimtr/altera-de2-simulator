import React from 'react';
import {
  PCB,
  IC,
  METAL,
  GOLD,
  LED,
  SEVEN_SEG,
  LCD,
  SWITCH,
  BUTTON_RED,
  PASSIVE,
  CONNECTOR,
} from './boardPalette';

/**
 * Shared SVG paint servers for the DE2 board renderers.
 *
 * Deliberately gradient-based rather than filter-based: `feGaussianBlur` over
 * dozens of live indicators is the most expensive thing an SVG board can do,
 * and a radial halo reads as well as a real blur. Nothing here is a filter.
 *
 * Every light source runs from the top-left, consistently, across every
 * material — that consistency is most of what separates "rendered" from
 * "assembled out of clip art".
 */
export const BoardDefs: React.FC = () => (
  <defs>
    {/* ── PCB solder mask ─────────────────────────────────────────────── */}
    <linearGradient id="de2b-pcb" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stopColor={PCB.light} />
      <stop offset="38%" stopColor={PCB.base} />
      <stop offset="100%" stopColor={PCB.dark} />
    </linearGradient>

    {/* Semi-gloss mask sheen: a broad diagonal sweep, not a highlight blob. */}
    <linearGradient id="de2b-pcb-sheen" x1="0" y1="0" x2="1" y2="0.85">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.055" />
      <stop offset="22%" stopColor="#FFFFFF" stopOpacity="0.018" />
      <stop offset="52%" stopColor="#FFFFFF" stopOpacity="0.004" />
      <stop offset="78%" stopColor="#000000" stopOpacity="0.05" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.11" />
    </linearGradient>

    <radialGradient id="de2b-pcb-vignette" cx="0.42" cy="0.34" r="0.86">
      <stop offset="0%" stopColor="#000000" stopOpacity="0" />
      <stop offset="56%" stopColor="#000000" stopOpacity="0.04" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.19" />
    </radialGradient>

    {/* ── Shared lighting language ────────────────────────────────────────
        One virtual light, upper-left / front-left, for EVERY material.

        These three shades are overlaid on whatever base colour a part
        carries, so a cream PS/2 housing, a nickel USB shell and a black
        GPIO shroud all pick up the same highlight and falloff. That is what
        stops the connector families looking as though they came from
        different illustration libraries — and it means adding a new body
        style costs one colour, not a new gradient.
        ─────────────────────────────────────────────────────────────────── */}
    <linearGradient id="de2b-shade-top" x1="0.08" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.09" />
      <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.01" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.14" />
    </linearGradient>
    {/* Face toward the viewer: catches the light along its top edge only. */}
    <linearGradient id="de2b-shade-front" x1="0" y1="0" x2="0.16" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.14" />
      <stop offset="24%" stopColor="#FFFFFF" stopOpacity="0.02" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
    </linearGradient>
    {/* Left-hand face: turned away from the light, so darker throughout. */}
    <linearGradient id="de2b-shade-side" x1="0" y1="0" x2="0.34" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.06" />
      <stop offset="30%" stopColor="#000000" stopOpacity="0.12" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.44" />
    </linearGradient>
    {/* Soft contact shadow. A gradient, not a blur — no filters on this board. */}
    <radialGradient id="de2b-contact" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#01040A" stopOpacity="0.42" />
      <stop offset="58%" stopColor="#01040A" stopOpacity="0.24" />
      <stop offset="100%" stopColor="#01040A" stopOpacity="0" />
    </radialGradient>

    {/* Ground-pour mesh showing faintly through the mask. */}
    <pattern id="de2b-pour" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
      <rect width="2.2" height="2.2" fill="none" />
      <circle cx="1.1" cy="1.1" r="0.36" fill={PCB.pourSolid} opacity="0.45" />
    </pattern>

    {/* Exposed FR-4 core on the board edge. */}
    <linearGradient id="de2b-core" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stopColor="#D8BC78" />
      <stop offset="45%" stopColor={PCB.core} />
      <stop offset="100%" stopColor={PCB.coreDark} />
    </linearGradient>

    {/* Soft contact shadow for round parts. */}
    <radialGradient id="de2b-ao" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor={PCB.contactShadow} stopOpacity="0.5" />
      <stop offset="55%" stopColor={PCB.contactShadow} stopOpacity="0.28" />
      <stop offset="100%" stopColor={PCB.contactShadow} stopOpacity="0" />
    </radialGradient>

    {/* ── Moulded plastic packages ────────────────────────────────────── */}
    <linearGradient id="de2b-ic" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stopColor="#2E323A" />
      <stop offset="34%" stopColor={IC.top} />
      <stop offset="72%" stopColor={IC.mid} />
      <stop offset="100%" stopColor={IC.dark} />
    </linearGradient>

    {/* Glossy chamfer that runs around a moulded package. */}
    <linearGradient id="de2b-ic-bevel" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stopColor={IC.bevel} stopOpacity="0.95" />
      <stop offset="50%" stopColor={IC.bevel} stopOpacity="0.35" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
    </linearGradient>

    <linearGradient id="de2b-ic-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#22252B" />
      <stop offset="100%" stopColor="#090B0E" />
    </linearGradient>

    {/* ── Metal ───────────────────────────────────────────────────────── */}
    <linearGradient id="de2b-metal" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stopColor="#EDF1F5" />
      <stop offset="26%" stopColor={METAL.bright} />
      <stop offset="62%" stopColor={METAL.mid} />
      <stop offset="100%" stopColor={METAL.dark} />
    </linearGradient>

    {/* Front face of a metal shell: same material, less light. */}
    <linearGradient id="de2b-metal-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={METAL.mid} />
      <stop offset="100%" stopColor={METAL.shadow} />
    </linearGradient>

    <linearGradient id="de2b-metal-dark" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stopColor="#9AA2AC" />
      <stop offset="45%" stopColor={METAL.dark} />
      <stop offset="100%" stopColor={METAL.shadow} />
    </linearGradient>

    {/* Tact-switch body: brushed stainless, lit from the top-left. */}
    <linearGradient id="de2b-tact" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0%" stopColor="#E6EAEF" />
      <stop offset="34%" stopColor={METAL.tact} />
      <stop offset="78%" stopColor={METAL.tactDark} />
      <stop offset="100%" stopColor="#5C636C" />
    </linearGradient>

    {/* Black moulded plunger. */}
    <radialGradient id="de2b-plunger" cx="0.38" cy="0.32" r="0.78">
      <stop offset="0%" stopColor={METAL.plungerLight} />
      <stop offset="52%" stopColor={METAL.plunger} />
      <stop offset="100%" stopColor="#070809" />
    </radialGradient>
    <radialGradient id="de2b-plunger-pressed" cx="0.44" cy="0.44" r="0.74">
      <stop offset="0%" stopColor="#1E2126" />
      <stop offset="100%" stopColor="#050607" />
    </radialGradient>

    {/* ── Gold ────────────────────────────────────────────────────────── */}
    <linearGradient id="de2b-gold" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0%" stopColor={GOLD.light} />
      <stop offset="45%" stopColor={GOLD.base} />
      <stop offset="100%" stopColor={GOLD.dark} />
    </linearGradient>

    {/* ── Slide switch: ivory body, black lever ───────────────────────── */}
    <linearGradient id="de2b-sw-body" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stopColor={SWITCH.bodyLight} />
      <stop offset="48%" stopColor={SWITCH.body} />
      <stop offset="100%" stopColor={SWITCH.bodyDark} />
    </linearGradient>
    <linearGradient id="de2b-sw-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={SWITCH.bodyDark} />
      <stop offset="100%" stopColor={SWITCH.side} />
    </linearGradient>
    <linearGradient id="de2b-lever" x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0%" stopColor={SWITCH.leverDark} />
      <stop offset="34%" stopColor={SWITCH.leverLight} />
      <stop offset="62%" stopColor={SWITCH.lever} />
      <stop offset="100%" stopColor={SWITCH.leverDark} />
    </linearGradient>

    {/* ── Indicator LEDs ──────────────────────────────────────────────── */}
    <radialGradient id="de2b-ledr-on" cx="0.34" cy="0.28" r="0.82">
      <stop offset="0%" stopColor={LED.redCore} />
      <stop offset="30%" stopColor={LED.redOn} />
      <stop offset="100%" stopColor={LED.redEdge} />
    </radialGradient>
    <linearGradient id="de2b-ledr-off" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stopColor={LED.redOff} />
      <stop offset="100%" stopColor={LED.redOffDark} />
    </linearGradient>
    {/* Bloom is deliberately small: a driven LED should read as a bright
        emitter seated on the board, not as a glowing tile. */}
    <radialGradient id="de2b-ledr-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#FF4433" stopOpacity="0.34" />
      <stop offset="34%" stopColor="#FF2A18" stopOpacity="0.1" />
      <stop offset="100%" stopColor="#FF2A18" stopOpacity="0" />
    </radialGradient>

    <radialGradient id="de2b-ledg-on" cx="0.34" cy="0.28" r="0.82">
      <stop offset="0%" stopColor={LED.greenCore} />
      <stop offset="30%" stopColor={LED.greenOn} />
      <stop offset="100%" stopColor={LED.greenEdge} />
    </radialGradient>
    <linearGradient id="de2b-ledg-off" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stopColor={LED.greenOff} />
      <stop offset="100%" stopColor={LED.greenOffDark} />
    </linearGradient>
    <radialGradient id="de2b-ledg-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#46E874" stopOpacity="0.3" />
      <stop offset="34%" stopColor="#25C951" stopOpacity="0.09" />
      <stop offset="100%" stopColor="#25C951" stopOpacity="0" />
    </radialGradient>

    {/* Blue power-rail indicators — not simulated, always lit. */}
    <radialGradient id="de2b-ledb-on" cx="0.34" cy="0.28" r="0.82">
      <stop offset="0%" stopColor={LED.blueCore} />
      <stop offset="32%" stopColor={LED.blueOn} />
      <stop offset="100%" stopColor={LED.blueEdge} />
    </radialGradient>
    <radialGradient id="de2b-ledb-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#5AA8FF" stopOpacity="0.28" />
      <stop offset="40%" stopColor="#2E7FE0" stopOpacity="0.08" />
      <stop offset="100%" stopColor="#2E7FE0" stopOpacity="0" />
    </radialGradient>

    {/* Clear-epoxy lens rim. */}
    <linearGradient id="de2b-led-rim" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stopColor={LED.rimLight} />
      <stop offset="100%" stopColor={LED.rim} />
    </linearGradient>

    {/* ── Seven-segment display: PALE GREY face ───────────────────────── */}
    <linearGradient id="de2b-seg-face" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stopColor={SEVEN_SEG.faceLight} />
      <stop offset="52%" stopColor={SEVEN_SEG.face} />
      <stop offset="100%" stopColor={SEVEN_SEG.faceDark} />
    </linearGradient>
    <linearGradient id="de2b-seg-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={SEVEN_SEG.faceDark} />
      <stop offset="100%" stopColor={SEVEN_SEG.side} />
    </linearGradient>
    {/* The digit's glow belongs INSIDE the package, so the external bloom is
        almost nothing and the light lives in `de2b-seg-recess` instead. */}
    <radialGradient id="de2b-seg-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#FF3D1E" stopOpacity="0.16" />
      <stop offset="50%" stopColor="#FF3D1E" stopOpacity="0.04" />
      <stop offset="100%" stopColor="#FF3D1E" stopOpacity="0" />
    </radialGradient>
    {/* Shallow recess the digit is printed into. */}
    <linearGradient id="de2b-seg-recess" x1="0.1" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stopColor={SEVEN_SEG.recessEdge} />
      <stop offset="45%" stopColor={SEVEN_SEG.recess} />
      <stop offset="100%" stopColor={SEVEN_SEG.recess} />
    </linearGradient>
    {/* Light spilling into the package from the lit segments. */}
    <radialGradient id="de2b-seg-inner" cx="0.5" cy="0.52" r="0.62">
      <stop offset="0%" stopColor="#FF6A3A" stopOpacity="0.2" />
      <stop offset="100%" stopColor="#FF6A3A" stopOpacity="0" />
    </radialGradient>

    {/* ── LCD module ──────────────────────────────────────────────────── */}
    <linearGradient id="de2b-lcd-pcb" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stopColor="#1A6B5E" />
      <stop offset="60%" stopColor={LCD.pcb} />
      <stop offset="100%" stopColor={LCD.pcbDark} />
    </linearGradient>
    <linearGradient id="de2b-lcd-bezel" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stopColor={LCD.bezelLight} />
      <stop offset="100%" stopColor={LCD.bezel} />
    </linearGradient>
    <linearGradient id="de2b-lcd-glass" x1="0.05" y1="0" x2="0.75" y2="1">
      <stop offset="0%" stopColor={LCD.glassLight} />
      <stop offset="55%" stopColor={LCD.glass} />
      <stop offset="100%" stopColor={LCD.glassDark} />
    </linearGradient>

    {/* ── Passives ────────────────────────────────────────────────────── */}
    <linearGradient id="de2b-passive" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stopColor={PASSIVE.bodyLight} />
      <stop offset="100%" stopColor={PASSIVE.body} />
    </linearGradient>
    <radialGradient id="de2b-tantalum" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0%" stopColor={PASSIVE.tantalumLight} />
      <stop offset="55%" stopColor={PASSIVE.tantalum} />
      <stop offset="100%" stopColor={PASSIVE.tantalumDark} />
    </radialGradient>
    <radialGradient id="de2b-can" cx="0.38" cy="0.32" r="0.8">
      <stop offset="0%" stopColor="#5E646E" />
      <stop offset="60%" stopColor={PASSIVE.canTop} />
      <stop offset="100%" stopColor={PASSIVE.canRing} />
    </radialGradient>

    {/* ── Power button ────────────────────────────────────────────────── */}
    <radialGradient id="de2b-button-red" cx="0.34" cy="0.28" r="0.8">
      <stop offset="0%" stopColor="#F88477" />
      <stop offset="36%" stopColor={BUTTON_RED.light} />
      <stop offset="76%" stopColor={BUTTON_RED.base} />
      <stop offset="100%" stopColor={BUTTON_RED.dark} />
    </radialGradient>

    {/* ── Connector plastic ───────────────────────────────────────────── */}
    <linearGradient id="de2b-conn-plastic" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.plasticLight} />
      <stop offset="55%" stopColor={CONNECTOR.plastic} />
      <stop offset="100%" stopColor={CONNECTOR.plasticDark} />
    </linearGradient>

    {/* ── 2.5D substrate walls ───────────────────────────────────────── */}
    <linearGradient id="de2b-slab-front" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#D2B571" />
      <stop offset="30%" stopColor={PCB.core} />
      <stop offset="100%" stopColor="#584521" />
    </linearGradient>
    <linearGradient id="de2b-slab-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={PCB.coreDark} />
      <stop offset="100%" stopColor="#453519" />
    </linearGradient>

    <radialGradient id="de2b-board-shadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#000000" stopOpacity="0.42" />
      <stop offset="58%" stopColor="#000000" stopOpacity="0.16" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
    </radialGradient>
  </defs>
);
