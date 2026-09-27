import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { Reveal } from './Reveal';

const BOARD_SIGNALS = ['SW[17:0]', 'KEY[3:0]', 'LEDR · LEDG', 'HEX0–HEX7', 'LCD'];

export function ProductShowcase() {
  const { d } = useI18n();
  const t = d.showcase;
  return (
    <section className="lx-section lx-light lx-showcase" aria-labelledby="lx-showcase-title">
      <div className="lx-container lx-showcase__grid">
        <Reveal className="lx-showcase__copy">
          <p className="lx-eyebrow">{t.eyebrow}</p>
          <h2 id="lx-showcase-title" className="lx-heading">
            {t.title}
          </h2>
          <p className="lx-lead">{t.lead}</p>

          <dl className="lx-spec">
            {BOARD_SIGNALS.map((signal, i) => (
              <div key={signal} className="lx-spec__row">
                <dt className="lx-mono">{signal}</dt>
                <dd>{t.io[i]}</dd>
              </div>
            ))}
          </dl>

          <ul className="lx-chips" aria-label={t.chipsLabel}>
            {t.chips.map(chip => (
              <li key={chip} className="lx-chip lx-mono">{chip}</li>
            ))}
          </ul>

          <Link to="/de2-simulator" className="lx-link">
            {t.link}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Reveal>

        <Reveal as="figure" className="lx-showcase__visual" delay={90}>
          <div className="lx-showcase__frame">
            <img
              src="/landing/screens/de2-simulator-showcase.webp"
              alt={t.alt}
              width={1775}
              height={1044}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption className="lx-mono lx-showcase__caption">
            <span>{t.captionLeft}</span>
            <span>{t.captionRight}</span>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}
