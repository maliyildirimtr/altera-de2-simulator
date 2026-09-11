import { Link } from 'react-router-dom';
import { Play, ArrowRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
 * Hero — Phase 2.1
 *
 * Visual hierarchy:
 *   PRIMARY   → DE2 board (large, lit, animated entrance)
 *   SECONDARY → floating code panel + waveform panel
 *   TERTIARY  → headline copy, CTAs
 *
 * Performance contract: zero simulation engine imports.
 * All visuals are pure CSS / inline SVG / Tailwind.
 * ═══════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────
 * 7-Segment display — authentic SVG segments
 * ───────────────────────────────────────────────────────────────── */

type SegId = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

const SEG_MAP: Record<string, SegId[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'd', 'e', 'g'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['b', 'c', 'f', 'g'],
  '5': ['a', 'c', 'd', 'f', 'g'],
  '6': ['a', 'c', 'd', 'e', 'f', 'g'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
  'A': ['a', 'b', 'c', 'e', 'f', 'g'],
  'b': ['c', 'd', 'e', 'f', 'g'],
  'C': ['a', 'd', 'e', 'f'],
  'd': ['b', 'c', 'd', 'e', 'g'],
  'E': ['a', 'd', 'e', 'f', 'g'],
  'F': ['a', 'e', 'f', 'g'],
  '-': ['g'],
  ' ': [],
};

const SEG_ON  = '#ef4444';
const SEG_OFF = 'rgba(80,5,5,0.45)';


/** Compact 7-segment display rendered as SVG */
function SevenSeg({ digit }: { digit: string }) {
  const active = SEG_MAP[digit] ?? [];
  const s = (id: SegId) => active.includes(id);
  const segStyle = (id: SegId): React.CSSProperties => ({
    fill: s(id) ? SEG_ON : SEG_OFF,
    filter: s(id) ? 'drop-shadow(0 0 2.5px rgba(239,68,68,0.9))' : undefined,
  });

  // ViewBox: 18 × 30, segments drawn as rounded rects
  return (
    <svg width="18" height="30" viewBox="0 0 18 30" aria-hidden="true">
      {/* a — top */}
      <rect x="2.5" y="0.5"  width="13" height="2.5" rx="1.2" style={segStyle('a')} />
      {/* b — top-right */}
      <rect x="15.5" y="2.5" width="2.5" height="10.5" rx="1.2" style={segStyle('b')} />
      {/* c — bottom-right */}
      <rect x="15.5" y="17"  width="2.5" height="10.5" rx="1.2" style={segStyle('c')} />
      {/* d — bottom */}
      <rect x="2.5" y="27"   width="13" height="2.5" rx="1.2" style={segStyle('d')} />
      {/* e — bottom-left */}
      <rect x="0"   y="17"   width="2.5" height="10.5" rx="1.2" style={segStyle('e')} />
      {/* f — top-left */}
      <rect x="0"   y="2.5"  width="2.5" height="10.5" rx="1.2" style={segStyle('f')} />
      {/* g — middle */}
      <rect x="2.5" y="13.5" width="13" height="2.5" rx="1.2" style={segStyle('g')} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * FPGA chip — BGA package presentation
 * ───────────────────────────────────────────────────────────────── */
function FPGAChip() {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 200,
        height: 132,
        background: 'linear-gradient(145deg, #1a1a1a 0%, #0c0c0c 60%, #111 100%)',
        borderRadius: 4,
        border: '1px solid #050505',
        borderTop: '1px solid #252525',
        borderLeft: '1px solid #1e1e1e',
        boxShadow: '0 10px 28px rgba(0,0,0,0.9), inset 0 1px 3px rgba(255,255,255,0.04), 0 0 0 0.5px #000',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* BGA dot array */}
      <div
        style={{
          position: 'absolute',
          inset: 12,
          backgroundImage: 'radial-gradient(circle, rgba(55,55,55,0.75) 1.3px, transparent 1.3px)',
          backgroundSize: '9px 9px',
          opacity: 0.65,
        }}
      />
      {/* Glossy reflection */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(118deg, rgba(255,255,255,0.045) 0%, transparent 55%)',
        }}
      />
      {/* Chip label */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 8, fontFamily: 'monospace', letterSpacing: '0.14em' }}>
          ALTERA
        </p>
        <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.04em' }}>
          CYCLONE II
        </p>
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 7, fontFamily: 'monospace', letterSpacing: '0.03em', marginTop: 2 }}>
          EP2C35F672C6N
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Mounting screw
 * ───────────────────────────────────────────────────────────────── */
