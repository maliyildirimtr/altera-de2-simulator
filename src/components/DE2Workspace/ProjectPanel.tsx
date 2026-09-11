import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoardStore } from '../../store/boardStore';
import { FileCode, FileText, Plus, ChevronLeft, BookOpen, Upload } from 'lucide-react';

interface ProjectPanelProps {
  isOpen: boolean;
  width?: number;
  onToggle: () => void;
  onOpenImport: () => void;
  activeView: 'board' | 'split' | 'code';
  onSelectFile: (fileName: string) => void;
}

export const ProjectPanel: React.FC<ProjectPanelProps> = ({
  isOpen,
  width,
  onToggle,
  onOpenImport,
  activeView,
  onSelectFile,
}) => {
  const navigate = useNavigate();
  const { hdlCode, pinMappings } = useBoardStore();

  if (!isOpen) return null;

  const lineCount = hdlCode ? hdlCode.split('\n').length : 0;
  const hasHdl = !!hdlCode && hdlCode.trim().length > 0;
  const hasPins = pinMappings.length > 0;

  return (
    <aside
      data-testid="project-panel"
      style={{ width: width ?? 220 }}
      className="bg-[#0d1627] flex flex-col shrink-0 select-none z-10 overflow-hidden"
      aria-label="Project Explorer"
    >
      {/* Panel Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#1e293b] bg-[#0a1120]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Project
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenImport}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Import File (.sv, .v, .qsf, .xdc)"
            aria-label="Import File"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={onToggle}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Collapse Project Panel"
            aria-label="Collapse Project Panel"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 text-sm">
        {/* Section: Sources */}
        <div>
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Sources
          </div>
          {hasHdl ? (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => onSelectFile('main.sv')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                  activeView === 'code' || activeView === 'split'
                    ? 'bg-blue-600/15 text-blue-300 border border-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode size={14} className="text-blue-400 shrink-0" />
                  <span className="truncate font-mono">main.sv</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono ml-2">
                  {lineCount}L
                </span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-[#080d18] border border-[#1e293b]/60 rounded-md mt-1 text-center">
              <p className="text-xs text-slate-400 mb-2">No HDL source loaded</p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={onOpenImport}
                  className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition-colors"
                >
                  <Upload size={12} />
                  Import HDL
                </button>
                <button
                  onClick={() => navigate('/projects')}
                  className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  <BookOpen size={12} />
                  Open Example
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section: Constraints */}
        <div>
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Constraints
          </div>
          {hasPins ? (
            <div className="mt-1 space-y-0.5">
              <div className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <FileText size={14} className="text-emerald-400 shrink-0" />
                  <span className="truncate font-mono">DE2_pin_assignments.qsf</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono ml-2">
                  {pinMappings.length} pins
                </span>
              </div>
            </div>
          ) : (
            <div className="px-2 py-2 text-xs text-slate-400 italic">
              No constraint file (.qsf)
            </div>
          )}
        </div>
      </div>

      {/* Footer / Add File Action */}
      <div className="p-2 border-t border-[#1e293b] bg-[#0a1120]">
        <button
          onClick={onOpenImport}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white border border-[#1e293b] transition-colors"
        >
          <Plus size={13} />
          Add / Import File
        </button>
      </div>
    </aside>
  );
};
