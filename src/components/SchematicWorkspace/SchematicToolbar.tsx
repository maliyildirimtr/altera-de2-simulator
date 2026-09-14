import React from 'react';
import {
  RotateCcw,
  Upload,
  Cpu,
  FolderTree,
  Table2,
  Info,
  Terminal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  GitGraph,
} from 'lucide-react';

export type SynthesisStatus = 'no_source' | 'ready' | 'synthesizing' | 'modified' | 'error';
export type ViewMode = 'schematic' | 'split' | 'code';

interface SchematicToolbarProps {
  status: SynthesisStatus;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSynthesize: () => void;
  onUploadClick: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onResetView: () => void;
  isTruthTableOpen: boolean;
  onToggleTruthTable: () => void;
  isProjectOpen: boolean;
  onToggleProject: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  isConsoleOpen: boolean;
  onToggleConsole: () => void;
  onResetLayout?: () => void;
  errorCount?: number;
  hasCircuit: boolean;
}

export const SchematicToolbar: React.FC<SchematicToolbarProps> = ({
  status,
  viewMode,
  onViewModeChange,
  onSynthesize,
  onUploadClick,
  onZoomIn,
  onZoomOut,
  onFit,
  onResetView,
  isTruthTableOpen,
  onToggleTruthTable,
  isProjectOpen,
  onToggleProject,
  isInspectorOpen,
  onToggleInspector,
  isConsoleOpen,
  onToggleConsole,
  onResetLayout,
  errorCount = 0,
  hasCircuit,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return {
          text: 'Schematic Ready',
          bg: 'rgba(34, 197, 94, 0.12)',
          color: '#16a34a',
          border: 'rgba(34, 197, 94, 0.25)',
          dot: '#16a34a',
        };
      case 'modified':
        return {
          text: 'Needs Synthesis',
          bg: 'rgba(234, 179, 8, 0.12)',
          color: '#ca8a04',
          border: 'rgba(234, 179, 8, 0.25)',
          dot: '#ca8a04',
        };
      case 'synthesizing':
        return {
          text: 'Synthesizing...',
          bg: 'rgba(37, 99, 235, 0.12)',
          color: 'var(--accent-primary)',
          border: 'rgba(37, 99, 235, 0.25)',
          dot: 'var(--accent-primary)',
        };
      case 'error':
        return {
          text: 'Error',
          bg: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          border: 'rgba(239, 68, 68, 0.25)',
          dot: '#ef4444',
        };
      case 'no_source':
      default:
        return {
          text: 'No Source',
          bg: 'var(--bg-surface)',
          color: 'var(--text-muted)',
          border: 'var(--border-subtle)',
          dot: 'var(--text-muted)',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <header
      data-testid="schematic-toolbar"
      className="h-[42px] px-3 flex items-center justify-between shrink-0 z-20 select-none border-b min-w-0"
      style={{
        backgroundColor: 'var(--bg-toolbar)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Left: Branding & Status & Panels */}
      <div className="flex items-center gap-2">
        <button
          data-testid="schematic-project-toggle"
          title={isProjectOpen ? 'Collapse Project Explorer' : 'Expand Project Explorer'}
          onClick={onToggleProject}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors ${
            isProjectOpen
              ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-border)] font-semibold shadow-xs'
              : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FolderTree size={14} />
          <span className="hidden md:inline">Project</span>
        </button>

        <div className="flex items-center gap-1.5 ml-1">
          <GitGraph size={15} style={{ color: 'var(--accent-primary)' }} />
          <span className="font-semibold text-xs tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Schematic
          </span>
        </div>

        {/* Status Badge */}
        <div
          data-testid="schematic-status"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-medium border"
          style={{
            background: badge.bg,
            borderColor: badge.border,
            color: badge.color,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: badge.dot }}
          />
          <span>{badge.text}</span>
        </div>
      </div>

      {/* Center: View Modes & Reset Layout */}
      <div className="flex items-center gap-1.5">
        <div
          className="flex items-center p-0.5 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-input)] gap-0.5"
          role="tablist"
        >
          <button
            data-testid="view-mode-schematic"
            onClick={() => onViewModeChange('schematic')}
            className={`px-2.5 py-1 rounded-[3px] text-xs transition-colors ${
              viewMode === 'schematic'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
            }`}
          >
            Schematic
          </button>
          <button
            data-testid="view-mode-split"
            onClick={() => onViewModeChange('split')}
            className={`px-2.5 py-1 rounded-[3px] text-xs transition-colors ${
              viewMode === 'split'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
            }`}
          >
            Split View
          </button>
          <button
            data-testid="view-mode-code"
            onClick={() => onViewModeChange('code')}
            className={`px-2.5 py-1 rounded-[3px] text-xs transition-colors ${
              viewMode === 'code'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
            }`}
          >
            Code
          </button>
        </div>

        {onResetLayout && (
          <button
            data-testid="schematic-reset-layout-btn"
            onClick={onResetLayout}
            title="Reset Workspace Layout"
            className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors border border-transparent"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* Right: Actions, Zoom/Pan & Toggle Utilities */}
      <div className="flex items-center gap-1.5">
        <button
          data-testid="schematic-upload-btn"
          onClick={onUploadClick}
          title="Upload Verilog/SystemVerilog files"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-colors shadow-xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <Upload size={13} />
          <span className="hidden sm:inline">Upload</span>
        </button>

        <button
          data-testid="schematic-synthesize-btn"
          onClick={onSynthesize}
          disabled={status === 'synthesizing'}
          title="Synthesize HDL into Logic Schematic"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-medium transition-all shadow-xs ${
            status === 'synthesizing'
              ? 'opacity-60 cursor-not-allowed bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-[0_0_10px_rgba(37,99,235,0.25)]'
          }`}
        >
          {status === 'synthesizing' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Cpu size={13} />
          )}
          <span>{status === 'synthesizing' ? 'Synthesizing...' : 'Synthesize'}</span>
        </button>

        <div className="w-px h-4 bg-[var(--border-subtle)] mx-0.5 hidden sm:block" />

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center rounded-[4px] border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-input)]">
          <button
            data-testid="schematic-zoom-out-btn"
            onClick={onZoomOut}
            disabled={!hasCircuit}
            title="Zoom Out (Ctrl -)"
            className="p-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-[3px] text-[var(--text-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ZoomOut size={13} />
          </button>
          <button
            data-testid="schematic-fit-btn"
            onClick={onFit}
            disabled={!hasCircuit}
            title="Fit Schematic to Viewport"
            className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-[3px] text-[var(--text-muted)] transition-colors text-[10px] font-medium disabled:opacity-40 disabled:cursor-not-allowed border-x border-[var(--border-subtle)]"
          >
            <Maximize2 size={11} />
            <span>Fit</span>
          </button>
          <button
            data-testid="schematic-zoom-in-btn"
            onClick={onZoomIn}
            disabled={!hasCircuit}
            title="Zoom In (Ctrl +)"
            className="p-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-[3px] text-[var(--text-muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ZoomIn size={13} />
          </button>
          <button
            data-testid="schematic-reset-view-btn"
            onClick={onResetView}
            disabled={!hasCircuit}
            title="Reset Pan & Zoom"
            className="px-1.5 py-0.5 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-[3px] text-[var(--text-muted)] transition-colors text-[10px] font-mono font-medium disabled:opacity-40 disabled:cursor-not-allowed border-l border-[var(--border-subtle)]"
          >
            <span>1:1</span>
          </button>
        </div>

        <div className="w-px h-4 bg-[var(--border-subtle)] mx-0.5 hidden md:block" />

        {/* Truth Table Toggle */}
        <button
          data-testid="schematic-truth-table-toggle"
          onClick={onToggleTruthTable}
          disabled={!hasCircuit}
          title={isTruthTableOpen ? 'Close Truth Table' : 'Open Interactive Truth Table'}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isTruthTableOpen
              ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-border)] font-semibold shadow-xs'
              : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Table2 size={13} />
          <span className="hidden lg:inline">Truth Table</span>
        </button>

        {/* Inspector Toggle */}
        <button
          data-testid="schematic-inspector-toggle"
          onClick={onToggleInspector}
          title={isInspectorOpen ? 'Collapse Inspector' : 'Expand Inspector'}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors ${
            isInspectorOpen
              ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-border)] font-semibold shadow-xs'
              : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Info size={13} />
          <span className="hidden lg:inline">Inspector</span>
        </button>

        {/* Console Toggle */}
        <button
          data-testid="schematic-console-toggle"
          onClick={onToggleConsole}
          title={isConsoleOpen ? 'Close Console / Problems' : 'Open Console / Problems'}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors ${
            isConsoleOpen
              ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-border)] font-semibold shadow-xs'
              : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Terminal size={13} />
          <span className="hidden sm:inline">Console</span>
          {errorCount > 0 && (
            <span className="text-[10px] font-mono px-1 py-0.2 bg-red-500/10 text-red-500 rounded font-semibold border border-red-500/20">
              {errorCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
