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
      className="group flex flex-col justify-between p-5 rounded-lg border border-slate-800 bg-[#0d1526]/80 hover:border-slate-700/90 hover:bg-[#0f182c] transition-all duration-150 min-h-[250px] shadow-sm font-sans"
    >
      <div>
        {/* Card Header: Category & Subtle Difficulty Badge */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-indigo-400/90">
            {example.category}
          </span>

          <span
            data-testid={`difficulty-badge-${example.id}`}
            className="text-[11px] font-mono px-2 py-0.5 rounded border border-slate-800 bg-slate-900/60 text-slate-400 font-medium"
          >
            {isBeginner ? 'Beginner' : 'Intermediate'}
          </span>
        </div>

        {/* Title */}
        <h3
          data-testid={`example-title-${example.id}`}
          className="text-base font-bold text-slate-100 mb-1.5 leading-snug group-hover:text-white transition-colors"
        >
          {example.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-400 mb-3.5 leading-relaxed line-clamp-2">
          {example.description}
        </p>

        {/* Concept Chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {example.topics.map((topic) => (
            <span
              key={topic}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/40 text-slate-400 border border-slate-800/80"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer: Restrained Engineering Lab Controls */}
      <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Open in Schematic Button */}
          {example.tools.schematic && (
            <button
              data-testid={`open-schematic-btn-${example.id}`}
              onClick={() => onOpenTool(example, 'schematic')}
              title="Open in Schematic Workspace"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition-colors shadow-xs"
            >
              <GitGraph size={12} className="text-sky-400" />
              <span>Schematic</span>
            </button>
          )}

          {/* Open in Waveform Button */}
          {example.tools.waveform && (
            <button
              data-testid={`open-waveform-btn-${example.id}`}
              onClick={() => onOpenTool(example, 'waveform')}
              title="Open in Waveform Workspace"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition-colors shadow-xs"
            >
              <Activity size={12} className="text-emerald-400" />
              <span>Waveform</span>
            </button>
          )}

          {/* Open in DE2 Button */}
          {example.tools.de2 && (
            <button
              data-testid={`open-de2-btn-${example.id}`}
              onClick={() => onOpenTool(example, 'de2')}
              title="Open in DE2 Simulator"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition-colors shadow-xs"
            >
              <Cpu size={12} className="text-amber-400" />
              <span>DE2</span>
            </button>
          )}
        </div>

        {/* View Source Button */}
        <button
          data-testid={`view-source-btn-${example.id}`}
          onClick={() => onViewSource(example)}
          title="View SystemVerilog source code"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-colors"
        >
          <Code2 size={12} />
          <span>Source</span>
        </button>
      </div>
    </div>
  );
};
