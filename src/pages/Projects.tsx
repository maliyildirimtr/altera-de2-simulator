import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { EXAMPLES_LIST } from '../examples/registry';
import type { LearningExample } from '../examples/types';
import { ExampleFilterBar, type ExampleFilterKey } from '../components/Examples/ExampleFilterBar';
import { ExampleCard } from '../components/Examples/ExampleCard';
import { SourcePreviewModal } from '../components/Examples/SourcePreviewModal';
import { OverwriteConfirmModal } from '../components/Examples/OverwriteConfirmModal';
import {
  setPendingHandoff,
  checkTargetToolHasUnsavedWork,
  type TargetTool,
} from '../services/exampleHandoff';

export default function Projects() {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<ExampleFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [previewExample, setPreviewExample] = useState<LearningExample | null>(null);
  const [overwriteTarget, setOverwriteTarget] = useState<{
    example: LearningExample;
    tool: TargetTool;
  } | null>(null);

  // Category and capability counts dynamically derived from canonical registry
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: EXAMPLES_LIST.length,
      combinational: 0,
      sequential: 0,
      arithmetic: 0,
      routing: 0,
      de2: 0,
    };
    for (const ex of EXAMPLES_LIST) {
      if (counts[ex.category] !== undefined) {
        counts[ex.category]++;
      }
      if (ex.tools.de2) {
        counts.de2++;
      }
    }
    return counts;
  }, []);

  // Filtered examples
  const filteredExamples = useMemo(() => {
    return EXAMPLES_LIST.filter((ex) => {
      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'de2'
          ? ex.tools.de2 === true
          : ex.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = ex.title.toLowerCase().includes(q);
      const inDesc = ex.description.toLowerCase().includes(q);
      const inTopics = ex.topics.some((t) => t.toLowerCase().includes(q));
      const inModule = ex.topModule.toLowerCase().includes(q);

      return inTitle || inDesc || inTopics || inModule;
    });
  }, [selectedCategory, searchQuery]);

  // Execute handoff navigation
  const executeHandoff = (example: LearningExample, tool: TargetTool) => {
    setPendingHandoff(example.id, tool);
    const routes: Record<TargetTool, string> = {
      schematic: '/schematic',
      waveform: '/waveform',
      de2: '/de2-simulator',
    };
    navigate(routes[tool]);
  };

  // Tool button clicked on card
  const handleOpenTool = (example: LearningExample, tool: TargetTool) => {
    const hasUnsavedWork = checkTargetToolHasUnsavedWork(tool);
    if (hasUnsavedWork) {
      setOverwriteTarget({ example, tool });
    } else {
      executeHandoff(example, tool);
    }
  };

  const handleConfirmOverwrite = () => {
    if (overwriteTarget) {
      const { example, tool } = overwriteTarget;
      setOverwriteTarget(null);
      executeHandoff(example, tool);
    }
  };

  const handleCancelOverwrite = () => {
    setOverwriteTarget(null);
  };

  return (
    <div
      data-testid="examples-page"
      className="flex-1 w-full bg-[#070b14] text-slate-200 overflow-y-auto font-sans"
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 border-b border-slate-800/80 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <BookOpen size={18} />
              </div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
                Digital Logic Learning Library
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
              SystemVerilog Reference Examples
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Curated hardware designs with clean SystemVerilog source code, automated testbenches, and interactive simulation support.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              data-testid="examples-count"
              className="text-xs font-mono px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400"
            >
              Showing <strong className="text-slate-200">{filteredExamples.length}</strong> of{' '}
              {EXAMPLES_LIST.length} examples
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <ExampleFilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryCounts={categoryCounts}
        />

        {/* Examples Grid */}
        {filteredExamples.length > 0 ? (
          <div
            data-testid="examples-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredExamples.map((example) => (
              <ExampleCard
                key={example.id}
                example={example}
                onOpenTool={handleOpenTool}
                onViewSource={setPreviewExample}
              />
            ))}
          </div>
        ) : (
          <div
            data-testid="examples-empty-state"
            className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30"
          >
            <p className="text-sm text-slate-400 mb-3">
              No examples match your filter criteria{' '}
              {searchQuery && (
                <>
                  for <strong className="text-slate-200">"{searchQuery}"</strong>
                </>
              )}
              .
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Source Preview Modal */}
      <SourcePreviewModal
        example={previewExample}
        onClose={() => setPreviewExample(null)}
      />

      {/* Overwrite Confirmation Modal */}
      <OverwriteConfirmModal
        isOpen={Boolean(overwriteTarget)}
        example={overwriteTarget?.example || null}
        targetTool={overwriteTarget?.tool || null}
        onConfirm={handleConfirmOverwrite}
        onCancel={handleCancelOverwrite}
      />
    </div>
  );
}
