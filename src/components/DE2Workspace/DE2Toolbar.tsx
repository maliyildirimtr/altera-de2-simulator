import React from 'react';
import { useBoardStore } from '../../store/boardStore';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Cpu,
  Upload,
  Columns2,
  Code,
  LayoutGrid,
  PanelLeft,
  PanelRight,
  Terminal,
} from 'lucide-react';

interface DE2ToolbarProps {
  activeView: 'board' | 'split' | 'code';
  onSelectView: (view: 'board' | 'split' | 'code') => void;
  onOpenImport: () => void;
  onCompile: () => void;
  isCompiling?: boolean;
  projectPanelOpen: boolean;
  onToggleProjectPanel: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  consoleOpen: boolean;
  onToggleConsole: () => void;
}

export const DE2Toolbar: React.FC<DE2ToolbarProps> = ({
  activeView,
  onSelectView,
  onOpenImport,
  onCompile,
  isCompiling = false,
  projectPanelOpen,
  onToggleProjectPanel,
  inspectorOpen,
  onToggleInspector,
  consoleOpen,
  onToggleConsole,
}) => {
  const {
    engine,
    isSimRunning,
    startAutoSimulation,
    stopAutoSimulation,
    tickClock,
    resetBoard,
    hdlCode,
  } = useBoardStore();

  const hasEngine = !!engine;
  const hasHdl = !!hdlCode && hdlCode.trim().length > 0;

  return (
    <header
      className="h-12 w-full bg-[#0a1120] border-b border-[#1e293b] px-3 flex items-center justify-between shrink-0 select-none z-20 text-xs"
      aria-label="DE2 Simulator Toolbar"
    >
      {/* ── Left: Project & Panel Toggle ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleProjectPanel}
          className={`p-1.5 rounded transition-colors ${
            projectPanelOpen
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={projectPanelOpen ? 'Hide Project Panel' : 'Show Project Panel'}
          aria-label="Toggle Project Panel"
        >
          <PanelLeft size={16} />
        </button>

        <div className="flex items-center gap-2 ml-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-blue-300 font-semibold text-[11px]">
            <Cpu size={13} className="text-blue-400" />
            <span>DE2 LAB</span>
          </div>

          <span className="text-slate-500">/</span>

          <span className="font-mono text-slate-300 font-medium">
            {hasHdl ? 'main.sv' : '(no source)'}
          </span>

          <div
            data-testid="engine-status"
            data-status={hasEngine ? 'ready' : 'uncompiled'}
            className={`w-2 h-2 rounded-full ${
              hasEngine ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
            }`}
            title={hasEngine ? 'Simulation Engine Ready' : 'Engine not compiled'}
          />
        </div>
      </div>

      {/* ── Center: View Mode Switcher (Board / Split / Code) ── */}
      <div className="flex items-center bg-[#070b14] p-0.5 rounded-lg border border-[#1e293b]">
        <button
          data-testid="view-board"
          onClick={() => onSelectView('board')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            activeView === 'board'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Board View — Full Virtual FPGA"
        >
          <LayoutGrid size={13} />
          <span className="hidden sm:inline">Board</span>
        </button>

        <button
          data-testid="view-split"
          onClick={() => onSelectView('split')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            activeView === 'split'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Split View — Editor + Board side by side"
        >
          <Columns2 size={13} />
          <span className="hidden sm:inline">Split</span>
        </button>

        <button
          data-testid="view-code"
          onClick={() => onSelectView('code')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            activeView === 'code'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Code View — Full Monaco HDL Editor"
        >
          <Code size={13} />
          <span className="hidden sm:inline">Editor</span>
        </button>
      </div>

      {/* ── Right: Actions & Tools ── */}
      <div className="flex items-center gap-1.5">
        {/* Import Files */}
        <button
          data-testid="de2-open-import"
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-[#1e293b] font-medium transition-colors"
          title="Import Verilog (.v, .sv) or Pin Constraints (.qsf)"
        >
          <Upload size={13} />
          <span className="hidden md:inline">Import</span>
        </button>

        <div className="w-px h-5 bg-[#1e293b] mx-0.5" />

        {/* Compile (Existing compileVerilog flow) */}
        <button
          data-testid="de2-compile"
          onClick={onCompile}
          disabled={isCompiling || !hasHdl}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold shadow-sm transition-colors"
          title="Compile Verilog Code"
        >
          <Zap size={13} />
          <span>{isCompiling ? 'Compiling...' : 'Compile'}</span>
        </button>

        {/* Auto Run / Pause */}
        <button
          data-testid="de2-run"
          data-running={isSimRunning ? 'true' : 'false'}
          onClick={() => {
            if (isSimRunning) stopAutoSimulation();
            else startAutoSimulation();
          }}
          disabled={!hasEngine}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none ${
            isSimRunning
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title={isSimRunning ? 'Pause Continuous Simulation' : 'Start Continuous Simulation'}
        >
          {isSimRunning ? <Pause size={13} /> : <Play size={13} />}
          <span className="hidden md:inline">{isSimRunning ? 'Pause' : 'Run'}</span>
        </button>

        {/* Clock Tick */}
        <button
          data-testid="de2-clock-step"
          onClick={() => tickClock()}
          disabled={!hasEngine}
          className="flex items-center gap-1 px-2 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
          title="Manual Clock Pulse (tickClock)"
        >
          <span>Step Clk</span>
        </button>

        {/* Reset Board */}
        <button
          data-testid="de2-reset"
          onClick={resetBoard}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Reset Board State (Switches, Keys, LEDs, HEX, Clock)"
          aria-label="Reset Board"
        >
          <RotateCcw size={15} />
        </button>

        <div className="w-px h-5 bg-[#1e293b] mx-0.5" />

        {/* Toggle Bottom Console */}
        <button
          onClick={onToggleConsole}
          className={`p-1.5 rounded transition-colors ${
            consoleOpen
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={consoleOpen ? 'Hide Console' : 'Show Console'}
          aria-label="Toggle Console"
        >
          <Terminal size={15} />
        </button>

        {/* Toggle Inspector */}
        <button
          onClick={onToggleInspector}
          className={`p-1.5 rounded transition-colors ${
            inspectorOpen
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title={inspectorOpen ? 'Hide Inspector' : 'Show Inspector'}
          aria-label="Toggle Inspector"
        >
          <PanelRight size={15} />
        </button>
      </div>
    </header>
  );
};
