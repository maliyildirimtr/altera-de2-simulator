import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useI18n } from '../../i18n/I18nProvider';

export function Hero() {
  const { d } = useI18n();
  const t = d.hero;
  return (
    <section className="landing-hero landing-hero-product" aria-labelledby="landing-hero-title">
      <div className="landing-hero-product__inner">
        <div className="landing-hero-product__copy">
          <p className="landing-hero-product__eyebrow">{t.eyebrow}</p>

          <h1 id="landing-hero-title" className="landing-hero-product__title">
            <span>{t.title1}</span>
            <span>{t.title2}</span>
          </h1>

          <p className="landing-hero-product__description">{t.description}</p>

          <div className="landing-hero-product__actions">
            <Link className="landing-hero-product__primary" to="/de2-simulator">
              <Play size={15} strokeWidth={2.4} aria-hidden="true" />
              {t.primary}
            </Link>
            <Link className="landing-hero-product__secondary" to="/examples">
              {t.secondary}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <ul className="landing-hero-product__meta" aria-label={t.metaLabel}>
            {t.meta.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <figure className="landing-hero-product__visual">
          <div className="landing-hero-product__board">
            <img
              src="/landing/screens/de2-simulator-hero.webp"
              alt={t.boardAlt}
              width={2048}
              height={925}
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <figcaption className="sr-only">{t.boardCaption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
