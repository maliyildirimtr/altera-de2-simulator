import React, { useState, useRef, useEffect } from 'react';
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
  MoreHorizontal,
  Clock,
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
  onResetLayout?: () => void;
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
  onResetLayout,
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

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const hasEngine = !!engine;
  const hasHdl = !!hdlCode && hdlCode.trim().length > 0;

  // Close overflow menu on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [overflowOpen]);

  return (
    <header
      className="h-12 w-full px-3 flex items-center justify-between shrink-0 select-none z-20 text-xs border-b transition-colors relative"
      style={{
        backgroundColor: 'var(--bg-toolbar)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
      aria-label="DE2 Simulator Toolbar"
    >
      {/* ── Left: Project Toggle & Status Indicator ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onToggleProjectPanel}
          className="p-1.5 rounded transition-colors hidden sm:flex items-center justify-center"
          style={{
            color: projectPanelOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
            backgroundColor: projectPanelOpen ? 'var(--accent-subtle)' : 'transparent',
          }}
          title={projectPanelOpen ? 'Hide Project Panel' : 'Show Project Panel'}
          aria-label="Toggle Project Panel"
        >
          <PanelLeft size={16} />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded border text-[11px] font-semibold"
            style={{
              backgroundColor: 'var(--accent-subtle)',
              borderColor: 'var(--accent-border)',
              color: 'var(--accent-primary)',
            }}
          >
            <Cpu size={13} />
            <span className="hidden xs:inline">DE2 LAB</span>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span style={{ color: 'var(--border-strong)' }}>/</span>
            <span
              className="font-mono font-medium max-w-[120px] truncate text-[11px]"
              style={{ color: 'var(--text-secondary)' }}
              title={hasHdl ? 'main.sv' : '(no source)'}
            >
              {hasHdl ? 'main.sv' : '(no source)'}
            </span>
          </div>

          <div
            data-testid="engine-status"
            data-status={hasEngine ? 'ready' : 'uncompiled'}
            className={`w-2 h-2 rounded-full shrink-0 ${
              hasEngine ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' : 'bg-slate-500'
            }`}
            title={hasEngine ? 'Simulation Engine Ready' : 'Engine not compiled'}
          />
        </div>
      </div>

      {/* ── Center: View Mode Switcher (Board / Split / Code) ── */}
      <div
        className="flex items-center p-0.5 rounded-lg border shrink-0 mx-1"
        style={{
          backgroundColor: 'var(--bg-app)',
          borderColor: 'var(--border-subtle)',
        }}
        role="group"
        aria-label="Workspace View Mode"
      >
        <button
          data-testid="view-board"
          onClick={() => onSelectView('board')}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition-all"
          style={{
            backgroundColor: activeView === 'board' ? 'var(--accent-primary)' : 'transparent',
            color: activeView === 'board' ? '#FFFFFF' : 'var(--text-secondary)',
          }}
          title="Board View — Full Virtual FPGA"
          aria-label="Board View"
          aria-pressed={activeView === 'board'}
        >
          <LayoutGrid size={13} />
          <span className="hidden md:inline">Board</span>
        </button>

        <button
          data-testid="view-split"
          onClick={() => onSelectView('split')}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition-all"
          style={{
            backgroundColor: activeView === 'split' ? 'var(--accent-primary)' : 'transparent',
            color: activeView === 'split' ? '#FFFFFF' : 'var(--text-secondary)',
          }}
          title="Split View — Editor + Board side by side"
          aria-label="Split View"
          aria-pressed={activeView === 'split'}
        >
          <Columns2 size={13} />
          <span className="hidden md:inline">Split</span>
        </button>

        <button
          data-testid="view-code"
          onClick={() => onSelectView('code')}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition-all"
          style={{
            backgroundColor: activeView === 'code' ? 'var(--accent-primary)' : 'transparent',
            color: activeView === 'code' ? '#FFFFFF' : 'var(--text-secondary)',
          }}
          title="Code View — Full Monaco HDL Editor"
          aria-label="Code View"
          aria-pressed={activeView === 'code'}
        >
          <Code size={13} />
          <span className="hidden md:inline">Editor</span>
        </button>
      </div>

      {/* ── Right: Actions & Tools ── */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Desktop & Tablet Controls (>= 768px) */}
        <div className="hidden md:flex items-center gap-1 sm:gap-1.5">
          {/* Import Files */}
          <button
            data-testid="de2-open-import"
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-2 py-1 rounded border font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="Import Verilog (.v, .sv) or Pin Constraints (.qsf)"
            aria-label="Import HDL"
          >
            <Upload size={13} />
            <span className="hidden xl:inline">Import</span>
          </button>

          <div
            className="w-px h-5 mx-0.5"
            style={{ backgroundColor: 'var(--border-subtle)' }}
          />

          {/* Compile */}
          <button
            data-testid="de2-compile"
            onClick={onCompile}
            disabled={isCompiling || !hasHdl}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded text-white font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{
              backgroundColor: 'var(--accent-primary)',
            }}
            onMouseEnter={(e) => {
              if (!isCompiling && hasHdl) e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
            }}
            title="Compile Verilog Code"
            aria-label="Compile Code"
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none text-white ${
              isSimRunning
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            title={isSimRunning ? 'Pause Continuous Simulation' : 'Start Continuous Simulation'}
            aria-label={isSimRunning ? 'Pause Simulation' : 'Run Simulation'}
          >
            {isSimRunning ? <Pause size={13} /> : <Play size={13} />}
            <span className="hidden lg:inline">{isSimRunning ? 'Pause' : 'Run'}</span>
          </button>

          {/* Step Clock */}
          <button
            data-testid="de2-clock-step"
            onClick={() => tickClock()}
            disabled={!hasEngine}
            className="flex items-center gap-1 px-2 py-1 rounded border font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              borderColor: 'rgba(245, 158, 11, 0.25)',
              color: 'var(--state-warning)',
            }}
            title="Manual Clock Pulse (tickClock)"
            aria-label="Step Clock"
          >
            <Clock size={12} />
            <span className="hidden xl:inline">Step Clk</span>
          </button>

          {/* Reset Board */}
          <button
            data-testid="de2-reset"
            onClick={resetBoard}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Reset Board State (Switches, Keys, LEDs, HEX, Clock)"
            aria-label="Reset Board"
          >
            <RotateCcw size={15} />
          </button>

          <div
            className="w-px h-5 mx-0.5"
            style={{ backgroundColor: 'var(--border-subtle)' }}
          />

          {/* Toggle Bottom Console */}
          <button
            onClick={onToggleConsole}
            className="p-1.5 rounded transition-colors"
            style={{
              color: consoleOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: consoleOpen ? 'var(--accent-subtle)' : 'transparent',
            }}
            title={consoleOpen ? 'Hide Console' : 'Show Console'}
            aria-label="Toggle Console"
          >
            <Terminal size={15} />
          </button>

          {/* Toggle Inspector */}
          <button
            onClick={onToggleInspector}
            className="p-1.5 rounded transition-colors"
            style={{
              color: inspectorOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: inspectorOpen ? 'var(--accent-subtle)' : 'transparent',
            }}
            title={inspectorOpen ? 'Hide Inspector' : 'Show Inspector'}
            aria-label="Toggle Inspector"
          >
            <PanelRight size={15} />
          </button>

          {/* Reset Workspace Layout (Restore default layout and Board mode) */}
          {onResetLayout && (
            <button
              data-testid="de2-reset-layout"
              onClick={onResetLayout}
              className="p-1.5 rounded transition-colors hover:bg-[var(--accent-subtle)]"
              style={{
                color: 'var(--text-secondary)',
              }}
              title="Reset Workspace Layout (Return to Default Board View)"
              aria-label="Reset Workspace Layout"
            >
              <LayoutGrid size={15} />
            </button>
          )}
        </div>

        {/* Mobile Controls (< 768px) */}
        <div className="flex md:hidden items-center gap-1.5">
          {/* Compile always visible on mobile */}
          <button
            data-testid="de2-compile-mobile"
            onClick={onCompile}
            disabled={isCompiling || !hasHdl}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{
              backgroundColor: 'var(--accent-primary)',
            }}
            title="Compile Verilog Code"
            aria-label="Compile Code"
          >
            <Zap size={13} />
            <span className="hidden xs:inline">{isCompiling ? '...' : 'Compile'}</span>
          </button>

          {/* Run / Pause always visible on mobile */}
          <button
            data-testid="de2-run-mobile"
            data-running={isSimRunning ? 'true' : 'false'}
            onClick={() => {
              if (isSimRunning) stopAutoSimulation();
              else startAutoSimulation();
            }}
            disabled={!hasEngine}
            className={`flex items-center gap-1 px-2 py-1 rounded font-semibold text-xs transition-colors disabled:opacity-40 disabled:pointer-events-none text-white ${
              isSimRunning
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            title={isSimRunning ? 'Pause Simulation' : 'Run Simulation'}
            aria-label={isSimRunning ? 'Pause Simulation' : 'Run Simulation'}
          >
            {isSimRunning ? <Pause size={13} /> : <Play size={13} />}
          </button>

          {/* Overflow Menu Button */}
          <div className="relative" ref={overflowRef}>
            <button
              data-testid="de2-toolbar-overflow"
              onClick={() => setOverflowOpen((prev) => !prev)}
              className="p-1.5 rounded border transition-colors flex items-center justify-center"
              style={{
                backgroundColor: overflowOpen ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: overflowOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
              title="More Actions"
              aria-label="More actions"
              aria-expanded={overflowOpen}
            >
              <MoreHorizontal size={16} />
            </button>

            {/* Overflow Dropdown Popover */}
            {overflowOpen && (
              <div
                data-testid="de2-overflow-menu"
                data-popover="true"
                className="absolute right-0 top-full mt-1.5 w-56 rounded-lg shadow-xl border p-1.5 z-50 flex flex-col gap-1 text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {/* Import */}
                <button
                  data-testid="de2-import-mobile"
                  onClick={() => {
                    setOverflowOpen(false);
                    onOpenImport();
                  }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-left transition-colors hover:bg-[var(--accent-subtle)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Upload size={14} style={{ color: 'var(--text-secondary)' }} />
                  <span>Import Verilog / Constraints</span>
                </button>

                {/* Step Clock */}
                <button
                  data-testid="de2-step-clock-mobile"
                  onClick={() => {
                    tickClock();
                  }}
                  disabled={!hasEngine}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-left transition-colors hover:bg-[var(--accent-subtle)] disabled:opacity-40 disabled:pointer-events-none"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Clock size={14} style={{ color: 'var(--state-warning)' }} />
                  <span>Step Clock Pulse</span>
                </button>

                {/* Reset Board */}
                <button
                  onClick={() => {
                    setOverflowOpen(false);
                    resetBoard();
                  }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-left transition-colors hover:bg-[var(--accent-subtle)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <RotateCcw size={14} style={{ color: 'var(--state-error)' }} />
                  <span>Reset Board State</span>
                </button>

                <div
                  className="h-px w-full my-1"
                  style={{ backgroundColor: 'var(--border-subtle)' }}
                />

                {/* Project Panel Toggle */}
                <button
                  onClick={() => {
                    setOverflowOpen(false);
                    onToggleProjectPanel();
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded text-left transition-colors hover:bg-[var(--accent-subtle)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <PanelLeft size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span>Project Panel</span>
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {projectPanelOpen ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Inspector Toggle */}
                <button
                  onClick={() => {
                    setOverflowOpen(false);
                    onToggleInspector();
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded text-left transition-colors hover:bg-[var(--accent-subtle)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <PanelRight size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span>Inspector Panel</span>
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {inspectorOpen ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Console Toggle */}
                <button
                  onClick={() => {
                    setOverflowOpen(false);
                    onToggleConsole();
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded text-left transition-colors hover:bg-[var(--accent-subtle)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <Terminal size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span>Console / Messages</span>
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {consoleOpen ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Reset Workspace Layout */}
                {onResetLayout && (
                  <button
                    data-testid="de2-reset-layout-mobile"
                    onClick={() => {
                      setOverflowOpen(false);
                      onResetLayout();
                    }}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-left transition-colors hover:bg-[var(--accent-subtle)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <LayoutGrid size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>Reset Workspace Layout</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
