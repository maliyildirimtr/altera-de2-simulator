import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { Reveal } from './Reveal';

export function FinalCta() {
  const { d } = useI18n();
  const t = d.cta;
  return (
    <section className="lx-cta" aria-labelledby="lx-cta-title">
      <Reveal className="lx-container lx-cta__inner">
        <div>
          <h2 id="lx-cta-title" className="lx-heading">{t.title}</h2>
          <p className="lx-lead">{t.lead}</p>
        </div>
        <div className="lx-cta__actions">
          <Link className="landing-hero-product__primary" to="/de2-simulator">
            <Play size={16} strokeWidth={2.5} aria-hidden="true" />
            {t.primary}
          </Link>
          <Link className="landing-hero-product__secondary" to="/examples">
            {t.secondary}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
