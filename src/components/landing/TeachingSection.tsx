import { useI18n } from '../../i18n/I18nProvider';
import { Reveal } from './Reveal';

export function TeachingSection() {
  const { d } = useI18n();
  const t = d.teaching;
  return (
    <section className="lx-section lx-dark lx-teaching" aria-labelledby="lx-teaching-title">
      <div className="lx-container lx-teaching__grid">
        <Reveal className="lx-teaching__copy">
          <p className="lx-eyebrow">{t.eyebrow}</p>
          <h2 id="lx-teaching-title" className="lx-heading lx-heading--stack">
            <span>{t.title1}</span>
            <span>{t.title2}</span>
            <span className="lx-accent-text">{t.title3}</span>
          </h2>
          <p className="lx-lead">{t.lead}</p>
          <ul className="lx-uses">
            {t.uses.map((use, i) => (
              <li key={use}>
                <span className="lx-mono">{String(i + 1).padStart(2, '0')}</span>
                {use}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="figure" className="lx-teaching__visual" delay={90}>
          <div className="lx-teaching__frame">
            <img
              src="/landing/screens/de2-demonstration-v2.webp"
              alt={t.alt}
              width={1640}
              height={887}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption className="lx-mono lx-teaching__caption">
            <span>{t.captionLeft}</span>
            <span>{t.captionRight}</span>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}
