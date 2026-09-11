

/* ─────────────────────────────────────────────────────────────
 * Static mini board mockup — pure CSS/SVG, no simulation code.
 * Shows the DE2 board occupying most of the workspace with
 * surrounding UI chrome collapsed, communicating the "teaching"
 * use case visually without implementing Teaching Mode.
 * ───────────────────────────────────────────────────────────── */
function BoardFocus() {
  const leds   = [true, false, true, true, false, false, true, false];
  const hexes  = ['5', '4', '3', '—', '—', '—'];

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl"
      style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.08)' }}
      aria-hidden="true"
    >
      {/* Simplified top chrome */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: '#0d1627', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/10" />
          <span style={{ color: '#334155', fontSize: '10px', fontFamily: 'monospace' }}>
            DE2 Simulator — Focused View
          </span>
        </div>
        {/* Collapsed panel indicator */}
        <div className="flex gap-1">
          {['Editor', 'Log'].map(lbl => (
            <div
              key={lbl}
              className="rounded px-1.5 py-0.5"
              style={{ background: '#1e2d40', color: '#334155', fontSize: '9px', fontFamily: 'monospace' }}
            >
              {lbl} ›
            </div>
          ))}
        </div>
      </div>

      {/* Board takes full width */}
      <div
        className="p-6"
        style={{ background: '#0a2540' }}
      >
        {/* PCB area */}
        <div
          className="rounded-lg p-5"
          style={{ background: '#0d3b66', border: '1px solid #1a5080' }}
        >
          <div
            className="text-center mb-4"
            style={{ color: '#1e4f7a', fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.12em' }}
          >
            ALTERA DE2 — CYCLONE II FPGA DEVELOPMENT BOARD
          </div>

          {/* LED strip */}
          <div className="mb-4">
            <div style={{ color: '#1e4f7a', fontSize: '8px', fontFamily: 'monospace', marginBottom: '6px' }}>
              LEDR [7..0]
            </div>
            <div className="flex gap-2">
              {leds.map((on, i) => (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: on ? '#ef4444' : '#3b0a0a',
                    boxShadow: on ? '0 0 8px 2px rgba(239,68,68,0.7)' : 'none',
                    flexShrink: 0,
                  }}
                />
              ))}
              {/* Green LEDs */}
              {[false, true, false, true].map((on, i) => (
                <div
                  key={`g${i}`}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: on ? '#22c55e' : '#052e0a',
                    boxShadow: on ? '0 0 8px 2px rgba(34,197,94,0.7)' : 'none',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* HEX displays */}
          <div className="mb-4">
            <div style={{ color: '#1e4f7a', fontSize: '8px', fontFamily: 'monospace', marginBottom: '6px' }}>
              HEX [5..0]
            </div>
            <div className="flex gap-2">
              {hexes.map((d, i) => (
                <div
                  key={i}
                  style={{
                    width: 32,
                    height: 48,
                    background: '#000',
                    border: '1px solid #111',
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: '#dc2626', fontSize: '18px', fontFamily: 'monospace', fontWeight: 700 }}>
                    {d}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Switch row */}
          <div>
            <div style={{ color: '#1e4f7a', fontSize: '8px', fontFamily: 'monospace', marginBottom: '6px' }}>
              SW [17..0]
            </div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => {
                const on = [0, 2, 4].includes(i);
                return (
                  <div
                    key={i}
                    style={{
                      width: 12,
                      height: 20,
                      background: '#050505',
                      border: '1px solid #111',
                      borderRadius: 3,
                      position: 'relative',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: 10,
                        background: '#9ca3af',
                        borderRadius: 2,
                        top: on ? 0 : 10,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div
          className="flex items-center justify-between mt-3 px-1"
          style={{ color: '#1e4f7a', fontSize: '9px', fontFamily: 'monospace' }}
        >
          <span>● Simulation active</span>
          <span>Clock: 50 MHz</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Teaching Section
 * ───────────────────────────────────────────────────────────── */
export function TeachingSection() {
  return (
    <section
      className="landing-teaching w-full py-20 lg:py-28"
      style={{ background: 'var(--landing-navy)' }}
      aria-labelledby="teaching-heading"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left — text */}
          <div>
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: '#60a5fa' }}
            >
              Classroom &amp; Demonstrations
            </p>
            <h2
              id="teaching-heading"
              className="text-3xl sm:text-4xl font-bold leading-tight mb-6"
              style={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}
            >
              Built for explaining
              <br />
              engineering concepts.
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: '#94a3b8' }}>
              When teaching or recording, the workspace can focus entirely on
              the board, schematic, or waveform — hiding panels that are not
              needed for the current explanation.
            </p>
            <ul className="space-y-3">
              {[
                'Large, readable board interface suitable for projectors',
                'Waveform view that makes timing visible at a glance',
                'Gate schematics that explain how logic really works',
                'No terminal, no filesystem, no irrelevant toolchain noise',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: '#2563eb' }}
                    aria-hidden="true"
                  />
                  <span className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — board focused view */}
          <div className="lg:pl-4">
            <BoardFocus />
          </div>

        </div>
      </div>
    </section>
  );
}
