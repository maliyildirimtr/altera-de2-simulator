
import { Link } from 'react-router-dom';
import { PLATFORM_NAME } from '../../lib/platform';

const PRODUCT_LINKS = [
  { label: 'DE2 Simulator', to: '/de2-simulator' },
  { label: 'Waveform',      to: '/waveform' },
  { label: 'Schematic',     to: '/schematic' },
  { label: 'Examples',      to: '/projects' },
];

export function Footer() {
  return (
    <footer
      className="landing-footer w-full"
      style={{ background: 'var(--landing-navy-deep)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: '#f1f5f9' }}
            >
              {PLATFORM_NAME}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
              Browser-based engineering tools for learning,
              teaching, and simulation.
            </p>
          </div>

          {/* Product links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#334155' }}>
              Product
            </p>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm transition-colors"
                    style={{ color: '#475569' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Project */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#334155' }}>
              Project
            </p>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/maliyildirimtr/altera-de2-simulator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm transition-colors"
                  style={{ color: '#475569' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-xs" style={{ color: '#1e293b' }}>
            {PLATFORM_NAME}
          </p>
          <p className="text-xs" style={{ color: '#1e293b' }}>
            Built for learning
          </p>
        </div>
      </div>
    </footer>
  );
}
