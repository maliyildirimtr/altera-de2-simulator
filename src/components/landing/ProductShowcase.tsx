import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

const BOARD_IO = [
  { signal: 'SW[17:0]', label: '18 slide switches' },
  { signal: 'KEY[3:0]', label: '4 push buttons, active-low' },
  { signal: 'LEDR · LEDG', label: '18 red and 9 green LEDs' },
  { signal: 'HEX0–HEX7', label: 'Eight 7-segment displays' },
  { signal: 'LCD', label: '16×2 character display' },
];

const WORKFLOW_CHIPS = ['QSF pin mapping', 'CLOCK_50', 'Compile → Ready → Run'];

export function ProductShowcase() {
  return (
    <section className="lx-section lx-light lx-showcase" aria-labelledby="lx-showcase-title">
      <div className="lx-container lx-showcase__grid">
        <Reveal className="lx-showcase__copy">
          <p className="lx-eyebrow">Virtual hardware · Altera DE2</p>
          <h2 id="lx-showcase-title" className="lx-heading">
            A virtual DE2 board that behaves like hardware.
          </h2>
          <p className="lx-lead">
            Load your design, map its ports to the board, and drive it with the same switches,
            buttons and displays you would use on the bench—without cables, drivers or a
            physical FPGA.
          </p>

          <dl className="lx-spec">
            {BOARD_IO.map(row => (
              <div key={row.signal} className="lx-spec__row">
                <dt className="lx-mono">{row.signal}</dt>
                <dd>{row.label}</dd>
              </div>
            ))}
          </dl>

          <ul className="lx-chips" aria-label="Simulator workflow">
            {WORKFLOW_CHIPS.map(chip => (
              <li key={chip} className="lx-chip lx-mono">{chip}</li>
            ))}
          </ul>

          <Link to="/de2-simulator" className="lx-link">
            Open DE2 Simulator
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Reveal>

        <Reveal as="figure" className="lx-showcase__visual" delay={90}>
          <div className="lx-showcase__frame">
            <img
              src="/landing/screens/de2-simulator-showcase.png"
              alt="DE2 Simulator workspace: project sidebar, virtual DE2 board, and inspector with pin mapping and clock controls"
              width={1775}
              height={1044}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption className="lx-mono lx-showcase__caption">
            <span>DE2 Simulator</span>
            <span>Project · Board · Inspector</span>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}
