import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

interface Tool {
  index: string;
  name: string;
  to: string;
  summary: string;
  screenshot: string;
  alt: string;
  width: number;
  height: number;
  modifier: string;
}

const TOOLS: Tool[] = [
  {
    index: '01',
    name: 'DE2 Simulator',
    to: '/de2-simulator',
    summary: 'Interact with the board directly from your HDL design.',
    screenshot: '/landing/screens/de2-simulator-card.png',
    alt: 'DE2 board close-up with the LCD showing ENGINEERING LAB / HELLO FPGA, HEX displays, LEDs, switches and keys',
    width: 1328,
    height: 553,
    modifier: 'de2',
  },
  {
    index: '02',
    name: 'Waveform',
    to: '/waveform',
    summary: 'Inspect signal transitions across simulation time.',
    screenshot: '/landing/screens/waveform-card.png',
    alt: 'Waveform workspace showing full-adder signals sum, cout, a, b and cin over time',
    width: 1615,
    height: 313,
    modifier: 'waveform',
  },
  {
    index: '03',
    name: 'Schematic',
    to: '/schematic',
    summary: 'Explore synthesized RTL as visual logic.',
    screenshot: '/landing/screens/schematic-card.png',
    alt: 'Synthesized full-adder schematic with XOR, AND and OR gates',
    width: 1856,
    height: 531,
    modifier: 'schematic',
  },
  {
    index: '04',
    name: 'Examples',
    to: '/examples',
    summary: 'Start from verified learning designs.',
    screenshot: '/landing/screens/examples-card.png',
    alt: 'Examples library with Basic Logic Gates, Half Adder, Full Adder, multiplexers and a decoder',
    width: 1260,
    height: 513,
    modifier: 'examples',
  },
];

export function ToolShowcase() {
  return (
    <section className="lx-section lx-dark lx-tools" aria-labelledby="lx-tools-title">
      <div className="lx-container">
        <Reveal className="lx-section-head">
          <div>
            <p className="lx-eyebrow">The workspace</p>
            <h2 id="lx-tools-title" className="lx-heading">
              Four tools.
              <br />
              One workspace.
            </h2>
          </div>
          <p className="lx-lead lx-section-head__aside">
            Each tool covers one phase of the digital design loop and shares the same HDL
            source—from board interaction to timing and synthesized logic.
          </p>
        </Reveal>

        <div className="lx-tools__grid">
          {TOOLS.map((tool, i) => (
            <Reveal
              key={tool.name}
              as="article"
              className={`lx-tool lx-tool--${tool.modifier}`}
              delay={(i % 2) * 80}
            >
              <Link to={tool.to} className="lx-tool__link" aria-label={`Open ${tool.name}`}>
                <header className="lx-tool__head">
                  <span className="lx-mono lx-tool__index">{tool.index}</span>
                  <div className="lx-tool__text">
                    <h3 className="lx-tool__name">{tool.name}</h3>
                    <p className="lx-tool__summary">{tool.summary}</p>
                  </div>
                  <span className="lx-tool__cta">
                    Open
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </header>
                <div className="lx-tool__shot">
                  <img
                    src={tool.screenshot}
                    alt={tool.alt}
                    width={tool.width}
                    height={tool.height}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
