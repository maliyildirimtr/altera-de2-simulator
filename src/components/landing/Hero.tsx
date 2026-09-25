import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const META = ['No installation', 'Verilog / SystemVerilog', 'Virtual DE2', 'Waveform + Schematic'];

export function Hero() {
  return (
    <section className="landing-hero landing-hero-product" aria-labelledby="landing-hero-title">
      <div className="landing-hero-product__inner">
        <div className="landing-hero-product__copy">
          <p className="landing-hero-product__eyebrow">Browser-based FPGA lab</p>

          <h1 id="landing-hero-title" className="landing-hero-product__title">
            <span>Build digital logic.</span>
            <span>See it behave.</span>
          </h1>

          <p className="landing-hero-product__description">
            Write Verilog/SystemVerilog, map your design to a virtual Altera DE2 board, and
            inspect the result with waveforms and synthesized schematics — directly in the
            browser.
          </p>

          <div className="landing-hero-product__actions">
            <Link className="landing-hero-product__primary" to="/de2-simulator">
              <Play size={15} strokeWidth={2.4} aria-hidden="true" />
              Open DE2 Simulator
            </Link>
            <Link className="landing-hero-product__secondary" to="/examples">
              Browse Examples
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <ul className="landing-hero-product__meta" aria-label="Product facts">
            {META.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <figure className="landing-hero-product__visual">
          <div className="landing-hero-product__board">
            <img
              src="/landing/screens/de2-simulator-hero.png"
              alt="Virtual Altera DE2 board with LCD, HEX displays, LEDs, slide switches, push buttons and I/O connectors"
              width={2048}
              height={925}
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <figcaption className="sr-only">
            The Altera DE2 board as rendered in the Logic Lab DE2 Simulator.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
