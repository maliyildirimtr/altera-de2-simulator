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
      <div className="flex-1 overflow-y-auto p-2 space-y-4 text-sm">
        {/* Section: Sources */}
        <div>
          <div
            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider select-none"
            style={{ color: 'var(--text-muted)' }}
          >
            Sources
          </div>
          {hasHdl ? (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => onSelectFile('main.sv')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-[4px] text-xs transition-colors ${
                  activeView === 'code' || activeView === 'split'
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-border)] font-semibold'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode size={14} className="text-blue-500 shrink-0" />
                  <span className="truncate font-mono">main.sv</span>
                </div>
                <span
                  className="text-[10px] font-mono ml-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {lineCount}L
                </span>
              </button>
            </div>
          ) : (
            <div
              className="p-3 border rounded-[4px] mt-1 text-center"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                No HDL source loaded
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={onOpenImport}
                  className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-[4px] text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--accent-subtle)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  <Upload size={12} />
                  Import HDL
                </button>
                <button
                  onClick={() => navigate('/examples')}
                  className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-[4px] text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
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
          <div
            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider select-none"
            style={{ color: 'var(--text-muted)' }}
          >
            Constraints
          </div>
          {hasPins ? (
            <div className="mt-1 space-y-0.5">
              <div
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-[4px] text-xs hover:bg-[var(--bg-hover)] transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText size={14} className="text-emerald-500 shrink-0" />
                  <span className="truncate font-mono">DE2_pin_assignments.qsf</span>
                </div>
                <span
                  className="text-[10px] font-mono ml-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {pinMappings.length} pins
                </span>
              </div>
            </div>
          ) : (
            <div
              className="px-2 py-2 text-xs italic"
              style={{ color: 'var(--text-muted)' }}
            >
              No constraint file (.qsf)
            </div>
          )}
        </div>
      </div>

      {/* Footer / Add File Action */}
      <div
        className="p-2 border-t shrink-0"
        style={{
          backgroundColor: 'var(--bg-panel-header)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          onClick={onOpenImport}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[4px] text-xs font-medium border transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <Plus size={13} />
          Add / Import File
        </button>
      </div>
    </aside>
  );
};
