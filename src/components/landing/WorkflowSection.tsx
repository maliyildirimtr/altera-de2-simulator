import { useI18n } from '../../i18n/I18nProvider';
import { Reveal } from './Reveal';

export function WorkflowSection() {
  const { d } = useI18n();
  const t = d.workflow;
  return (
    <section className="lx-section lx-light lx-light--alt lx-workflow" aria-labelledby="lx-workflow-title">
      <div className="lx-container">
        <Reveal className="lx-section-head">
          <div>
            <p className="lx-eyebrow">{t.eyebrow}</p>
            <h2 id="lx-workflow-title" className="lx-heading">
              {t.title1}
              <br />
              {t.title2}
            </h2>
          </div>
          <p className="lx-lead lx-section-head__aside">{t.lead}</p>
        </Reveal>

        <Reveal as="ol" className="lx-flow" delay={80}>
          {t.steps.map((step, i) => (
            <li key={i} className="lx-flow__step">
              <div className="lx-flow__marker" aria-hidden="true">
                <span className="lx-flow__node">{String(i + 1).padStart(2, '0')}</span>
                {i < t.steps.length - 1 && <span className="lx-flow__connector" />}
              </div>
              <div className="lx-flow__body">
                <h3 className="lx-flow__title">{step.title}</h3>
                <p className="lx-flow__detail">{step.detail}</p>
                <p className="lx-mono lx-flow__artifact">{step.artifact}</p>
              </div>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
