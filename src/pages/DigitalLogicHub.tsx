import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight, Zap, Calculator, Clock, Split } from 'lucide-react';
import { EXAMPLES_LIST } from '../examples/registry';
import type { ExampleCategory, LearningExample } from '../examples/types';

interface RoadmapStage {
  step: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  categories: ExampleCategory[];
}

const ROADMAP_STAGES: RoadmapStage[] = [
  {
    step: '01',
    title: 'Foundations & Logic Gates',
    subtitle: 'Elementary Boolean Functions',
    description:
      'Fundamental digital logic gates operating in parallel: AND, OR, XOR, NOT, NAND, and NOR. Learn truth table definitions and continuous assignments.',
    icon: Zap,
    categories: ['combinational'],
  },
  {
    step: '02',
    title: 'Combinational Routing & Decisions',
    subtitle: 'Multiplexers, Decoders & Priority Networks',
    description:
      'Decision logic without stored memory. Explore multiplexer bus selection, address decoding, magnitude comparison, and priority encoding.',
    icon: Split,
    categories: ['routing'],
  },
  {
    step: '03',
    title: 'Binary Arithmetic Circuits',
    subtitle: 'Adders, Carry Propagation & ALUs',
    description:
      'Mathematical computation on binary vectors. Study half and full addition, ripple carry propagation across multi-bit words, and arithmetic logic units.',
    icon: Calculator,
    categories: ['arithmetic'],
  },
  {
    step: '04',
    title: 'Sequential Logic & State Storage',
    subtitle: 'Flip-Flops, Registers & Counters',
    description:
      'Synchronous circuits with memory. Observe clock edge triggering, state capture in D flip-flops, parallel word registers, and 4-bit synchronous counters.',
    icon: Clock,
    categories: ['sequential'],
  },
];

function StageCard({ example }: { example: LearningExample }) {
  return (
    <div
      key={example.id}
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
            {example.category}
          </span>
          <div className="flex items-center gap-1">
            {example.tools.waveform && (
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
            {example.tools.schematic && (
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
            {example.tools.de2 && (
              <span
                className="text-[8px] font-mono px-1 py-0.5 rounded border"
                style={{
                  backgroundColor: 'rgba(245,158,11,0.08)',
                  borderColor: 'rgba(245,158,11,0.25)',
                  color: 'var(--state-warning, #f59e0b)',
                }}
              >
                DE2
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h4
          className="text-xs sm:text-sm font-bold mb-1 group-hover:text-[var(--accent-primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {example.title}
        </h4>

        {/* Description */}
        <p className="text-[11px] leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
          {example.description}
        </p>
      </div>

      {/* Footer Link */}
      <div
        className="pt-2.5 border-t flex items-center justify-between text-xs"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Link
          to="/examples"
          className="inline-flex items-center gap-1 font-medium text-[11px] transition-colors"
          style={{ color: 'var(--accent-primary)' }}
        >
          View in Library <ArrowRight size={11} />
        </Link>
        <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {example.topModule}.sv
        </span>
      </div>
    </div>
  );
}

export default function DigitalLogicHub() {
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
              <Layers size={16} />
            </div>
            <span
              className="text-xs font-mono font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-primary)' }}
            >
              Engineering Learning Roadmap
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-2.5"
            style={{ color: 'var(--text-primary)' }}
          >
            Digital Logic Curriculum
          </h1>
          <p
            className="text-sm max-w-3xl leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            A progressive roadmap through core digital hardware concepts. Explore each stage from basic logic gates through combinational networks and arithmetic units to sequential state machines, verified in live simulators.
          </p>
        </div>

        {/* 4-Stage Roadmap Flow */}
        <div className="space-y-12">
          {ROADMAP_STAGES.map((stage) => {
            const Icon = stage.icon;
            const stageExamples = EXAMPLES_LIST.filter(ex =>
              stage.categories.includes(ex.category)
            );

            return (
              <div
                key={stage.step}
                className="border rounded-lg p-5 sm:p-6"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {/* Stage Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded border shrink-0 mt-0.5"
                      style={{
                        backgroundColor: 'var(--accent-subtle)',
                        borderColor: 'var(--accent-border)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--accent-primary)' }}>
                          STAGE {stage.step}
                        </span>
                        <span style={{ color: 'var(--border-subtle)' }}>&middot;</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                          {stage.subtitle}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                        {stage.title}
                      </h2>
                    </div>
                  </div>

                  <span
                    className="font-mono text-[11px] px-2.5 py-1 rounded border self-start sm:self-center"
                    style={{
                      backgroundColor: 'var(--bg-panel)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {stageExamples.length} Reference {stageExamples.length === 1 ? 'Design' : 'Designs'}
                  </span>
                </div>

                {/* Stage Description */}
                <p className="text-xs leading-relaxed max-w-3xl mb-5" style={{ color: 'var(--text-secondary)' }}>
                  {stage.description}
                </p>

                {/* Example Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {stageExamples.map(ex => (
                    <StageCard key={ex.id} example={ex} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
