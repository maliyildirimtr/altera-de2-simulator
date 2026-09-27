import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EXAMPLES_LIST } from '../../examples/registry';
import { useI18n } from '../../i18n/I18nProvider';
import { fmt } from '../../i18n/dictionary';
import { Reveal } from './Reveal';

/** Featured example ids, in display order. Tags are read from the registry. */
const FEATURED = ['basic_gates', 'half_adder', 'full_adder', 'mux_2to1', 'decoder_3to8', 'de2_interactive_io', 'de2_lcd_hello'];

/** Compact example list shown before the final call-to-action. */
export function LearningSection() {
  const { d } = useI18n();
  const t = d.examplesStrip;
  const rows = FEATURED.flatMap(id => {
    const example = EXAMPLES_LIST.find(e => e.id === id);
    if (!example) return [];
    const tags = [
      { name: 'DE2', on: example.tools.de2 },
      { name: 'Waveform', on: example.tools.waveform },
      { name: 'Schematic', on: example.tools.schematic },
    ];
    return [{ id, label: t.labels[id] ?? example.title, description: t.descriptions[id] ?? example.description, tags }];
  });

  return (
    <section className="lx-section lx-light lx-examples" aria-labelledby="lx-examples-title">
      <div className="lx-container lx-examples__grid">
        <Reveal className="lx-examples__intro">
          <p className="lx-eyebrow">{t.eyebrow}</p>
          <h2 id="lx-examples-title" className="lx-heading lx-heading--sm">
            {t.title}
          </h2>
          <p className="lx-lead">{fmt(t.lead, { count: EXAMPLES_LIST.length })}</p>
          <Link to="/examples" className="lx-link">
            {t.link}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/exercises" className="lx-link lx-link--secondary" data-testid="landing-exercises-link">
            {t.practiceLink}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </Reveal>

        <Reveal as="ul" className="lx-example-list" delay={80}>
          {rows.map((row, i) => (
            <li key={row.id} className="lx-example-row">
              <span className="lx-mono lx-example-row__index">{String(i + 1).padStart(2, '0')}</span>
              <div className="lx-example-row__text">
                <span className="lx-example-row__name">{row.label}</span>
                <span className="lx-example-row__desc">{row.description}</span>
              </div>
              <span className="lx-example-row__tags">
                {row.tags.map(tag =>
                  tag.on ? (
                    <span key={tag.name} className={`lx-tag lx-mono lx-tag--${tag.name.toLowerCase()}`}>
                      {tag.name}
                    </span>
                  ) : (
                    <span key={tag.name} className="lx-tag lx-tag--empty" aria-hidden="true" />
                  ),
                )}
              </span>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
