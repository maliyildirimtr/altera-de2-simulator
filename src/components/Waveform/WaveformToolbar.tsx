import React from 'react';
import {
  Play, RotateCcw, ZoomIn, ZoomOut, Maximize2, Settings,
  FolderOpen, FileCode, Upload, Terminal, Layers, Activity, Columns,
} from 'lucide-react';
import type { VCDTimescale } from '../../services/vcdParser';
import { formatTime } from '../../services/waveformRenderer';

export interface WaveformToolbarProps {
  fileName?: string | null;
  isCompiled: boolean;
  isCompiling: boolean;
  isSimRunning: boolean;
  isPlaying?: boolean;
  zoomLevel: number;
  currentTime: number;
  cursorB: number | null;
  timescale: VCDTimescale | undefined;
  projectPanelOpen: boolean;
  objectsPanelOpen: boolean;
  editorOpen?: boolean;
  consoleOpen: boolean;
  mainView: 'waveform' | 'editor' | 'split';
  onChangeMainView: (view: 'waveform' | 'editor' | 'split') => void;
  onToggleProjectPanel: () => void;
  onToggleObjectsPanel: () => void;
  onToggleEditor?: () => void;
  onToggleConsole: () => void;
  onResetLayout?: () => void;
  onUpload: () => void;
  onCompile: () => void;
  onRun: () => void;
  onRestart: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
}

