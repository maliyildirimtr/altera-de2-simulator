import { Link } from 'react-router-dom';
import { PLATFORM_NAME } from '../../lib/platform';

const TOOL_LINKS = [
  { label: 'DE2 Simulator', to: '/de2-simulator' },
  { label: 'Waveform', to: '/waveform' },
  { label: 'Schematic', to: '/schematic' },
];

const RESOURCE_LINKS = [
  { label: 'Examples', to: '/examples' },
  { label: 'Digital Logic', to: '/digital-logic' },
  { label: 'FPGA', to: '/fpga' },
];

export function Footer() {
  return (
    <footer className="lx-footer">
      <div className="lx-container">
        <div className="lx-footer__grid">
          <div className="lx-footer__brand">
            <p className="lx-footer__name">{PLATFORM_NAME}</p>
            <p className="lx-footer__tagline">
              Browser-based tools for learning, teaching and simulating digital hardware.
            </p>
          </div>

          <nav aria-label="Tools">
            <p className="lx-mono lx-footer__label">Tools</p>
            <ul>
              {TOOL_LINKS.map(link => (
                <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Resources">
            <p className="lx-mono lx-footer__label">Resources</p>
            <ul>
              {RESOURCE_LINKS.map(link => (
                <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Project">
            <p className="lx-mono lx-footer__label">Project</p>
            <ul>
              <li>
                <a
                  href="https://github.com/maliyildirimtr/altera-de2-simulator"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="lx-footer__bottom lx-mono">
          <span>{PLATFORM_NAME} — Browser-Based Digital Engineering</span>
          <span>Altera DE2 · Cyclone II EP2C35</span>
        </div>
      </div>
    </footer>
  );
}
