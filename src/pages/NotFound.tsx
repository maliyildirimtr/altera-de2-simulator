import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/de2-simulator', label: 'DE2 Simulator' },
  { to: '/waveform', label: 'Waveform' },
  { to: '/schematic', label: 'Schematic' },
  { to: '/examples', label: 'Examples' },
];

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="absolute inset-0 overflow-y-auto flex items-center justify-center p-6" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-md w-full" data-testid="not-found">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          404
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          Page not found
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          There is no page at <code className="font-mono">#{pathname}</code>. Pick a tool instead:
        </p>
        <ul className="flex flex-wrap gap-2">
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="inline-flex px-3 py-1.5 rounded-[4px] border text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