export const WaveformToolbar: React.FC<WaveformToolbarProps> = ({
  isCompiled,
  isCompiling,
  isPlaying = false,
  zoomLevel,
  currentTime,
  cursorB,
  timescale,
  projectPanelOpen,
  objectsPanelOpen,
  consoleOpen,
  mainView,
  onChangeMainView,
  onToggleProjectPanel,
  onToggleObjectsPanel,
  onToggleEditor,
  onToggleConsole,
  onResetLayout,
  onUpload,
  onCompile,
  onRun,
  onRestart,
  onZoomIn,
  onZoomOut,
  onZoomFit,
}) => {
  return (
    <header
      className="h-[42px] px-3 sm:px-4 flex items-center justify-between shrink-0 z-20 select-none border-b min-w-0"
      style={{
        backgroundColor: 'var(--bg-toolbar)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      {/* ── Left: Panel View Toggles & Segmented View Switcher ─────── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
        <button
          data-testid="wf-toggle-project"
          onClick={onToggleProjectPanel}
          title="Toggle Project Panel (Alt+P)"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors ${
            projectPanelOpen
              ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-border)] font-semibold shadow-xs'
              : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FolderOpen size={13} />
          <span className="hidden md:inline">Project</span>
        </button>

        <button
          data-testid="wf-toggle-objects"
          onClick={onToggleObjectsPanel}
          title="Toggle Objects Panel (Alt+O)"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors ${
            objectsPanelOpen
              ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-border)] font-semibold shadow-xs'
              : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers size={13} />
          <span className="hidden md:inline">Objects</span>
        </button>

        <div className="w-px h-4 bg-[var(--border-subtle)] mx-0.5 hidden sm:block" />

        {/* ── Primary View Segmented Switcher ── */}
        <div
          className="flex items-center p-0.5 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-input)] gap-0.5"
          role="tablist"
        >
          <button
            data-testid="wf-view-waveform"
            role="tab"
            aria-selected={mainView === 'waveform'}
            onClick={() => onChangeMainView('waveform')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs transition-colors ${
              mainView === 'waveform'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
            }`}
            title="Waveform View"
          >
            <Activity size={13} />
            <span className="hidden sm:inline">Waveform</span>
          </button>

          <button
            data-testid="wf-view-editor"
            data-legacy-toggle="wf-toggle-editor"
            role="tab"
            aria-selected={mainView === 'editor'}
            onClick={() => {
              onChangeMainView('editor');
              if (onToggleEditor) onToggleEditor();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs transition-colors ${
              mainView === 'editor'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
            }`}
            title="Code Editor View (Alt+E)"
          >
            <FileCode size={13} />
            <span className="hidden xl:inline">Code </span>
            <span className="hidden sm:inline">Editor</span>
          </button>

          <button
            data-testid="wf-view-split"
            role="tab"
            aria-selected={mainView === 'split'}
            onClick={() => onChangeMainView('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs transition-colors ${
              mainView === 'split'
                ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
            }`}
            title="Split View (Editor + Waveform)"
          >
            <Columns size={13} />
            <span className="hidden lg:inline">Split</span>
          </button>
        </div>

        {onResetLayout && (
          <button
            data-testid="wf-reset-layout"
            onClick={onResetLayout}
            title="Reset Workspace Layout"
            aria-label="Reset Workspace Layout"
            className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors border border-transparent flex items-center"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* ── Center: Engine Actions & Zoom ──────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Upload Button */}
        <button
          data-testid="wf-btn-upload"
          onClick={onUpload}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-colors shadow-xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          title="Upload .sv / .v / .vcd file"
        >
          <Upload size={13} />
          <span className="hidden md:inline">Upload</span>
        </button>

        <div className="w-px h-4 bg-[var(--border-subtle)] mx-0.5 hidden sm:block" />

        {/* Compile Button */}
        <button
          data-testid="wf-btn-compile"
          onClick={onCompile}
          disabled={isCompiling}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-medium transition-colors shadow-xs ${
            isCompiling
              ? 'opacity-60 cursor-not-allowed bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white'
          }`}
          title="Compile HDL with Icarus Verilog"
        >
          {isCompiling ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Settings size={13} />
          )}
          <span>{isCompiling ? 'Compiling...' : 'Compile'}</span>
        </button>

        {/* Run Button (Preserves exact !isCompiled || isCompiling || isPlaying logic; neutral disabled styling without green glow) */}
        <button
          data-testid="wf-btn-run"
          onClick={onRun}
          disabled={!isCompiled || isCompiling || isPlaying}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-medium transition-colors shadow-xs ${
            !isCompiled || isCompiling || isPlaying
              ? 'bg-[var(--bg-surface)] text-[var(--text-disabled)] border border-[var(--border-subtle)] opacity-40 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title="Run Simulation Playback"
        >
          <Play size={13} className={isPlaying ? 'opacity-80' : ''} />
          <span>{isPlaying ? 'Playing...' : 'Run'}</span>
        </button>

        {/* Restart Button */}
        <button
          data-testid="wf-btn-restart"
          onClick={onRestart}
          disabled={!isCompiled}
          className="hidden sm:flex p-1.5 rounded-[4px] text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          title="Reset Playhead to Start"
          aria-label="Reset Playhead to Start"
        >
          <RotateCcw size={13} />
        </button>

        <div className="w-px h-4 bg-[var(--border-subtle)] mx-0.5 hidden md:block" />

        {/* Zoom Controls */}
        <div className="flex items-center rounded-[4px] border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-input)]">
          <button
            data-testid="wf-btn-zoom-out"
            onClick={onZoomOut}
            className="hidden md:flex p-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-[3px] text-[var(--text-muted)] transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>

          <span
            data-testid="wf-zoom-level"
            className="text-[11px] font-mono px-1.5 min-w-[44px] text-center select-none text-[var(--text-secondary)] hidden lg:inline"
          >
            {(() => {
              if (zoomLevel >= 10) return `${zoomLevel.toFixed(0)}x`;
              if (zoomLevel >= 1) return `${zoomLevel.toFixed(1)}x`;
              if (zoomLevel >= 0.1) return `${zoomLevel.toFixed(2)}x`;
              if (zoomLevel >= 0.01) return `${zoomLevel.toFixed(3)}x`;
              return `${zoomLevel.toFixed(4)}x`;
            })()}
          </span>

          <button
            data-testid="wf-btn-zoom-in"
            onClick={onZoomIn}
            className="hidden md:flex p-1 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-[3px] text-[var(--text-muted)] transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn size={13} />
          </button>

          <button
            data-testid="wf-btn-zoom-fit"
            onClick={onZoomFit}
            className="flex items-center gap-1 px-1.5 py-0.5 ml-0 md:ml-0.5 hover:bg-[var(--bg-hover)] hover:text-[var(--accent-primary)] rounded-[3px] text-[var(--text-muted)] transition-colors text-[10px] font-medium md:border-l md:border-[var(--border-subtle)]"
            title="Zoom to Fit Full Simulation Duration (Alt+F)"
            aria-label="Zoom to Fit Full Simulation Duration (Alt+F)"
          >
            <Maximize2 size={11} />
            <span className="hidden xl:inline">Fit</span>
          </button>
        </div>
      </div>

      {/* ── Right: Real Timing Display & Console Toggle ─────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Read-Only Cursors & Delta Timing Display */}
        <div
          data-testid="wf-timing-display"
          className="hidden xl:flex items-center gap-2.5 px-2.5 py-1 border border-[var(--border-subtle)] rounded-[4px] font-mono text-[11px] bg-[var(--bg-input)] text-[var(--text-secondary)] shadow-xs"
        >
          <div className="flex items-center gap-1">
            <span className="text-blue-400 font-semibold">A:</span>
            <span className="text-[var(--text-primary)] tabular-nums">
              {isCompiled && timescale ? formatTime(currentTime, timescale) : '—'}
            </span>
          </div>

          <span className="text-[var(--border-subtle)]">|</span>

          <div className="flex items-center gap-1">
            <span className="text-amber-400 font-semibold">B:</span>
            <span className={`tabular-nums ${isCompiled && cursorB !== null ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
              {isCompiled && cursorB !== null ? formatTime(cursorB, timescale) : '—'}
            </span>
          </div>

          <span className="text-[var(--border-subtle)]">|</span>

          <div className="flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">ΔT:</span>
            <span className={`tabular-nums ${isCompiled && cursorB !== null ? 'text-emerald-400 font-semibold' : 'text-[var(--text-muted)]'}`}>
              {isCompiled && cursorB !== null ? formatTime(Math.abs(cursorB - currentTime), timescale) : '—'}
            </span>
          </div>
        </div>

        <div className="w-px h-4 bg-[var(--border-subtle)] hidden xl:block" />

        {/* Console Toggle */}
        <button
          data-testid="wf-toggle-console"
          onClick={onToggleConsole}
          title="Toggle Console (Alt+T)"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-xs font-medium border transition-colors ${
            consoleOpen
              ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border-[var(--accent-border)] font-semibold shadow-xs'
              : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Terminal size={13} />
          <span className="hidden sm:inline">Console</span>
        </button>
      </div>
    </header>
  );
};
