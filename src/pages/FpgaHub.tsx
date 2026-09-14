import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, ArrowRight, Code2, Play, Activity, GitGraph, Sliders } from 'lucide-react';
import { EXAMPLES_LIST } from '../examples/registry';
import type { LearningExample } from '../examples/types';
import { setPendingHandoff, checkTargetToolHasUnsavedWork } from '../services/exampleHandoff';
import { OverwriteConfirmModal } from '../components/Examples/OverwriteConfirmModal';

const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Write HDL',
    desc: 'Author Verilog or SystemVerilog modules directly in the browser editor.',
    icon: Code2,
    accent: 'var(--accent-primary, #2563eb)',
  },
  {
    num: '02',
    title: 'Simulate',
    desc: 'Compile designs and testbenches in-browser to verify functional logic.',
    icon: Play,
    accent: 'var(--accent-primary, #2563eb)',
  },
  {
    num: '03',
    title: 'Inspect Waveforms',
    desc: 'Analyze digital signal transitions, clock edges, and bus states over time.',
    icon: Activity,
    accent: 'var(--state-success, #10b981)',
  },
  {
    num: '04',
    title: 'Inspect Schematic',
    desc: 'RTL synthesis via Yosys with interactive DigitalJS logic visualization.',
    icon: GitGraph,
    accent: 'var(--tool-schematic-accent, #0d9488)',
  },
  {
    num: '05',
    title: 'Map I/O',
    desc: 'Assign logical top-level ports to virtual DE2 switches, keys, and displays.',
    icon: Sliders,
    accent: 'var(--accent-primary, #2563eb)',
  },
  {
    num: '06',
    title: 'Test on DE2 Simulator',
    desc: 'Toggle virtual switches and keys to observe live LED and 7-segment hardware behavior.',
    icon: Cpu,
    accent: 'var(--state-warning, #f59e0b)',
  },
];

