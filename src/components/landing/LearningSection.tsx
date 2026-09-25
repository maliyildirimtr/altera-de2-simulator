import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EXAMPLES_LIST } from '../../examples/registry';
import { Reveal } from './Reveal';

/** Featured example ids, in display order. Tags are read from the registry. */
const FEATURED = [
  { id: 'basic_gates', label: 'Basic Logic Gates' },
  { id: 'half_adder', label: 'Half Adder' },
  { id: 'full_adder', label: 'Full Adder' },
  { id: 'mux_2to1', label: 'Multiplexer' },
  { id: 'decoder_3to8', label: 'Decoder' },
  { id: 'de2_interactive_io', label: 'HEX Display & Board I/O' },
  { id: 'de2_lcd_hello', label: 'LCD Hello' },
];

/** Compact example list shown before the final call-to-action. */
export function LearningSection() {
  const rows = FEATURED.flatMap(item => {
    const example = EXAMPLES_LIST.find(e => e.id === item.id);
    if (!example) return [];
    const tags = [
      { name: 'DE2', on: example.tools.de2 },
      { name: 'Waveform', on: example.tools.waveform },
      { name: 'Schematic', on: example.tools.schematic },
    ];
    return [{ ...item, title: example.title, description: example.description, tags }];
  });

  return (
    <section className="lx-section lx-light lx-examples" aria-labelledby="lx-examples-title">
      <div className="lx-container lx-examples__grid">
        <Reveal className="lx-examples__intro">
          <p className="lx-eyebrow">Example library</p>
          <h2 id="lx-examples-title" className="lx-heading lx-heading--sm">
            Start from a working design.
          </h2>
          <p className="lx-lead">
            {EXAMPLES_LIST.length} verified Verilog/SystemVerilog designs, from single gates to
            board-level I/O. Open one, run it, then make it your own.
          </p>
          <Link to="/examples" className="lx-link">
            Explore all examples
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
