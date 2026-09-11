import React from 'react';

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
  errorCount = 0,
  hasCircuit,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return {
          text: 'Schematic Ready',
          bg: 'rgba(34, 197, 94, 0.15)',
          color: '#22c55e',
          border: 'rgba(34, 197, 94, 0.3)',
          dot: '#22c55e',
        };
      case 'modified':
        return {
          text: 'Needs Synthesis',
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: 'rgba(245, 158, 11, 0.3)',
          dot: '#f59e0b',
        };
      case 'synthesizing':
        return {
          text: 'Synthesizing...',
          bg: 'rgba(56, 189, 248, 0.15)',
          color: '#38bdf8',
          border: 'rgba(56, 189, 248, 0.3)',
          dot: '#38bdf8',
        };
      case 'error':
        return {
          text: 'Error',
          bg: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: 'rgba(239, 68, 68, 0.3)',
          dot: '#ef4444',
        };
      case 'no_source':
      default:
        return {
          text: 'No Source',
          bg: 'rgba(148, 163, 184, 0.15)',
          color: '#94a3b8',
          border: 'rgba(148, 163, 184, 0.3)',
          dot: '#94a3b8',
        };
    }
  };

  const badge = getStatusBadge();

  const btnBaseStyle: React.CSSProperties = {
    padding: '4px 8px',
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--text-primary)',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s ease',
  };

  return (
    <header
      data-testid="schematic-toolbar"
      style={{
        height: '42px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        userSelect: 'none',
        zIndex: 20,
        flexShrink: 0,
      }}
    >
      {/* Left: Branding & Status & Panels */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          data-testid="schematic-project-toggle"
          title={isProjectOpen ? 'Collapse Project Explorer' : 'Expand Project Explorer'}
          onClick={onToggleProject}
          style={{
            ...btnBaseStyle,
            border: isProjectOpen ? '1px solid var(--border-color)' : '1px solid transparent',
            background: isProjectOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
            padding: '4px 6px',
          }}
        >
          <span style={{ fontSize: '1rem' }}>📁</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>📐</span>
          <span style={{ fontWeight: 600, fontSize: '0.88rem', letterSpacing: '-0.01em' }}>
            Schematic
          </span>
        </div>

        {/* Status Badge */}
        <div
          data-testid="schematic-status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            color: badge.color,
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: badge.dot,
            }}
          />
          <span>{badge.text}</span>
        </div>
      </div>

      {/* Center: View Modes */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '2px',
          gap: '2px',
        }}
      >
        <button
          data-testid="view-mode-split"
          onClick={() => onViewModeChange('split')}
          style={{
            ...btnBaseStyle,
            padding: '3px 10px',
            fontSize: '0.78rem',
            background: viewMode === 'split' ? 'var(--accent-color)' : 'transparent',
            color: viewMode === 'split' ? '#fff' : 'var(--text-secondary)',
            fontWeight: viewMode === 'split' ? 600 : 500,
          }}
        >
          Split View
        </button>
        <button
          data-testid="view-mode-schematic"
          onClick={() => onViewModeChange('schematic')}
          style={{
            ...btnBaseStyle,
            padding: '3px 10px',
            fontSize: '0.78rem',
            background: viewMode === 'schematic' ? 'var(--accent-color)' : 'transparent',
            color: viewMode === 'schematic' ? '#fff' : 'var(--text-secondary)',
            fontWeight: viewMode === 'schematic' ? 600 : 500,
          }}
        >
          Schematic
        </button>
        <button
          data-testid="view-mode-code"
          onClick={() => onViewModeChange('code')}
          style={{
            ...btnBaseStyle,
            padding: '3px 10px',
            fontSize: '0.78rem',
            background: viewMode === 'code' ? 'var(--accent-color)' : 'transparent',
            color: viewMode === 'code' ? '#fff' : 'var(--text-secondary)',
            fontWeight: viewMode === 'code' ? 600 : 500,
          }}
        >
          Code
        </button>
      </div>

      {/* Right: Actions, Zoom/Pan & Toggle Utilities */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          data-testid="schematic-upload-btn"
          onClick={onUploadClick}
          title="Upload Verilog/SystemVerilog files"
          style={{
            ...btnBaseStyle,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <span>📂</span>
          <span>Upload</span>
        </button>

        <button
          data-testid="schematic-synthesize-btn"
          onClick={onSynthesize}
          disabled={status === 'synthesizing'}
          title="Synthesize HDL into Logic Schematic"
          style={{
            ...btnBaseStyle,
            background: status === 'synthesizing' ? 'rgba(56, 189, 248, 0.4)' : 'var(--accent-color)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: status === 'synthesizing' ? 'not-allowed' : 'pointer',
          }}
        >
          <span>{status === 'synthesizing' ? '⏳' : '⚙️'}</span>
          <span>{status === 'synthesizing' ? 'Synthesizing...' : 'Synthesize'}</span>
        </button>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 4px' }} />

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            data-testid="schematic-zoom-out-btn"
            onClick={onZoomOut}
            disabled={!hasCircuit}
            title="Zoom Out (Ctrl -)"
            style={{
              ...btnBaseStyle,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              opacity: hasCircuit ? 1 : 0.5,
            }}
          >
            <span>➖</span>
          </button>
          <button
            data-testid="schematic-fit-btn"
            onClick={onFit}
            disabled={!hasCircuit}
            title="Fit Schematic to Viewport"
            style={{
              ...btnBaseStyle,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              opacity: hasCircuit ? 1 : 0.5,
              fontSize: '0.78rem',
            }}
          >
            <span>Fit</span>
          </button>
          <button
            data-testid="schematic-zoom-in-btn"
            onClick={onZoomIn}
            disabled={!hasCircuit}
            title="Zoom In (Ctrl +)"
            style={{
              ...btnBaseStyle,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              opacity: hasCircuit ? 1 : 0.5,
            }}
          >
            <span>➕</span>
          </button>
          <button
            data-testid="schematic-reset-view-btn"
            onClick={onResetView}
            disabled={!hasCircuit}
            title="Reset Pan & Zoom"
            style={{
              ...btnBaseStyle,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              opacity: hasCircuit ? 1 : 0.5,
              fontSize: '0.78rem',
            }}
          >
            <span>1:1</span>
          </button>
        </div>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 4px' }} />

        {/* Truth Table Toggle */}
        <button
          data-testid="schematic-truth-table-toggle"
          onClick={onToggleTruthTable}
          disabled={!hasCircuit}
          title={isTruthTableOpen ? 'Close Truth Table' : 'Open Interactive Truth Table'}
          style={{
            ...btnBaseStyle,
            background: isTruthTableOpen ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-primary)',
            border: isTruthTableOpen ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
            color: isTruthTableOpen ? '#38bdf8' : 'var(--text-primary)',
            opacity: hasCircuit ? 1 : 0.5,
          }}
        >
          <span>📊</span>
          <span>Truth Table</span>
        </button>

        {/* Inspector Toggle */}
        <button
          data-testid="schematic-inspector-toggle"
          onClick={onToggleInspector}
          title={isInspectorOpen ? 'Collapse Inspector' : 'Expand Inspector'}
          style={{
            ...btnBaseStyle,
            background: isInspectorOpen ? 'rgba(255,255,255,0.06)' : 'var(--bg-primary)',
            border: isInspectorOpen ? '1px solid var(--border-color)' : '1px solid var(--border-color)',
          }}
        >
          <span>🔍</span>
          <span>Inspector</span>
        </button>

        {/* Console Toggle */}
        <button
          data-testid="schematic-console-toggle"
          onClick={onToggleConsole}
          title={isConsoleOpen ? 'Close Console / Problems' : 'Open Console / Problems'}
          style={{
            ...btnBaseStyle,
            background: isConsoleOpen ? 'rgba(255,255,255,0.06)' : 'var(--bg-primary)',
            border: isConsoleOpen ? '1px solid var(--border-color)' : '1px solid var(--border-color)',
          }}
        >
          <span>📟</span>
          <span>Console</span>
          {errorCount > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.68rem',
                borderRadius: '8px',
                padding: '1px 5px',
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              {errorCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