export default function FpgaHub() {
  const navigate = useNavigate();
  const [overwriteTarget, setOverwriteTarget] = useState<LearningExample | null>(null);

  // Authoritative registry derivation - zero hardcoded counts
  const de2Examples = EXAMPLES_LIST.filter(ex => ex.tools.de2);

  const executeHandoff = (example: LearningExample) => {
    setPendingHandoff(example.id, 'de2');
    navigate('/de2-simulator');
  };

  const handleLaunchOnBoard = (example: LearningExample) => {
    const hasUnsavedWork = checkTargetToolHasUnsavedWork('de2');
    if (hasUnsavedWork) {
      setOverwriteTarget(example);
    } else {
      executeHandoff(example);
    }
  };

  return (
    <div
      className="flex-1 w-full overflow-y-auto font-sans p-6 lg:p-10"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Hub Header */}
        <div
          className="mb-10 border-b pb-8"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="p-1.5 rounded border"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent-primary)',
              }}
            >
              <Cpu size={16} />
            </div>
            <span
              className="text-xs font-mono font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-primary)' }}
            >
              Hardware Workflow
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-2.5"
            style={{ color: 'var(--text-primary)' }}
          >
            FPGA & Virtual Hardware
          </h1>
          <p
            className="text-sm max-w-3xl leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            A browser-based workflow for designing, verifying, and testing digital hardware architectures.
            Experience the complete digital design cycle from HDL authoring and simulation to schematic
            inspection and interactive testing on the virtual Altera DE2 development board.
          </p>
        </div>

        {/* 6-Step Workflow Section */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Hardware Verification Lifecycle
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Six sequential stages from RTL source to interactive virtual hardware verification.
              </p>
            </div>
            <span
              className="font-mono text-[11px] px-2.5 py-1 rounded border self-start sm:self-center"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              01 &rarr; 06 Pipeline
            </span>
          </div>

          {/* Desktop Pipeline (lg screens) */}
          <div className="hidden lg:grid lg:grid-cols-6 gap-3">
            {WORKFLOW_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="rounded-md p-4 flex flex-col justify-between border relative"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="font-mono font-bold text-xs"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {step.num}
                      </span>
                      <div
                        className="p-1.5 rounded border"
                        style={{
                          backgroundColor: 'var(--bg-app)',
                          borderColor: 'var(--border-subtle)',
                          color: step.accent,
                        }}
                      >
                        <Icon size={14} />
                      </div>
                    </div>
                    <h3
                      className="font-bold text-xs mb-1.5 tracking-tight"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {step.desc}
                    </p>
                  </div>

                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 text-[11px] font-mono select-none pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}
                      aria-hidden="true"
                    >
                      &rsaquo;
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Technical Vertical Spine (< lg screens) */}
          <div className="lg:hidden relative pl-9 space-y-3.5">
            {/* Continuous Vertical Technical Spine */}
            <div
              className="absolute left-3.5 top-3.5 bottom-3.5 w-px"
              style={{ backgroundColor: 'var(--border-strong)' }}
              aria-hidden="true"
            />

            {WORKFLOW_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative">
                  {/* Spine Node Badge */}
                  <div
                    className="absolute -left-9 top-3 w-7 h-7 rounded border flex items-center justify-center font-mono text-[11px] font-bold z-10"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {step.num}
                  </div>

                  {/* Step Content Card */}
                  <div
                    className="p-4 rounded-md border"
                    style={{
                      backgroundColor: 'var(--bg-panel)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {step.title}
                      </h3>
                      <div
                        className="p-1 rounded border"
                        style={{
                          backgroundColor: 'var(--bg-app)',
                          borderColor: 'var(--border-subtle)',
                          color: step.accent,
                        }}
                      >
                        <Icon size={13} />
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Board-Ready Examples Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Board-Ready Reference Designs
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {de2Examples.length} designs configured with pin mappings for the virtual Altera DE2 board.
              </p>
            </div>
            <Link
              to="/de2-simulator"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
              }}
            >
              <Cpu size={14} /> Open DE2 Simulator
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {de2Examples.map(ex => (
              <div
                key={ex.id}
                className="rounded-md border p-4 flex flex-col justify-between transition-colors font-sans group"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div>
                  {/* Card Header: Category & Tool Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider font-semibold"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {ex.category}
                    </span>
                    <div className="flex items-center gap-1">
                      {ex.tools.waveform && (
                        <span
                          className="text-[8px] font-mono px-1 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'rgba(16,185,129,0.08)',
                            borderColor: 'rgba(16,185,129,0.25)',
                            color: 'var(--state-success, #10b981)',
                          }}
                        >
                          WF
                        </span>
                      )}
                      {ex.tools.schematic && (
                        <span
                          className="text-[8px] font-mono px-1 py-0.5 rounded border"
                          style={{
                            backgroundColor: 'rgba(13,148,136,0.08)',
                            borderColor: 'rgba(13,148,136,0.25)',
                            color: 'var(--tool-schematic-accent, #0d9488)',
                          }}
                        >
                          RTL
                        </span>
                      )}
                      <span
                        className="text-[8px] font-mono px-1 py-0.5 rounded border font-semibold"
                        style={{
                          backgroundColor: 'rgba(37,99,235,0.08)',
                          borderColor: 'rgba(37,99,235,0.25)',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        DE2 READY
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-xs sm:text-sm font-bold mb-1 group-hover:text-[var(--accent-primary)] transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {ex.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[11px] leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {ex.description}
                  </p>
                </div>

                {/* Footer Actions */}
                <div
                  className="pt-2.5 border-t flex items-center justify-between text-xs"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <button
                    type="button"
                    data-testid={`launch-board-btn-${ex.id}`}
                    onClick={() => handleLaunchOnBoard(ex)}
                    className="inline-flex items-center gap-1 font-medium text-[11px] transition-colors cursor-pointer"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Launch on Board <ArrowRight size={11} />
                  </button>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {ex.topModule}.sv
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <OverwriteConfirmModal
          isOpen={overwriteTarget !== null}
          example={overwriteTarget}
          targetTool="de2"
          onConfirm={() => {
            if (overwriteTarget) {
              const target = overwriteTarget;
              setOverwriteTarget(null);
              executeHandoff(target);
            }
          }}
          onCancel={() => setOverwriteTarget(null)}
        />
      </div>
    </div>
  );
}
