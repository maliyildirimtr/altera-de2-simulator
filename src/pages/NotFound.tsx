import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

export default function NotFound() {
  const { pathname } = useLocation();
  const { d } = useI18n();
  const LINKS = [
    { to: '/', label: d.notFound.home },
    { to: '/de2-simulator', label: d.nav.de2 },
    { to: '/waveform', label: d.nav.waveform },
    { to: '/schematic', label: d.nav.schematic },
    { to: '/examples', label: d.nav.examples },
    { to: '/exercises', label: d.nav.exercises },
  ];
  const [before, after] = d.notFound.body.split('{path}');
  return (
    <div className="absolute inset-0 overflow-y-auto flex items-center justify-center p-6" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-md w-full" data-testid="not-found">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          404
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          {d.notFound.title}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {before}<code className="font-mono">#{pathname}</code>{after}
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
