import React from 'react';
import {
  Play, RotateCcw, ZoomIn, ZoomOut, Maximize2, Settings,
  FolderOpen, FileCode, Upload, Terminal, Layers,
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
  editorOpen: boolean;
  consoleOpen: boolean;
  onToggleProjectPanel: () => void;
  onToggleObjectsPanel: () => void;
  onToggleEditor: () => void;
  onToggleConsole: () => void;
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
  editorOpen,
  consoleOpen,
  onToggleProjectPanel,
  onToggleObjectsPanel,
  onToggleEditor,
  onToggleConsole,
  onUpload,
  onCompile,
  onRun,
  onRestart,
  onZoomIn,
  onZoomOut,
  onZoomFit,
}) => {
  return (
    <header className="h-12 bg-[#0a1120] border-b border-[#1e293b] px-3 sm:px-4 flex items-center justify-between shrink-0 shadow-sm z-20 select-none text-slate-200">
      {/* ── Left: Panel View Toggles & Brand ────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          data-testid="wf-toggle-project"
          onClick={onToggleProjectPanel}
          title="Toggle Project Panel (Alt+P)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
            projectPanelOpen
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
              : 'bg-[#1e293b]/60 text-slate-400 border-[#334155] hover:bg-[#334155] hover:text-slate-200'
          }`}
        >
          <FolderOpen size={14} />
          <span className="hidden md:inline">Project</span>
        </button>

        <button
          data-testid="wf-toggle-objects"
          onClick={onToggleObjectsPanel}
          title="Toggle Objects Panel (Alt+O)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
            objectsPanelOpen
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
              : 'bg-[#1e293b]/60 text-slate-400 border-[#334155] hover:bg-[#334155] hover:text-slate-200'
          }`}
        >
          <Layers size={14} />
          <span className="hidden md:inline">Objects</span>
        </button>

        <button
          data-testid="wf-toggle-editor"
          onClick={onToggleEditor}
          title="Toggle Editor (Alt+E)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
            editorOpen
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
              : 'bg-[#1e293b]/60 text-slate-400 border-[#334155] hover:bg-[#334155] hover:text-slate-200'
          }`}
        >
          <FileCode size={14} />
          <span className="hidden md:inline">Editor</span>
        </button>

        <div className="w-px h-5 bg-[#1e293b] mx-1 hidden sm:block" />
        <span className="text-xs font-semibold text-slate-400 hidden lg:inline tracking-wide">
          WAVEFORM
        </span>
      </div>

      {/* ── Center: Engine Actions & Zoom ──────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Upload Button */}
        <button
          data-testid="wf-btn-upload"
          onClick={onUpload}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded text-xs font-medium bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#334155] transition-colors shadow-sm"
          title="Upload .sv / .v / .vcd file"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">Upload</span>
        </button>

        <div className="w-px h-5 bg-[#1e293b] mx-0.5" />

        {/* Compile Button */}
        <button
          data-testid="wf-btn-compile"
          onClick={onCompile}
          disabled={isCompiling}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded text-xs font-medium transition-all shadow-sm ${
            isCompiling
              ? 'bg-blue-600/40 text-blue-200 cursor-not-allowed border border-blue-500/30'
              : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.25)]'
          }`}
          title="Compile HDL with Icarus Verilog"
        >
          {isCompiling ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Settings size={14} />
          )}
          <span>{isCompiling ? 'Compiling...' : 'Compile'}</span>
        </button>

        {/* Run Button */}
        <button
          data-testid="wf-btn-run"
          onClick={onRun}
          disabled={!isCompiled || isCompiling || isPlaying}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded text-xs font-medium transition-all shadow-sm ${
            !isCompiled || isCompiling || isPlaying
              ? 'bg-emerald-950/40 text-emerald-500/40 border border-emerald-900/30 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
          }`}
          title="Run Simulation Playback"
        >
          <Play size={14} className={isPlaying ? 'animate-pulse' : ''} />
          <span>{isPlaying ? 'Playing...' : 'Run'}</span>
        </button>

        {/* Restart Button */}
        <button
          data-testid="wf-btn-restart"
          onClick={onRestart}
          disabled={!isCompiled}
          className="p-1.5 rounded text-xs font-medium bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white border border-[#334155] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Reset Playhead to Start"
        >
          <RotateCcw size={14} />
        </button>

        <div className="w-px h-5 bg-[#1e293b] mx-0.5" />

        {/* Zoom Controls */}
        <div className="flex items-center bg-[#0f172a] rounded border border-[#1e293b] p-0.5 shadow-inner">
          <button
            data-testid="wf-btn-zoom-out"
            onClick={onZoomOut}
            className="p-1 hover:bg-[#1e293b] hover:text-white rounded text-slate-400 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>

          <span
            data-testid="wf-zoom-level"
            className="text-[11px] font-mono px-1.5 min-w-[44px] text-center text-slate-300 select-none"
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
            className="p-1 hover:bg-[#1e293b] hover:text-white rounded text-slate-400 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>

          <button
            data-testid="wf-btn-zoom-fit"
            onClick={onZoomFit}
            className="flex items-center gap-1 px-1.5 py-0.5 ml-0.5 hover:bg-[#1e293b] hover:text-blue-300 rounded text-slate-400 transition-colors text-[10px] font-semibold border-l border-[#1e293b]"
            title="Zoom to Fit Full Simulation Duration (Alt+F)"
          >
            <Maximize2 size={11} />
            <span>Fit</span>
          </button>
        </div>
      </div>

      {/* ── Right: Real Timing Display & Console Toggle ─────────── */}
      <div className="flex items-center gap-2">
        {/* Read-Only Cursors & Delta Timing Display */}
        <div
          data-testid="wf-timing-display"
          className="hidden md:flex items-center gap-2.5 px-2.5 py-1 bg-[#0f172a] border border-[#1e293b] rounded font-mono text-[11px] text-slate-300 shadow-inner"
        >
          <div className="flex items-center gap-1">
            <span className="text-blue-400 font-bold">A:</span>
            <span className="text-slate-200">
              {isCompiled && timescale ? formatTime(currentTime, timescale) : '—'}
            </span>
          </div>

          <span className="text-slate-600">|</span>

          <div className="flex items-center gap-1">
            <span className="text-amber-400 font-bold">B:</span>
            <span className={isCompiled && cursorB !== null ? 'text-slate-200' : 'text-slate-500'}>
              {isCompiled && cursorB !== null ? formatTime(cursorB, timescale) : '—'}
            </span>
          </div>

          <span className="text-slate-600">|</span>

          <div className="flex items-center gap-1">
            <span className="text-emerald-400 font-bold">ΔT:</span>
            <span className={isCompiled && cursorB !== null ? 'text-emerald-300 font-semibold' : 'text-slate-500'}>
              {isCompiled && cursorB !== null ? formatTime(Math.abs(cursorB - currentTime), timescale) : '—'}
            </span>
          </div>
        </div>

        <div className="w-px h-5 bg-[#1e293b] hidden md:block" />

        {/* Console Toggle */}
        <button
          data-testid="wf-toggle-console"
          onClick={onToggleConsole}
          title="Toggle Console (Alt+T)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
            consoleOpen
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
              : 'bg-[#1e293b]/60 text-slate-400 border-[#334155] hover:bg-[#334155] hover:text-slate-200'
          }`}
        >
          <Terminal size={14} />
          <span className="hidden sm:inline">Console</span>
        </button>
      </div>
    </header>
  );
};
