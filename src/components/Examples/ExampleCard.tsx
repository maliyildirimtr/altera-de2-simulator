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
      className="group flex flex-col justify-between p-4 sm:p-5 rounded-md border transition-all duration-150 min-h-[240px] font-sans"
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
        {/* Card Header: Category, Difficulty & Tool Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono uppercase tracking-wider font-semibold"
              style={{ color: 'var(--accent-primary)' }}
            >
              {example.category}
            </span>

            <span
              data-testid={`difficulty-badge-${example.id}`}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border font-medium"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {isBeginner ? 'Beginner' : 'Intermediate'}
            </span>
          </div>

          {/* Tool Compatibility Badges */}
          <div className="flex items-center gap-1">
            {example.tools.waveform && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold"
                style={{
                  backgroundColor: 'rgba(16,185,129,0.08)',
                  borderColor: 'rgba(16,185,129,0.25)',
                  color: 'var(--state-success, #10b981)',
                }}
                title="Compatible with Waveform Simulator"
              >
                WAVEFORM
              </span>
            )}
            {example.tools.schematic && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold"
                style={{
                  backgroundColor: 'rgba(13,148,136,0.08)',
                  borderColor: 'rgba(13,148,136,0.25)',
                  color: 'var(--tool-schematic-accent, #0d9488)',
                }}
                title="Compatible with Schematic Workspace"
              >
                SCHEMATIC
              </span>
            )}
            {example.tools.de2 && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold"
                style={{
                  backgroundColor: 'rgba(245,158,11,0.08)',
                  borderColor: 'rgba(245,158,11,0.25)',
                  color: 'var(--state-warning, #f59e0b)',
                }}
                title="Ready for virtual DE2 board"
              >
                DE2
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          data-testid={`example-title-${example.id}`}
          className="text-sm sm:text-base font-bold mb-1 leading-snug group-hover:text-[var(--accent-primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {example.title}
        </h3>

        {/* Description */}
        <p
          className="text-xs mb-3 leading-relaxed line-clamp-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {example.description}
        </p>

        {/* Concept Chips from authoritative registry topics */}
        {example.topics && example.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
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
        )}
      </div>

      {/* Card Footer: Clear Action Controls */}
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
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
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
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
              }}
            >
              <Activity size={12} style={{ color: 'var(--state-success, #10B981)' }} />
              <span>Waveform</span>
            </button>
          )}

          {/* Open in DE2 Button (Strictly only when supported) */}
          {example.tools.de2 && (
            <button
              data-testid={`open-de2-btn-${example.id}`}
              onClick={() => onOpenTool(example, 'de2')}
              title="Open in DE2 Simulator"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
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
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-colors"
          style={{
            borderColor: 'transparent',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <Code2 size={12} />
          <span>Source</span>
        </button>
      </div>
    </div>
  );
};
