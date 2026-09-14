import React from 'react';
import { Code2, Play, Activity, GitGraph, Sliders, Cpu } from 'lucide-react';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Write HDL',
    desc: 'Author Verilog or SystemVerilog modules directly in the browser editor.',
    icon: Code2,
    accent: 'var(--accent-primary, #2563eb)',
  },
  {
    step: '02',
    title: 'Simulate',
    desc: 'Compile designs and testbenches in-browser to verify functional logic.',
    icon: Play,
    accent: 'var(--accent-primary, #2563eb)',
  },
  {
    step: '03',
    title: 'Inspect Waveforms',
    desc: 'Analyze signal transitions, clock edges, and bus values over time.',
    icon: Activity,
    accent: 'var(--tool-waveform-accent, #10b981)',
  },
  {
    step: '04',
    title: 'Inspect Schematic',
    desc: 'RTL synthesis via Yosys with interactive DigitalJS logic visualization.',
    icon: GitGraph,
    accent: 'var(--tool-schematic-accent, #0d9488)',
  },
  {
    step: '05',
    title: 'Map I/O',
    desc: 'Assign ports to virtual DE2 switches, keys, and display outputs.',
    icon: Sliders,
    accent: 'var(--accent-primary, #2563eb)',
  },
  {
    step: '06',
    title: 'Test on DE2 Simulator',
    desc: 'Toggle virtual switches and keys to observe live LED and 7-segment hardware behavior.',
    icon: Cpu,
    accent: 'var(--tool-de2-accent, #2563eb)',
  },
];

export const WorkflowSection: React.FC = () => {
  return (
    <section
      className="landing-workflow w-full py-16 lg:py-24 border-t border-b"
      style={{
        background: 'var(--landing-surface-alt)',
        borderColor: 'var(--landing-border-subtle)',
      }}
      aria-labelledby="workflow-heading"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
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
              Educational Workflow
            </span>
          </div>
          <h2
            id="workflow-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: 'var(--landing-text)' }}
          >
            From Code to Virtual Hardware
          </h2>
          <p className="mt-3 text-sm max-w-xl mx-auto" style={{ color: 'var(--landing-text-secondary)' }}>
            Experience the complete digital hardware design and verification lifecycle
            entirely inside the browser without physical setup friction.
          </p>
        </div>

        {/* 6-Step Pipeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          {WORKFLOW_STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="rounded-md p-4 flex flex-col justify-between border transition-colors relative"
                style={{
                  background: 'var(--landing-surface)',
                  borderColor: 'var(--landing-border-subtle)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="font-mono font-bold text-xs"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {item.step}
                    </span>
                    <div
                      className="p-1.5 rounded border"
                      style={{
                        background: 'var(--landing-surface-alt)',
                        borderColor: 'var(--landing-border-subtle)',
                        color: item.accent,
                      }}
                    >
                      <Icon size={14} />
                    </div>
                  </div>
                  <h3
                    className="font-bold text-xs mb-1.5 tracking-tight"
                    style={{ color: 'var(--landing-text)' }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: 'var(--landing-text-secondary)' }}
                  >
                    {item.desc}
                  </p>
                </div>

                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[10px] font-mono select-none pointer-events-none"
                    style={{ color: 'var(--landing-text-muted)' }}
                  >
                    &rsaquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
