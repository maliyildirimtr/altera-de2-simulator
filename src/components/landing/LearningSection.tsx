

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
      className="landing-learning w-full py-20 lg:py-28"
      style={{ background: 'var(--landing-surface-alt)' }}
      aria-labelledby="learning-heading"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — heading */}
          <div>
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: 'var(--landing-accent)' }}
            >
              Philosophy
            </p>
            <h2
              id="learning-heading"
              className="text-3xl sm:text-4xl font-bold leading-tight mb-6"
              style={{ color: 'var(--landing-text)', letterSpacing: '-0.02em' }}
            >
              Built for learning,
              <br />
              not tool&nbsp;imitation.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'var(--landing-text-secondary)' }}>
              Professional EDA tools are powerful — and complex. This platform
              focuses intentionally on the parts that help students understand
              digital logic concepts quickly, without the setup friction or
              feature overload.
            </p>
            <p className="text-base leading-relaxed mt-4" style={{ color: 'var(--landing-text-secondary)' }}>
              The goal is not to replace Quartus, ModelSim, or Vivado. It is
              to make the underlying concepts visible, tangible, and immediately
              interactive.
            </p>
          </div>

          {/* Right — points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {POINTS.map((pt) => (
              <div key={pt.heading} className="flex flex-col gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--landing-surface)', color: 'var(--landing-accent)', border: '1px solid var(--landing-border-subtle)' }}
                >
                  {pt.icon}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold mb-1"
                    style={{ color: 'var(--landing-text)' }}
                  >
                    {pt.heading}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--landing-text-secondary)' }}>
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
