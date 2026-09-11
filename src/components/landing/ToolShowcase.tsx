
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
 * Inline mini-visuals — static SVG, no simulation imports
 * ───────────────────────────────────────────────────────────── */

/** DE2 Simulator card visual — mini PCB with LEDs */
function DE2Visual() {
  const reds   = [true, false, true, false, false, false, false, false];
  const greens = [false, true, false, true];
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: '#0d3b66', border: '1px solid #1a5080' }}
      aria-hidden="true"
    >
      <p style={{ color: '#1e4f7a', fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: '8px' }}>
        DE2 — CYCLONE II
      </p>
      <div className="flex gap-1.5 mb-2">
        {reds.map((on, i) => (
          <div
            key={i}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: on ? '#ef4444' : '#3b0a0a',
              boxShadow: on ? '0 0 5px rgba(239,68,68,0.7)' : 'none',
            }}
          />
        ))}
        {greens.map((on, i) => (
          <div
            key={i}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: on ? '#22c55e' : '#052e0a',
              boxShadow: on ? '0 0 5px rgba(34,197,94,0.7)' : 'none',
            }}
          />
        ))}
      </div>
      <div className="flex gap-1">
        {['A', '3', '—', '—'].map((d, i) => (
          <div
            key={i}
            style={{
              width: 20, height: 28, background: '#000',
              border: '1px solid #111', borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ color: '#dc2626', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700 }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Waveform card visual — inline SVG timing diagram */
function WaveformVisual() {
  const sigs = [
    { name: 'CLK', path: 'M0,7 L8,7 L8,2 L16,2 L16,7 L24,7 L24,2 L32,2 L32,7 L40,7 L40,2 L48,2 L48,7 L56,7 L56,2 L64,2 L64,7 L72,7 L72,2 L80,2 L80,7 L88,7', color: '#60a5fa' },
    { name: 'A  ', path: 'M0,7 L32,7 L32,2 L88,2', color: '#34d399' },
    { name: 'B  ', path: 'M0,7 L16,7 L16,2 L88,2', color: '#34d399' },
    { name: 'S  ', path: 'M0,7 L16,7 L16,2 L32,2 L32,7 L88,7', color: '#fb923c' },
  ];
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: '#080c12', border: '1px solid rgba(255,255,255,0.06)' }}
      aria-hidden="true"
    >
      <p style={{ color: '#1e3a5a', fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: '8px' }}>
        WAVEFORM
      </p>
      <div className="space-y-1.5">
        {sigs.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span style={{ color: '#334155', fontSize: '8px', fontFamily: 'monospace', width: '20px', flexShrink: 0 }}>{s.name}</span>
            <svg width="100%" height="9" viewBox="0 0 88 9" preserveAspectRatio="none">
              <path d={s.path} stroke={s.color} strokeWidth="1.2" fill="none" strokeLinecap="square" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Schematic card visual — simple AND + OR gate SVG */
function SchematicVisual() {
  return (
    <div
      className="rounded-lg p-3 flex items-center justify-center"
      style={{ background: '#080c12', border: '1px solid rgba(255,255,255,0.06)', minHeight: '72px' }}
      aria-hidden="true"
    >
      <svg width="120" height="60" viewBox="0 0 120 60">
        {/* Wires in */}
        <line x1="0"  y1="18" x2="22" y2="18" stroke="#334155" strokeWidth="1.2" />
        <line x1="0"  y1="32" x2="22" y2="32" stroke="#334155" strokeWidth="1.2" />
        <line x1="0"  y1="42" x2="22" y2="42" stroke="#334155" strokeWidth="1.2" />
        {/* AND gate body */}
        <path d="M22 12 L22 38 Q46 38 46 25 Q46 12 22 12 Z" stroke="#60a5fa" strokeWidth="1.3" fill="rgba(37,99,235,0.1)" />
        {/* AND output wire */}
        <line x1="46" y1="25" x2="66" y2="25" stroke="#60a5fa" strokeWidth="1.2" />
        {/* OR gate body */}
        <path d="M66 18 Q68 25 66 42 Q80 42 86 32 Q90 25 86 18 Q80 18 66 18 Z" stroke="#34d399" strokeWidth="1.3" fill="rgba(52,211,153,0.08)" />
        <line x1="55" y1="30" x2="66" y2="30" stroke="#334155" strokeWidth="1.2" />
        {/* OR output */}
        <line x1="86" y1="30" x2="110" y2="30" stroke="#34d399" strokeWidth="1.2" />
        {/* Labels */}
        <text x="30" y="27" fill="#60a5fa" fontSize="7" fontFamily="monospace" textAnchor="middle">AND</text>
        <text x="76" y="32" fill="#34d399" fontSize="7" fontFamily="monospace" textAnchor="middle">OR</text>
      </svg>
    </div>
  );
}

/** Examples card visual — code snippet */
function ExamplesVisual() {
  const lines = [
    [{ t: 'module ', c: '#93c5fd' }, { t: 'half_adder', c: '#fbbf24' }, { t: ' (', c: '#e2e8f0' }],
    [{ t: '  input  ', c: '#93c5fd' }, { t: 'A, B,', c: '#cbd5e1' }],
    [{ t: '  output ', c: '#93c5fd' }, { t: 'S, C', c: '#cbd5e1' }],
    [{ t: ');', c: '#cbd5e1' }],
    [{ t: '  assign ', c: '#93c5fd' }, { t: 'S', c: '#cbd5e1' }, { t: ' = A^B;', c: '#94a3b8' }],
    [{ t: 'endmodule', c: '#93c5fd' }],
  ];
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: '#080c12', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: '10px', lineHeight: 1.7 }}
      aria-hidden="true"
    >
      {lines.map((line, li) => (
        <div key={li} className="flex whitespace-pre">
          {line.map((seg, si) => (
            <span key={si} style={{ color: seg.c }}>{seg.t}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Tool definitions
 * ───────────────────────────────────────────────────────────── */
const TOOLS = [
  {
    name: 'DE2 Simulator',
    to: '/de2-simulator',
    badge: 'Digital Logic',
    accent: 'var(--tool-de2-accent)',
    description:
      'Upload Verilog or SystemVerilog, toggle switches, and observe LED states, 7-segment displays, and the LCD — all on a virtual Altera DE2 board. No physical hardware required.',
    Visual: DE2Visual,
  },
  {
    name: 'Waveform',
    to: '/waveform',
    badge: 'Timing Analysis',
    accent: 'var(--tool-waveform-accent)',
    description:
      'Write a testbench, compile it with Icarus Verilog (WebAssembly) in the browser, and inspect how signal values change over time in an interactive timing diagram.',
    Visual: WaveformVisual,
  },
  {
    name: 'Schematic',
    to: '/schematic',
    badge: 'RTL Visualisation',
    accent: 'var(--tool-schematic-accent)',
    description:
      'Synthesise your HDL with Yosys and view the resulting gate-level schematic. See how logic gates, multiplexers, decoders, and flip-flops connect to implement your design.',
    Visual: SchematicVisual,
  },
  {
    name: 'Examples',
    to: '/projects',
    badge: 'Ready to Run',
    accent: 'var(--accent-primary)',
    description:
      'Open curated, working designs with a single click — Half Adder, Full Adder, D Flip-Flop, and more. Use them as a starting point or as teaching references.',
    Visual: ExamplesVisual,
  },
] as const;

/* ─────────────────────────────────────────────────────────────
 * Tool Showcase section
 * ───────────────────────────────────────────────────────────── */
export function ToolShowcase() {
  return (
    <section
      className="landing-tools w-full py-20 lg:py-28"
      style={{ background: 'var(--landing-surface)' }}
      aria-labelledby="tools-heading"
    >
      <div className="max-w-6xl mx-auto px-6">

        {/* Heading */}
        <div className="text-center mb-14">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'var(--landing-accent)' }}
          >
            The Toolset
          </p>
          <h2
            id="tools-heading"
            className="text-3xl sm:text-4xl font-bold"
            style={{ color: 'var(--landing-text)', letterSpacing: '-0.02em' }}
          >
            Four tools. One workspace.
          </h2>
          <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: 'var(--landing-text-secondary)' }}>
            Each tool covers a distinct part of the digital logic learning workflow —
            from interactive board simulation to RTL gate visualisation.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TOOLS.map(({ name, to, badge, accent, description, Visual }) => (
            <div
              key={name}
              className="rounded-xl flex flex-col overflow-hidden"
                style={{
                  border: '1px solid var(--landing-border-subtle)',
                  background: 'var(--landing-surface)',
                }}
            >
              {/* Card top — accent band */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{
                  background: 'var(--landing-surface-alt)',
                  borderBottom: '1px solid var(--landing-border-subtle)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: accent }}
                    aria-hidden="true"
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--landing-text)' }}
                  >
                    {name}
                  </span>
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--landing-surface)', color: 'var(--landing-text-secondary)', border: '1px solid var(--landing-border-subtle)' }}
                >
                  {badge}
                </span>
              </div>

              {/* Card body */}
              <div className="p-5 flex flex-col gap-4 flex-1">
                {/* Mini visual */}
                <Visual />

                {/* Description */}
                <p className="text-sm leading-relaxed" style={{ color: 'var(--landing-text-secondary)' }}>
                  {description}
                </p>

                {/* CTA */}
                <div className="mt-auto">
                  <Link
                    to={to}
                    className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                    style={{ color: accent }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    Open {name}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