function Screw() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 35%, #e8c84a 0%, #c8961a 42%, #8a6010 68%, #4a3008 100%)',
        boxShadow: 'inset 0 2px 4px rgba(255,220,120,0.45), inset 0 -2px 4px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.8)',
        flexShrink: 0,
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
 * DE2 Board — large product presentation (purely static)
 * ───────────────────────────────────────────────────────────────── */

const LED_R = [true, false, true, true, false, false, true, false]; // LEDR[7..0]
const LED_G = [false, true, false, true, false, false, true, false]; // LEDG[7..0]
const HEX_DIGITS = ['A', 'b', 'C', 'd', 'E', 'F'] as const;       // HEX[5..0]
const SW_STATE   = [true, false, true, false, false, false, true, false, false, true]; // SW[9..0]

function DE2Board() {
  const silk   = 'rgba(215, 230, 255, 0.60)';
  const silkY  = 'rgba(240, 195, 60, 0.65)';
  const label8 = { color: silk,  fontSize: 8,  fontFamily: 'monospace', letterSpacing: '0.08em' };
  const labelN = { color: silkY, fontSize: 7,  fontFamily: 'monospace' };

  return (
    <div
      className="hero-board-anim"
      aria-hidden="true"
      style={{
        width: '100%',
        background: '#0c3860',
        backgroundImage: [
          'linear-gradient(rgba(14,62,108,0.7) 1px,  transparent 1px)',
          'linear-gradient(90deg, rgba(14,62,108,0.7) 1px, transparent 1px)',
          'linear-gradient(rgba(20,80,140,0.18) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(20,80,140,0.18) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '5px 5px, 5px 5px, 25px 25px, 25px 25px',
        borderRadius: 8,
        border: '2px solid #1a5a8a',
        boxShadow: [
          '0 24px 60px rgba(0,0,0,0.6)',
          '0 8px 20px rgba(0,0,0,0.45)',
          '0 0 0 1px rgba(10,50,90,0.9)',
          'inset 0 0 60px rgba(0,0,0,0.25)',
        ].join(', '),
        padding: '12px 14px 14px 14px',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* ── Board header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <p style={{ ...label8, fontWeight: 700, letterSpacing: '0.10em', marginBottom: 2 }}>
            ALTERA DE2 DEVELOPMENT BOARD
          </p>
          <p style={labelN}>CYCLONE II · EP2C35F672C6N</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Screw />
          <Screw />
        </div>
      </div>

      {/* ── LED rows ── */}
      <div style={{ marginBottom: 10 }}>
        {/* LEDR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ ...label8, width: 36, flexShrink: 0 }}>LEDR</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {LED_R.map((on, i) => (
              <div
                key={i}
                className={on && (i === 0 || i === 2) ? 'hero-led-blink' : ''}
                style={{
                  '--led-glow': '0 0 9px 3px rgba(255,0,0,0.9), 0 0 22px 6px rgba(255,0,0,0.4)',
                  width: 13, height: 13, borderRadius: '50%',
                  background: on
                    ? 'radial-gradient(circle at 38% 32%, #ffb8b8 0%, #ff1a1a 38%, #cc0000 72%, #7a0000 100%)'
                    : 'radial-gradient(circle at 38% 32%, #3d0404 0%, #1a0101 100%)',
                  boxShadow: on
                    ? '0 0 9px 3px rgba(255,30,30,0.9), 0 0 22px 6px rgba(255,0,0,0.4), inset 0 0 4px rgba(255,180,180,0.5)'
                    : 'inset 0 2px 4px rgba(0,0,0,0.9)',
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
        {/* LEDG */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...label8, width: 36, flexShrink: 0 }}>LEDG</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {LED_G.map((on, i) => (
              <div
                key={i}
                className={on && i === 1 ? 'hero-led-blink' : ''}
                style={{
                  '--led-glow': '0 0 9px 3px rgba(0,255,80,0.9), 0 0 22px 6px rgba(0,200,60,0.4)',
                  width: 13, height: 13, borderRadius: '50%',
                  background: on
                    ? 'radial-gradient(circle at 38% 32%, #bbffbb 0%, #16e816 38%, #00b000 72%, #004a00 100%)'
                    : 'radial-gradient(circle at 38% 32%, #031403 0%, #010801 100%)',
                  boxShadow: on
                    ? '0 0 9px 3px rgba(0,255,80,0.9), 0 0 22px 6px rgba(0,200,60,0.4), inset 0 0 4px rgba(180,255,180,0.5)'
                    : 'inset 0 2px 4px rgba(0,0,0,0.9)',
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── HEX display row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ ...label8, width: 36, flexShrink: 0 }}>HEX</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {HEX_DIGITS.map((digit, i) => (
            <div
              key={i}
              style={{
                background: '#000',
                border: '1.5px solid #111',
                borderRadius: 3,
                padding: '4px 6px 5px 6px',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)',
              }}
            >
              <SevenSeg digit={digit} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Main body: buttons + FPGA + GPIO ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        {/* Push buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ ...label8, marginBottom: 4 }}>KEY</span>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: 20, height: 20,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 32%, #d8d8d8 0%, #a0a0a0 42%, #686868 75%, #2a2a2a 100%)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.65), inset 0 -2px 4px rgba(0,0,0,0.5)',
                border: '1px solid #080808',
              }}
            />
          ))}
        </div>

        {/* FPGA chip — takes remaining horizontal space */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <FPGAChip />
        </div>

        {/* GPIO connector placeholder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ ...label8, marginBottom: 4 }}>GPIO</span>
          <div
            style={{
              width: 18, height: 90,
              background: 'linear-gradient(to bottom, #181818, #111)',
              border: '1px solid #080808',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '6px 0',
            }}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0 }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Switch row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...label8, width: 36, flexShrink: 0 }}>SW</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {SW_STATE.map((on, i) => (
              <div
                key={i}
                style={{
                  width: 10, height: 20,
                  background: 'linear-gradient(to bottom, #0c0c0c, #070707)',
                  border: '1px solid #000',
                  borderRadius: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 3px 7px rgba(0,0,0,0.95)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0, right: 0, height: 10,
                    background: 'linear-gradient(to bottom, #e8e8e8, #b8b8b8 35%, #888 60%, #444)',
                    borderRadius: 2,
                    top: on ? 0 : 10,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.7)',
                  }}
                />
              </div>
            ))}
          </div>
          {/* switch number labels */}
          <div style={{ display: 'flex', gap: 5 }}>
            {SW_STATE.map((_, i) => (
              <span key={i} style={{ ...labelN, width: 10, textAlign: 'center', fontSize: 6, color: silkY }}>
                {9 - i}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Corner screws bottom */}
      <div style={{ position: 'absolute', bottom: 10, left: 12 }}><Screw /></div>
      <div style={{ position: 'absolute', bottom: 10, right: 12 }}><Screw /></div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * IDE Workspace Panels (Integrated)
 * ───────────────────────────────────────────────────────────────── */

const CODE = [
  [{ t: 'module ', c: '#93c5fd' }, { t: 'half_adder', c: '#fbbf24' }, { t: ' (', c: '#cbd5e1' }],
  [{ t: '  input  ', c: '#93c5fd' }, { t: 'A, B,', c: '#e2e8f0' }],
  [{ t: '  output ', c: '#93c5fd' }, { t: 'S, C', c: '#e2e8f0' }],
  [{ t: ');', c: '#e2e8f0' }],
  [{ t: '  assign ', c: '#93c5fd' }, { t: 'S = A^B;', c: '#e2e8f0' }, { t: ' // Sum', c: '#334155' }],
  [{ t: '  assign ', c: '#93c5fd' }, { t: 'C = A&B;', c: '#e2e8f0' }, { t: ' // Carry', c: '#334155' }],
  [{ t: 'endmodule', c: '#93c5fd' }],
] as const;

function CodePanel() {
  return (
    <div
      style={{
        background: '#0a0d14',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          background: '#111520',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>main.sv</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <div style={{ padding: '2px 8px', background: '#1e2d40', borderRadius: 4, color: '#4a6080', fontSize: 10, fontFamily: 'monospace' }}>
            Compile
          </div>
          <div style={{ padding: '2px 8px', background: '#1e3a8a', borderRadius: 4, color: '#93c5fd', fontSize: 10, fontFamily: 'monospace' }}>
            ▶ Run
          </div>
        </div>
      </div>
      {/* Code body */}
      <div
        style={{
          padding: '16px',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          fontSize: 12,
          lineHeight: 1.65,
        }}
      >
        {CODE.map((line, li) => (
          <div key={li} className="flex whitespace-pre">
            {line.map((seg, si) => (
              <span key={si} style={{ color: seg.c }}>{seg.t}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const WAVEFORMS = [
  {
    name: 'CLK',
    path: 'M0,6 L10,6 L10,1 L20,1 L20,6 L30,6 L30,1 L40,1 L40,6 L50,6 L50,1 L60,1 L60,6 L70,6 L70,1 L80,1 L80,6 L90,6 L90,1 L100,1 L100,6 L110,6',
    color: '#60a5fa',
  },
  {
    name: 'A  ',
    path: 'M0,6 L40,6 L40,1 L110,1',
    color: '#34d399',
  },
  {
    name: 'B  ',
    path: 'M0,6 L20,6 L20,1 L110,1',
    color: '#34d399',
  },
  {
    name: 'S  ',
    path: 'M0,6 L20,6 L20,1 L40,1 L40,6 L110,6',
    color: '#fb923c',
  },
] as const;

function WaveformPanel() {
  return (
    <div
      style={{
        background: '#07090f',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#0a0d15',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#38527a', fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
          WAVEFORM
        </span>
        <span style={{ color: '#38527a', fontSize: 10, fontFamily: 'monospace', marginLeft: 'auto' }}>
          50 MHz
        </span>
      </div>
      {/* Signals */}
      <div style={{ padding: '16px' }}>
        {WAVEFORMS.map(sig => (
          <div key={sig.name} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <span style={{ color: '#476288', fontSize: 11, fontFamily: 'monospace', width: 28, flexShrink: 0 }}>
              {sig.name}
            </span>
            <svg
              style={{ flex: 1, display: 'block', height: 16, minWidth: 0 }}
              viewBox="0 0 110 7"
              preserveAspectRatio="none"
            >
              <path
                className="hero-wf-path"
                d={sig.path}
                stroke={sig.color}
                strokeWidth="1.3"
                fill="none"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectorPanel() {
  return (
    <div style={{ background: '#0a0d14', height: '100%', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
      <div
        style={{
          background: '#111520',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '6px 12px',
        }}
      >
        <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>Pin Planner</span>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['SW[0] : PIN_N25', 'SW[1] : PIN_N26', 'LEDR[0]: PIN_AE23', 'LEDR[1]: PIN_AF23'].map(pin => (
          <div key={pin} style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', background: '#111827', padding: '6px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.03)' }}>
            {pin}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Unified Workspace Frame
 * ───────────────────────────────────────────────────────────────── */
function WorkspaceFrame() {
  return (
    <div
      className="hero-board-anim"
      style={{
        width: '100%',
        background: '#0d1117',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.8)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* OS / IDE Window Header */}
      <div
        style={{
          background: '#161b22',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
        </div>
        <div style={{ margin: '0 auto', color: '#8b949e', fontSize: 13, fontWeight: 500, fontFamily: 'sans-serif' }}>
          EELab Engineering Workspace
        </div>
        <div style={{ width: 52 }} /> {/* Spacer to center the title */}
      </div>

      {/* Main layout: Code | Board | Inspector */}
      <div style={{ display: 'grid' }} className="grid-cols-1 lg:grid-cols-[280px_1fr_220px]">
        {/* Left: Code */}
        <div className="hidden lg:block border-r border-white/10">
          <CodePanel />
        </div>
        
        {/* Center: DE2 Board */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: '#0d1117' }}>
          {/* Spotlight */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '80%', height: '80%',
              background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
              borderRadius: '50%',
            }}
          />
          <div style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
            <DE2Board />
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="hidden lg:block">
          <InspectorPanel />
        </div>
      </div>

      {/* Bottom: Waveform */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <WaveformPanel />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Hero section
 * ═══════════════════════════════════════════════════════════════════ */
export function Hero() {
  return (
    <section
      className="landing-hero"
      style={{ background: 'var(--landing-bg)', position: 'relative', overflow: 'hidden' }}
      aria-label="Hero"
    >
      {/* Engineering grid background */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.022) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(0,0,0,0.022) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          pointerEvents: 'none',
        }}
      />

      <div
        className="relative"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '72px 24px 0 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* ── Top: copy ── */}
        <div style={{ maxWidth: 800, marginBottom: 56 }}>
          {/* Eyebrow */}
          <p
            style={{
              color: 'var(--landing-accent)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Engineering Learning Platform
          </p>

          {/* Headline */}
          <h1
            style={{
              color: 'var(--landing-text)',
              fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: 24,
            }}
          >
            Learn digital systems by building and simulating them in your browser.
          </h1>

          {/* Body */}
          <p
            style={{
              color: 'var(--landing-text-secondary)',
              fontSize: 18,
              lineHeight: 1.6,
              marginBottom: 36,
              marginLeft: 'auto',
              marginRight: 'auto',
              maxWidth: 640,
            }}
          >
            Write Verilog/SystemVerilog, inspect signals, visualize digital
            logic, and interact with a virtual FPGA board.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 20 }}>
            <Link
              to="/de2-simulator"
              className="inline-flex items-center gap-2 font-semibold rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: '#2563eb', color: '#fff', fontSize: 15, padding: '12px 28px' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')}
              onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}
            >
              <Play size={16} strokeWidth={2.5} />
              Open DE2 Simulator
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 font-semibold rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: 'transparent', color: 'var(--landing-navy)', fontSize: 15, padding: '12px 28px', border: '1px solid var(--landing-border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--landing-surface-alt)'; e.currentTarget.style.borderColor = 'var(--landing-navy)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--landing-border)'; }}
            >
              Explore Examples
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Reassurance */}
          <p style={{ color: 'var(--landing-text-muted)', fontSize: 13, fontWeight: 500 }}>
            Runs directly in your browser&nbsp;·&nbsp;No complex setup
          </p>
        </div>

        {/* ── Bottom: unified workspace frame ── */}
        <div style={{ width: '100%', paddingBottom: 64, marginTop: 16 }}>
          <WorkspaceFrame />
        </div>
      </div>

      {/* Hero → Tool Showcase transition gradient */}
      <div
        aria-hidden="true"
        style={{
          height: 120,
          background: 'linear-gradient(to bottom, var(--landing-bg), var(--landing-surface))',
          marginTop: -60,
        }}
      />
    </section>
  );
}
