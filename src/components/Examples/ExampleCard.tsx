import React from 'react';
import { GitGraph, Activity, Cpu, Code2 } from 'lucide-react';
import type { LearningExample } from '../../examples/types';
import type { TargetTool } from '../../services/exampleHandoff';

interface ExampleCardProps {
  example: LearningExample;
  onOpenTool: (example: LearningExample, tool: TargetTool) => void;
  onViewSource: (example: LearningExample) => void;
}

export const ExampleCard: React.FC<ExampleCardProps> = ({
  example,
  onOpenTool,
  onViewSource,
}) => {
  const isBeginner = example.difficulty === 'beginner';

  return (
    <div
      data-testid={`example-card-${example.id}`}
      className="group flex flex-col justify-between p-5 rounded-lg border transition-all duration-150 min-h-[250px] shadow-sm font-sans"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
        e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
      }}
    >
      <div>
        {/* Card Header: Category & Subtle Difficulty Badge */}
        <div className="flex items-center justify-between mb-2.5">
          <span
            className="text-[11px] font-mono uppercase tracking-wider font-semibold"
            style={{ color: 'var(--accent-primary)' }}
          >
            {example.category}
          </span>

          <span
            data-testid={`difficulty-badge-${example.id}`}
            className="text-[11px] font-mono px-2 py-0.5 rounded border font-medium"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {isBeginner ? 'Beginner' : 'Intermediate'}
          </span>
        </div>

        {/* Title */}
        <h3
          data-testid={`example-title-${example.id}`}
          className="text-base font-bold mb-1.5 leading-snug group-hover:text-[var(--accent-primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {example.title}
        </h3>

        {/* Description */}
        <p
          className="text-xs mb-3.5 leading-relaxed line-clamp-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {example.description}
        </p>

        {/* Concept Chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {example.topics.map((topic) => (
            <span
              key={topic}
              className="text-[10px] font-mono px-2 py-0.5 rounded border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer: Restrained Engineering Lab Controls */}
      <div
        className="pt-3 border-t flex items-center justify-between gap-2 flex-wrap"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Open in Schematic Button */}
          {example.tools.schematic && (
            <button
              data-testid={`open-schematic-btn-${example.id}`}
              onClick={() => onOpenTool(example, 'schematic')}
              title="Open in Schematic Workspace"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <GitGraph size={12} style={{ color: 'var(--tool-schematic-accent, #0d9488)' }} />
              <span>Schematic</span>
            </button>
          )}

          {/* Open in Waveform Button */}
          {example.tools.waveform && (
            <button
              data-testid={`open-waveform-btn-${example.id}`}
              onClick={() => onOpenTool(example, 'waveform')}
              title="Open in Waveform Workspace"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <Activity size={12} style={{ color: 'var(--state-success, #10B981)' }} />
              <span>Waveform</span>
            </button>
          )}

          {/* Open in DE2 Button */}
          {example.tools.de2 && (
            <button
              data-testid={`open-de2-btn-${example.id}`}
              onClick={() => onOpenTool(example, 'de2')}
              title="Open in DE2 Simulator"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <Cpu size={12} style={{ color: 'var(--state-warning, #f59e0b)' }} />
              <span>DE2</span>
            </button>
          )}
        </div>

        {/* View Source Button */}
        <button
          data-testid={`view-source-btn-${example.id}`}
          onClick={() => onViewSource(example)}
          title="View SystemVerilog source code"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors"
          style={{
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Code2 size={12} />
          <span>Source</span>
        </button>
      </div>
    </div>
  );
};
