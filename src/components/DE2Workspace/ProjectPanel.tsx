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
      style={{
        width: width ?? 220,
        backgroundColor: 'var(--bg-panel)',
        color: 'var(--text-primary)',
      }}
      className="border-r border-[var(--border-subtle)] flex flex-col shrink-0 select-none z-10 overflow-hidden"
      aria-label="Project Explorer"
    >
      {/* Panel Header */}
      <div
        className="h-[36px] px-3 flex items-center justify-between border-b border-[var(--border-subtle)] shrink-0"
        style={{ backgroundColor: 'var(--bg-panel-header)' }}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-wider select-none"
          style={{ color: 'var(--text-muted)' }}
        >
          Project
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenImport}
            className="w-6 h-6 rounded-[4px] flex items-center justify-center transition-colors border border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)' }}
            title="Import File (.sv, .v, .qsf, .xdc)"
            aria-label="Import File"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-[4px] flex items-center justify-center transition-colors border border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)' }}
            title="Collapse Project Panel"
            aria-label="Collapse Project Panel"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 text-sm">
        {/* Section: Sources */}
        <div>
          <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider select-none text-[var(--text-muted)]">
            <span>Sources</span>
            {hasHdl && (
              <span className="text-[10px] font-mono font-normal text-[var(--text-muted)]">
                1 file
              </span>
            )}
          </div>
          {hasHdl ? (
            <div className="mt-0.5">
              <button
                onClick={() => onSelectFile('main.sv')}
                className={`w-full flex items-center justify-between px-2 h-[28px] rounded-[4px] text-xs transition-colors ${
                  activeView === 'code' || activeView === 'split'
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-border)] font-semibold shadow-xs'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode size={13} className="text-[var(--accent-primary)] shrink-0" />
                  <span className="truncate font-mono text-[11.5px]">main.sv</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] ml-2 shrink-0">
                  {lineCount}L
                </span>
              </button>
            </div>
          ) : (
            <div className="py-4 px-2 flex flex-col items-center text-center">
              <FileCode size={22} className="text-[var(--text-muted)] opacity-50 mb-1.5" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">No HDL Source</span>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mb-3 leading-snug">
                Import a Verilog file or open an example.
              </p>
              <div className="w-full flex flex-col gap-1.5">
                <button
                  onClick={onOpenImport}
                  className="w-full flex items-center justify-center gap-1.5 h-[28px] px-2 rounded-[4px] text-xs font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)] transition-colors shadow-xs"
                >
                  <Upload size={12} />
                  Import HDL
                </button>
                <button
                  onClick={() => navigate('/examples')}
                  className="w-full flex items-center justify-center gap-1.5 h-[28px] px-2 rounded-[4px] text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors"
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
          <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider select-none text-[var(--text-muted)]">
            <span>Constraints</span>
            {hasPins && (
              <span className="text-[10px] font-mono font-normal text-[var(--text-muted)]">
                1 file
              </span>
            )}
          </div>
          {hasPins ? (
            <div className="mt-0.5">
              <div
                className="w-full flex items-center justify-between px-2 h-[28px] rounded-[4px] text-xs hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)] border border-transparent"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText size={13} className="text-emerald-500 shrink-0" />
                  <span className="truncate font-mono text-[11.5px]">DE2_pin_assignments.qsf</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] ml-2 shrink-0">
                  {pinMappings.length} pins
                </span>
              </div>
            </div>
          ) : (
            <div className="px-2 py-1.5 text-[11px] text-[var(--text-muted)] italic">
              No pin constraint file loaded (.qsf)
            </div>
          )}
        </div>
      </div>

      {/* Footer / Add File Action */}
      <div
        className="p-2 border-t border-[var(--border-subtle)] shrink-0"
        style={{ backgroundColor: 'var(--bg-panel-header)' }}
      >
        <button
          onClick={onOpenImport}
          className="w-full h-[30px] flex items-center justify-center gap-1.5 px-3 rounded-[4px] text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors"
        >
          <Plus size={13} />
          Add / Import File
        </button>
      </div>
    </aside>
  );
};
