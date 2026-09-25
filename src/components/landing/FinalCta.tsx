import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

export function FinalCta() {
  return (
    <section className="lx-cta" aria-labelledby="lx-cta-title">
      <Reveal className="lx-container lx-cta__inner">
        <div>
          <h2 id="lx-cta-title" className="lx-heading">Ready to simulate?</h2>
          <p className="lx-lead">
            Open Engineering Lab and start with a working example or your own HDL.
          </p>
        </div>
        <div className="lx-cta__actions">
          <Link className="landing-hero-product__primary" to="/de2-simulator">
            <Play size={16} strokeWidth={2.5} aria-hidden="true" />
            Open DE2 Simulator
          </Link>
          <Link className="landing-hero-product__secondary" to="/examples">
            Explore Examples
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
