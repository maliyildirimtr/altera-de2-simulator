import { Link } from 'react-router-dom';
import { Grid, ArrowRight, Cpu, Activity, GitGraph, Code, Layout, Play } from 'lucide-react';
import { EXAMPLES_LIST } from '../examples/registry';

export default function FpgaHub() {
  const de2Examples = EXAMPLES_LIST.filter(ex => ex.tools.de2);

  const workflowSteps = [
    { icon: Code, title: 'Write HDL', desc: 'Design your logic in SystemVerilog.' },
    { icon: Play, title: 'Simulate', desc: 'Run testbenches to verify functionality.' },
    { icon: Activity, title: 'Inspect Waveforms', desc: 'Analyze signal timing and state changes.' },
    { icon: GitGraph, title: 'Inspect Schematic', desc: 'View the synthesized gate-level logic.' },
    { icon: Layout, title: 'Map Inputs / Outputs', desc: 'Assign logical signals to board pins.' },
    { icon: Cpu, title: 'Test on DE2 Simulator', desc: 'Interact with the virtual board.' },
  ];

  return (
    <div
      className="flex-1 w-full overflow-y-auto font-sans p-6 lg:p-12"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div
          className="mb-12 border-b pb-10"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="p-1.5 rounded-md border"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent-primary)',
              }}
            >
              <Grid size={18} />
            </div>
            <span
              className="text-xs font-mono font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-primary)' }}
            >
              Engineering Area
            </span>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Field-Programmable Gate Arrays (FPGA)
          </h1>
          <p
            className="text-lg max-w-3xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            Learn the end-to-end workflow for designing, verifying, and testing digital systems on a virtual FPGA platform. Experience the hardware design lifecycle entirely in your browser.
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            Learning Workflow
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="p-5 rounded-xl border flex flex-col items-start relative z-10"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg mb-4 border"
                    style={{
                      backgroundColor: 'var(--accent-subtle)',
                      borderColor: 'var(--accent-border)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Step {index + 1}
                  </div>
                  <h3
                    className="text-lg font-bold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Board-Ready Examples
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Examples pre-configured for the virtual DE2 board.
              </p>
            </div>
            <Link
              to="/de2-simulator"
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold transition-colors"
              style={{
                backgroundColor: 'var(--accent-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
              }}
            >
              <Cpu size={16} /> Open DE2 Simulator
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {de2Examples.map(ex => (
              <Link
                key={ex.id}
                to="/examples"
                className="block p-4 rounded-xl border transition-colors group"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <h3
                  className="text-sm font-bold mb-2 group-hover:text-[var(--accent-primary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {ex.title}
                </h3>
                <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {ex.description}
                </p>
                <div
                  className="mt-4 flex items-center text-xs font-semibold group-hover:translate-x-0.5 transition-transform"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  View Example <ArrowRight size={14} className="ml-1" />
                </div>
              </Link>
            ))}
          </div>
          
          <Link
            to="/de2-simulator"
            className="sm:hidden mt-6 flex items-center justify-center gap-2 w-full py-3 text-white rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--accent-primary)',
            }}
          >
            <Cpu size={16} /> Open DE2 Simulator
          </Link>
        </div>
      </div>
    </div>
  );
}
