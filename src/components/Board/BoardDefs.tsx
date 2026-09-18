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
  JACK,
  JACK_DARK,
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
    <linearGradient id="de2b-pcb" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stopColor={PCB.light} />
      <stop offset="35%" stopColor={PCB.base} />
      <stop offset="100%" stopColor={PCB.dark} />
    </linearGradient>

    {/* Semi-gloss mask sheen: a broad diagonal sweep from top-left, not a highlight blob. */}
    <linearGradient id="de2b-pcb-sheen" x1="0" y1="0" x2="1" y2="0.9">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.045" />
      <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.015" />
      <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.003" />
      <stop offset="75%" stopColor="#000000" stopOpacity="0.04" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
    </linearGradient>

    <radialGradient id="de2b-pcb-vignette" cx="0.38" cy="0.3" r="0.88">
      <stop offset="0%" stopColor="#000000" stopOpacity="0" />
      <stop offset="55%" stopColor="#000000" stopOpacity="0.035" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.17" />
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
    <linearGradient id="de2b-shade-top" x1="0.06" y1="0" x2="0.92" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
      <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.008" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
    </linearGradient>
    {/* Face toward the viewer: catches the light along its top edge only. */}
    <linearGradient id="de2b-shade-front" x1="0" y1="0" x2="0.14" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
      <stop offset="22%" stopColor="#FFFFFF" stopOpacity="0.018" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
    </linearGradient>
    {/* Left-hand face: turned away from the light, so darker throughout. */}
    <linearGradient id="de2b-shade-side" x1="0" y1="0" x2="0.32" y2="1">
      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.05" />
      <stop offset="28%" stopColor="#000000" stopOpacity="0.1" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
    </linearGradient>
    {/* Soft contact shadow. A gradient, not a blur — no filters on this board. */}
    <radialGradient id="de2b-contact" cx="0.52" cy="0.54" r="0.5">
      <stop offset="0%" stopColor="#01040A" stopOpacity="0.38" />
      <stop offset="55%" stopColor="#01040A" stopOpacity="0.22" />
      <stop offset="100%" stopColor="#01040A" stopOpacity="0" />
    </radialGradient>

    {/* Ground-pour mesh showing faintly through the mask. */}
    <pattern id="de2b-pour" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
      <rect width="2.2" height="2.2" fill="none" />
      <circle cx="1.1" cy="1.1" r="0.36" fill={PCB.pourSolid} opacity="0.4" />
    </pattern>

    {/* Exposed FR-4 core on the board edge. */}
    <linearGradient id="de2b-core" x1="0" y1="0" x2="0.28" y2="1">
      <stop offset="0%" stopColor="#D8BC78" />
      <stop offset="42%" stopColor={PCB.core} />
      <stop offset="100%" stopColor={PCB.coreDark} />
    </linearGradient>

    {/* Soft contact shadow for round parts. */}
    <radialGradient id="de2b-ao" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor={PCB.contactShadow} stopOpacity="0.45" />
      <stop offset="55%" stopColor={PCB.contactShadow} stopOpacity="0.25" />
      <stop offset="100%" stopColor={PCB.contactShadow} stopOpacity="0" />
    </radialGradient>

    {/* ── Moulded plastic packages ────────────────────────────────────── */}
    <linearGradient id="de2b-ic" x1="0.08" y1="0" x2="0.92" y2="1">
      <stop offset="0%" stopColor="#2E323A" />
      <stop offset="32%" stopColor={IC.top} />
      <stop offset="70%" stopColor={IC.mid} />
      <stop offset="100%" stopColor={IC.dark} />
    </linearGradient>

    {/* Glossy chamfer that runs around a moulded package. */}
    <linearGradient id="de2b-ic-bevel" x1="0" y1="0" x2="0.58" y2="1">
      <stop offset="0%" stopColor={IC.bevel} stopOpacity="0.9" />
      <stop offset="48%" stopColor={IC.bevel} stopOpacity="0.32" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0.48" />
    </linearGradient>

    <linearGradient id="de2b-ic-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#22252B" />
      <stop offset="100%" stopColor="#090B0E" />
    </linearGradient>

    {/* ── Metal ───────────────────────────────────────────────────────── */}
    {/* Brushed nickel — USB shells, SD shield, RCA barrel, D-sub hoods */}
    <linearGradient id="de2b-metal" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0%" stopColor={METAL.brushedLight} />
      <stop offset="24%" stopColor={METAL.brushed} />
      <stop offset="60%" stopColor={METAL.mid} />
      <stop offset="100%" stopColor={METAL.dark} />
    </linearGradient>

    {/* Front face of a metal shell: same material, less light. */}
    <linearGradient id="de2b-metal-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={METAL.mid} />
      <stop offset="100%" stopColor={METAL.shadow} />
    </linearGradient>

    <linearGradient id="de2b-metal-dark" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.dsubHoodLight} />
      <stop offset="42%" stopColor={CONNECTOR.dsubHood} />
      <stop offset="100%" stopColor={CONNECTOR.dsubHoodDark} />
    </linearGradient>

    {/* Tact-switch body: brushed stainless, lit from the top-left. */}
    <linearGradient id="de2b-tact" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stopColor="#E6EAEF" />
      <stop offset="32%" stopColor={METAL.tact} />
      <stop offset="76%" stopColor={METAL.tactDark} />
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
    <linearGradient id="de2b-gold" x1="0" y1="0" x2="0.52" y2="1">
      <stop offset="0%" stopColor={GOLD.light} />
      <stop offset="42%" stopColor={GOLD.base} />
      <stop offset="100%" stopColor={GOLD.dark} />
    </linearGradient>

    {/* Gold immersion pad seen edge-on (2.5D header pins). */}
    <linearGradient id="de2b-gold-edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={GOLD.base} />
      <stop offset="100%" stopColor={GOLD.edge} />
    </linearGradient>

    {/* ── Slide switch: ivory body, black lever ───────────────────────── */}
    <linearGradient id="de2b-sw-body" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0%" stopColor={SWITCH.bodyLight} />
      <stop offset="46%" stopColor={SWITCH.body} />
      <stop offset="100%" stopColor={SWITCH.bodyDark} />
    </linearGradient>
    <linearGradient id="de2b-sw-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={SWITCH.bodyDark} />
      <stop offset="100%" stopColor={SWITCH.side} />
    </linearGradient>
    <linearGradient id="de2b-lever" x1="0" y1="0" x2="1" y2="0.28">
      <stop offset="0%" stopColor={SWITCH.leverDark} />
      <stop offset="32%" stopColor={SWITCH.leverLight} />
      <stop offset="60%" stopColor={SWITCH.lever} />
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
      <stop offset="0%" stopColor="#FF4433" stopOpacity="0.32" />
      <stop offset="34%" stopColor="#FF2A18" stopOpacity="0.09" />
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
      <stop offset="0%" stopColor="#46E874" stopOpacity="0.28" />
      <stop offset="34%" stopColor="#25C951" stopOpacity="0.08" />
      <stop offset="100%" stopColor="#25C951" stopOpacity="0" />
    </radialGradient>

    {/* Blue power-rail indicators — not simulated, always lit. */}
    <radialGradient id="de2b-ledb-on" cx="0.34" cy="0.28" r="0.82">
      <stop offset="0%" stopColor={LED.blueCore} />
      <stop offset="32%" stopColor={LED.blueOn} />
      <stop offset="100%" stopColor={LED.blueEdge} />
    </radialGradient>
    <radialGradient id="de2b-ledb-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#5AA8FF" stopOpacity="0.26" />
      <stop offset="40%" stopColor="#2E7FE0" stopOpacity="0.07" />
      <stop offset="100%" stopColor="#2E7FE0" stopOpacity="0" />
    </radialGradient>

    {/* Clear-epoxy lens rim. */}
    <linearGradient id="de2b-led-rim" x1="0" y1="0" x2="0.38" y2="1">
      <stop offset="0%" stopColor={LED.rimLight} />
      <stop offset="100%" stopColor={LED.rim} />
    </linearGradient>

    {/* ── Seven-segment display: PALE GREY face ───────────────────────── */}
    <linearGradient id="de2b-seg-face" x1="0.08" y1="0" x2="0.92" y2="1">
      <stop offset="0%" stopColor={SEVEN_SEG.faceLight} />
      <stop offset="50%" stopColor={SEVEN_SEG.face} />
      <stop offset="100%" stopColor={SEVEN_SEG.faceDark} />
    </linearGradient>
    <linearGradient id="de2b-seg-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={SEVEN_SEG.faceDark} />
      <stop offset="100%" stopColor={SEVEN_SEG.side} />
    </linearGradient>
    {/* The digit's glow belongs INSIDE the package, so the external bloom is
        almost nothing and the light lives in `de2b-seg-recess` instead. */}
    <radialGradient id="de2b-seg-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#FF3D1E" stopOpacity="0.14" />
      <stop offset="50%" stopColor="#FF3D1E" stopOpacity="0.035" />
      <stop offset="100%" stopColor="#FF3D1E" stopOpacity="0" />
    </radialGradient>
    {/* Shallow recess the digit is printed into. */}
    <linearGradient id="de2b-seg-recess" x1="0.08" y1="0" x2="0.88" y2="1">
      <stop offset="0%" stopColor={SEVEN_SEG.recessEdge} />
      <stop offset="42%" stopColor={SEVEN_SEG.recess} />
      <stop offset="100%" stopColor={SEVEN_SEG.recess} />
    </linearGradient>
    {/* Light spilling into the package from the lit segments. */}
    <radialGradient id="de2b-seg-inner" cx="0.5" cy="0.52" r="0.62">
      <stop offset="0%" stopColor="#FF6A3A" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#FF6A3A" stopOpacity="0" />
    </radialGradient>

    {/* ── LCD module ──────────────────────────────────────────────────── */}
    <linearGradient id="de2b-lcd-pcb" x1="0" y1="0" x2="0.28" y2="1">
      <stop offset="0%" stopColor="#1A6B5E" />
      <stop offset="58%" stopColor={LCD.pcb} />
      <stop offset="100%" stopColor={LCD.pcbDark} />
    </linearGradient>
    <linearGradient id="de2b-lcd-bezel" x1="0" y1="0" x2="0.18" y2="1">
      <stop offset="0%" stopColor={LCD.bezelLight} />
      <stop offset="100%" stopColor={LCD.bezel} />
    </linearGradient>
    <linearGradient id="de2b-lcd-glass" x1="0.04" y1="0" x2="0.72" y2="1">
      <stop offset="0%" stopColor={LCD.glassLight} />
      <stop offset="52%" stopColor={LCD.glass} />
      <stop offset="100%" stopColor={LCD.glassDark} />
    </linearGradient>

    {/* ── Passives ────────────────────────────────────────────────────── */}
    <linearGradient id="de2b-passive" x1="0" y1="0" x2="0.28" y2="1">
      <stop offset="0%" stopColor={PASSIVE.bodyLight} />
      <stop offset="100%" stopColor={PASSIVE.body} />
    </linearGradient>
    <radialGradient id="de2b-tantalum" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0%" stopColor={PASSIVE.tantalumLight} />
      <stop offset="52%" stopColor={PASSIVE.tantalum} />
      <stop offset="100%" stopColor={PASSIVE.tantalumDark} />
    </radialGradient>
    <radialGradient id="de2b-can" cx="0.38" cy="0.32" r="0.8">
      <stop offset="0%" stopColor="#5E646E" />
      <stop offset="58%" stopColor={PASSIVE.canTop} />
      <stop offset="100%" stopColor={PASSIVE.canRing} />
    </radialGradient>

    {/* ── Power button ────────────────────────────────────────────────── */}
    <radialGradient id="de2b-button-red" cx="0.34" cy="0.28" r="0.8">
      <stop offset="0%" stopColor="#F88477" />
      <stop offset="34%" stopColor={BUTTON_RED.light} />
      <stop offset="74%" stopColor={BUTTON_RED.base} />
      <stop offset="100%" stopColor={BUTTON_RED.dark} />
    </radialGradient>

    {/* ── Connector plastic ───────────────────────────────────────────── */}
    <linearGradient id="de2b-conn-plastic" x1="0.08" y1="0" x2="0.92" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.plasticLight} />
      <stop offset="52%" stopColor={CONNECTOR.plastic} />
      <stop offset="100%" stopColor={CONNECTOR.plasticDark} />
    </linearGradient>

    {/* USB shell — brushed nickel */}
    <linearGradient id="de2b-usb-shell" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.usbShellLight} />
      <stop offset="22%" stopColor={CONNECTOR.usbShell} />
      <stop offset="58%" stopColor={CONNECTOR.usbShellDark} />
      <stop offset="100%" stopColor="#4A5158" />
    </linearGradient>
    <linearGradient id="de2b-usb-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.usbShell} />
      <stop offset="100%" stopColor={CONNECTOR.usbShellDark} />
    </linearGradient>

    {/* D-sub hood (VGA, RS-232) — subdued metal */}
    <linearGradient id="de2b-dsub-hood" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.dsubHoodLight} />
      <stop offset="40%" stopColor={CONNECTOR.dsubHood} />
      <stop offset="100%" stopColor={CONNECTOR.dsubHoodDark} />
    </linearGradient>
    <linearGradient id="de2b-dsub-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.dsubHood} />
      <stop offset="100%" stopColor={CONNECTOR.dsubHoodDark} />
    </linearGradient>

    {/* Ethernet RJ45 shell */}
    <linearGradient id="de2b-rj45-shell" x1="0.08" y1="0" x2="0.92" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.rj45ShellLight} />
      <stop offset="50%" stopColor={CONNECTOR.rj45Shell} />
      <stop offset="100%" stopColor={CONNECTOR.rj45ShellDark} />
    </linearGradient>

    {/* PS/2 mini-DIN — cream plastic */}
    <linearGradient id="de2b-ps2-body" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stopColor="#F0ECE3" />
      <stop offset="48%" stopColor={CONNECTOR.ps2Body} />
      <stop offset="100%" stopColor={CONNECTOR.ps2BodyDark} />
    </linearGradient>
    <linearGradient id="de2b-ps2-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.ps2BodyDark} />
      <stop offset="100%" stopColor="#080A0D" />
    </linearGradient>

    {/* Audio jacks — coloured plastic housings */}
    <radialGradient id="de2b-jack-pink" cx="0.38" cy="0.32" r="0.78">
      <stop offset="0%" stopColor="#F5B8D1" />
      <stop offset="55%" stopColor={JACK['jack-pink']} />
      <stop offset="100%" stopColor={JACK_DARK['jack-pink']} />
    </radialGradient>
    <radialGradient id="de2b-jack-blue" cx="0.38" cy="0.32" r="0.78">
      <stop offset="0%" stopColor="#A8D8F0" />
      <stop offset="55%" stopColor={JACK['jack-blue']} />
      <stop offset="100%" stopColor={JACK_DARK['jack-blue']} />
    </radialGradient>
    <radialGradient id="de2b-jack-green" cx="0.38" cy="0.32" r="0.78">
      <stop offset="0%" stopColor="#B8E5A8" />
      <stop offset="55%" stopColor={JACK['jack-green']} />
      <stop offset="100%" stopColor={JACK_DARK['jack-green']} />
    </radialGradient>
    <radialGradient id="de2b-jack-cream" cx="0.38" cy="0.32" r="0.78">
      <stop offset="0%" stopColor="#F0ECE3" />
      <stop offset="55%" stopColor={JACK['jack-cream']} />
      <stop offset="100%" stopColor={JACK_DARK['jack-cream']} />
    </radialGradient>

    {/* RCA barrel — nickel plated */}
    <radialGradient id="de2b-rca-barrel" cx="0.38" cy="0.32" r="0.78">
      <stop offset="0%" stopColor={METAL.brushedLight} />
      <stop offset="52%" stopColor={METAL.brushed} />
      <stop offset="100%" stopColor={METAL.dark} />
    </radialGradient>

    {/* Barrel jack — black plastic */}
    <radialGradient id="de2b-barrel-jack" cx="0.38" cy="0.32" r="0.78">
      <stop offset="0%" stopColor={CONNECTOR.plasticLight} />
      <stop offset="55%" stopColor={CONNECTOR.plastic} />
      <stop offset="100%" stopColor={CONNECTOR.plasticDark} />
    </radialGradient>

    {/* Header shroud — black plastic with gold pin field */}
    <linearGradient id="de2b-header-shroud" x1="0.08" y1="0" x2="0.92" y2="1">
      <stop offset="0%" stopColor={CONNECTOR.plasticLight} />
      <stop offset="52%" stopColor={CONNECTOR.plastic} />
      <stop offset="100%" stopColor={CONNECTOR.plasticDark} />
    </linearGradient>

    {/* ── 2.5D substrate walls ───────────────────────────────────────── */}
    <linearGradient id="de2b-slab-front" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#D2B571" />
      <stop offset="28%" stopColor={PCB.core} />
      <stop offset="100%" stopColor="#584521" />
    </linearGradient>
    <linearGradient id="de2b-slab-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={PCB.coreDark} />
      <stop offset="100%" stopColor="#453519" />
    </linearGradient>

    <radialGradient id="de2b-board-shadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stopColor="#000000" stopOpacity="0.38" />
      <stop offset="58%" stopColor="#000000" stopOpacity="0.14" />
      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
    </radialGradient>
  </defs>
);