import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { fmt } from '../../i18n/dictionary';
import { Reveal } from './Reveal';

interface Tool {
  index: string;
  key: 'de2' | 'waveform' | 'schematic' | 'examples';
  to: string;
  screenshot: string;
  width: number;
  height: number;
  modifier: string;
}

const TOOLS: Tool[] = [
  {
    index: '01',
    key: 'de2',
    to: '/de2-simulator',
    screenshot: '/landing/screens/de2-board-io.webp',
    width: 1112,
    height: 507,
    modifier: 'de2',
  },
  {
    index: '02',
    key: 'waveform',
    to: '/waveform',
    screenshot: '/landing/screens/waveform-v2.webp',
    width: 2171,
    height: 724,
    modifier: 'waveform',
  },
  {
    index: '03',
    key: 'schematic',
    to: '/schematic',
    screenshot: '/landing/screens/schematic-v2.webp',
    width: 1672,
    height: 941,
    modifier: 'schematic',
  },
  {
    index: '04',
    key: 'examples',
    to: '/examples',
    screenshot: '/landing/screens/examples-card.webp',
    width: 1260,
    height: 513,
    modifier: 'examples',
  },
];

export function ToolShowcase() {
  const { d } = useI18n();
  const t = d.tools;
  return (
    <section className="lx-section lx-dark lx-tools" aria-labelledby="lx-tools-title">
      <div className="lx-container">
        <Reveal className="lx-section-head">
          <div>
            <p className="lx-eyebrow">{t.eyebrow}</p>
            <h2 id="lx-tools-title" className="lx-heading">
              {t.title1}
              <br />
              {t.title2}
            </h2>
          </div>
          <p className="lx-lead lx-section-head__aside">{t.lead}</p>
        </Reveal>

        <div className="lx-tools__grid">
          {TOOLS.map((tool, i) => {
            const item = t.items[tool.key];
            return (
            <Reveal
              key={tool.key}
              as="article"
              className={`lx-tool lx-tool--${tool.modifier}`}
              delay={(i % 2) * 80}
            >
              <Link to={tool.to} className="lx-tool__link" aria-label={fmt(t.openLabel, { name: item.name })}>
                <header className="lx-tool__head">
                  <span className="lx-mono lx-tool__index">{tool.index}</span>
                  <div className="lx-tool__text">
                    <h3 className="lx-tool__name">{item.name}</h3>
                    <p className="lx-tool__summary">{item.summary}</p>
                  </div>
                  <span className="lx-tool__cta">
                    {t.open}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </header>
                <div className="lx-tool__shot">
                  <img
                    src={tool.screenshot}
                    alt={item.alt}
                    width={tool.width}
                    height={tool.height}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </Link>
            </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
