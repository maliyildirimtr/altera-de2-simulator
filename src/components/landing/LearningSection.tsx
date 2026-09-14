

const POINTS = [
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    heading: 'Nothing to install',
    body: 'Everything runs in your browser. Open a URL and start writing HDL immediately.',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
        <path d="M3 10h14M10 3v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    heading: 'Fast feedback loop',
    body: 'Compile, run, and observe outputs without leaving the tab. Iteration takes seconds.',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
        <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    heading: 'Visual outputs',
    body: 'LEDs, waveforms, and gate schematics give immediate, tangible feedback on your design.',
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden="true">
        <path d="M5 4h10a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 8l4 4M12 8l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    heading: 'Teaching-friendly',
    body: 'Clean UI designed to be shown on a projector or recorded for video — no cluttered menus.',
  },
];

export function LearningSection() {
  return (
    <section
      className="landing-learning w-full py-16 lg:py-24"
      style={{ background: 'var(--landing-surface)' }}
      aria-labelledby="learning-heading"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Left — heading */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: 4,
                border: '1px solid var(--accent-border)',
                background: 'var(--accent-subtle)',
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  color: 'var(--accent-primary)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Design Philosophy
              </span>
            </div>
            <h2
              id="learning-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-5"
              style={{ color: 'var(--landing-text)' }}
            >
              Built for engineering education,
              <br />
              not tool complexity.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--landing-text-secondary)' }}>
              Traditional EDA environments carry steep setup friction and heavy feature density. Engineering Lab focuses intentionally on making fundamental digital logic and computer engineering concepts immediately understandable.
            </p>
            <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--landing-text-secondary)' }}>
              By connecting source code, timing diagrams, synthesized gate schematics, and virtual board I/O into one browser workstation, students and engineers can iterate and verify behavior in seconds.
            </p>
          </div>

          {/* Right — points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {POINTS.map((pt) => (
              <div
                key={pt.heading}
                className="flex flex-col gap-2.5 p-4 rounded-md border"
                style={{
                  background: 'var(--landing-surface-alt)',
                  borderColor: 'var(--landing-border-subtle)',
                }}
              >
                <div
                  className="w-8 h-8 rounded flex items-center justify-center border"
                  style={{
                    background: 'var(--landing-surface)',
                    color: 'var(--accent-primary)',
                    borderColor: 'var(--landing-border-subtle)',
                  }}
                >
                  {pt.icon}
                </div>
                <div>
                  <h3
                    className="text-xs font-bold mb-1"
                    style={{ color: 'var(--landing-text)' }}
                  >
                    {pt.heading}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--landing-text-secondary)' }}>
                    {pt.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
