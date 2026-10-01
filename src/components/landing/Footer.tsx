import { Link } from 'react-router-dom';
import { PLATFORM_NAME } from '../../lib/platform';
import { useI18n } from '../../i18n/I18nProvider';

export function Footer() {
  const { d } = useI18n();
  const t = d.footer;
  const toolLinks = [
    { label: d.nav.de2, to: '/de2-simulator' },
    { label: d.nav.waveform, to: '/waveform' },
    { label: d.nav.schematic, to: '/schematic' },
  ];
  const resourceLinks = [
    { label: d.nav.examples, to: '/examples' },
    { label: d.nav.exercises, to: '/exercises' },
    { label: d.nav.digitalLogic, to: '/digital-logic' },
    { label: d.nav.fpga, to: '/fpga' },
  ];

  return (
    <footer className="lx-footer">
      <div className="lx-container">
        <div className="lx-footer__grid">
          <div className="lx-footer__brand">
            <p className="lx-footer__name">{PLATFORM_NAME}</p>
            <p className="lx-footer__tagline">{t.tagline}</p>
          </div>

          <nav aria-label={t.tools}>
            <p className="lx-mono lx-footer__label">{t.tools}</p>
            <ul>
              {toolLinks.map(link => (
                <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t.resources}>
            <p className="lx-mono lx-footer__label">{t.resources}</p>
            <ul>
              {resourceLinks.map(link => (
                <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t.project}>
            <p className="lx-mono lx-footer__label">{t.project}</p>
            <ul>
              <li>
                <a
                  href="https://github.com/maliyildirimtr/altera-de2-simulator"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="lx-footer__bottom lx-mono">
          <span>{PLATFORM_NAME} — {t.bottom}</span>
          <span>Altera DE2 · Cyclone II EP2C35</span>
        </div>

        {/* SEO: Semantically meaningful description — visible to crawlers and screen readers */}
        <p className="sr-only">
          Logic Lab is a free, browser-based digital logic simulation platform featuring a virtual Altera DE2 FPGA board
          (Cyclone II EP2C35). Write Verilog or SystemVerilog HDL code, compile and run it on the virtual DE2 board with
          18 slide switches, 4 push buttons, 18 red LEDs, 9 green LEDs, eight 7-segment HEX displays, and a 16×2
          character LCD. Inspect signal timing with the waveform viewer (Icarus Verilog) and explore synthesized RTL
          schematics (Yosys). Design logic circuits visually with the gate editor, draw Moore/Mealy finite state machines
          (FSM) and generate Verilog automatically, minimize Boolean functions with Karnaugh maps, and practice number
          system conversions (binary, hexadecimal, two&apos;s complement). Includes step-by-step digital logic lessons,
          auto-graded Verilog exercises, and a quiz mode. Ideal for university students learning digital design,
          computer engineering courses, and FPGA-based laboratory assignments — no installation required.
        </p>
      </div>
    </footer>
  );
}
