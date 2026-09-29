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

import { useT } from '../../i18n/toolText';
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
  /** Rendered next to Import (share link, export actions). */
  actionsSlot?: React.ReactNode;
}

export const DE2Toolbar: React.FC<DE2ToolbarProps> = ({
  activeView,
  onSelectView,
  onOpenImport,
  actionsSlot,
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
  const t = useT();
  const {
    engine,
    compileState,
    isSimRunning,
    startAutoSimulation,
    stopAutoSimulation,
    tickClock,
    resetBoard,
    hdlCode,
  } = useBoardStore();

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const isReady = compileState === 'ready' && !!engine;
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
      className="h-[2.625rem] w-full px-3 flex items-center justify-between shrink-0 select-none z-20 text-xs border-b transition-colors relative"
      style={{
        backgroundColor: 'var(--bg-toolbar)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
      aria-label={t("DE2 Simulator Toolbar")}
    >
      {/* ── Left: Project Toggle & Status Indicator ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onToggleProjectPanel}
          className="w-[1.75rem] h-[1.75rem] sm:w-[1.875rem] sm:h-[1.875rem] rounded-[0.25rem] border transition-colors hidden sm:flex items-center justify-center"
          style={{
            color: projectPanelOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
            backgroundColor: projectPanelOpen ? 'var(--accent-subtle)' : 'transparent',
            borderColor: projectPanelOpen ? 'var(--accent-border)' : 'transparent',
          }}
          title={projectPanelOpen ? t("Hide Project Panel") : t("Show Project Panel")}
          aria-label={t("Toggle Project Panel")}
        >
          <PanelLeft size={15} />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className="flex items-center gap-1 px-2 h-[1.625rem] rounded-[0.25rem] border text-[0.6875rem] font-semibold select-none"
            style={{
              backgroundColor: 'var(--accent-subtle)',
              borderColor: 'var(--accent-border)',
              color: 'var(--accent-primary)',
            }}
          >
            <Cpu size={13} />
            <span className="hidden sm:inline">{t("DE2 Simulator")}</span>
            <span className="inline sm:hidden">DE2</span>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span style={{ color: 'var(--border-strong)' }}>/</span>
            <span
              className="font-mono font-medium max-w-[7.5rem] truncate text-[0.6875rem]"
              style={{ color: 'var(--text-muted)' }}
              title={hasHdl ? 'main.sv' : '(no source)'}
            >
              {hasHdl ? 'main.sv' : '(no source)'}
            </span>
          </div>

          <div
            data-testid="engine-status"
            data-status={isSimRunning ? 'running' : compileState}
            className={`w-2 h-2 rounded-full shrink-0 ${
              compileState === 'error'
                ? 'bg-rose-500'
                : isReady
                  ? 'bg-emerald-500'
                  : 'bg-slate-500'
            }`}
            title={
              compileState === 'error'
                ? 'Compilation failed'
                : isSimRunning
                  ? 'Simulation running'
                  : isReady
                    ? t("Simulation Engine Ready") : t("Engine not compiled")
            }
          />
          <span
            data-testid="engine-status-label"
            className="hidden xl:inline text-[0.6875rem] font-semibold"
            style={{
              color: compileState === 'error'
                ? 'var(--state-error)'
                : isReady
                  ? 'var(--state-success)'
                  : 'var(--text-muted)',
            }}
          >
            {compileState === 'error' ? t("Compile error") : isSimRunning ? t("Running") : isReady ? t("Ready") : t("Not compiled")}
          </span>
        </div>
      </div>

      {/* ── Center: View Mode Switcher (Board / Split / Code) ── */}
      <div
        className="inline-flex items-center p-0.5 rounded-[0.25rem] border border-[var(--border-subtle)] bg-[var(--bg-input)] gap-0.5 shrink-0 mx-1 select-none"
        role="group"
        aria-label={t("Workspace View Mode")}
      >
        <button
          data-testid="view-board"
          onClick={() => onSelectView('board')}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 h-[1.75rem] rounded-[0.1875rem] text-[0.7188rem] font-medium transition-colors ${
            activeView === 'board'
              ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-xs font-semibold border border-[var(--border-subtle)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
          }`}
          title={t("Board View — Full Virtual FPGA")}
          aria-label={t("Board View")}
          aria-pressed={activeView === 'board'}
        >
          <LayoutGrid size={13} />
          <span className="hidden md:inline">{t("Board")}</span>
        </button>

        <button
          data-testid="view-split"
          onClick={() => onSelectView('split')}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 h-[1.75rem] rounded-[0.1875rem] text-[0.7188rem] font-medium transition-colors ${
            activeView === 'split'
              ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-xs font-semibold border border-[var(--border-subtle)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
          }`}
          title={t("Split View — Editor + Board side by side")}
          aria-label={t("Split View")}
          aria-pressed={activeView === 'split'}
        >
          <Columns2 size={13} />
          <span className="hidden md:inline">{t("Split")}</span>
        </button>

        <button
          data-testid="view-code"
          onClick={() => onSelectView('code')}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 h-[1.75rem] rounded-[0.1875rem] text-[0.7188rem] font-medium transition-colors ${
            activeView === 'code'
              ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-xs font-semibold border border-[var(--border-subtle)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
          }`}
          title={t("Code View — Full Monaco HDL Editor")}
          aria-label={t("Code View")}
          aria-pressed={activeView === 'code'}
        >
          <Code size={13} />
          <span className="hidden md:inline">{t("Editor")}</span>
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
            className="flex items-center gap-1.5 px-2.5 h-[1.875rem] rounded-[0.25rem] border font-medium transition-colors text-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            title={t("Import Verilog (.v, .sv) or Pin Constraints (.qsf)")}
            aria-label={t("Import HDL")}
          >
            <Upload size={13} />
            <span className="hidden xl:inline">{t("Import")}</span>
          </button>
          {actionsSlot}

          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: 'var(--border-subtle)' }}
          />

          {/* Compile */}
          <button
            data-testid="de2-compile"
            onClick={onCompile}
            disabled={isCompiling || !hasHdl}
            className="flex items-center gap-1.5 px-3 h-[1.875rem] rounded-[0.25rem] text-white font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:pointer-events-none text-xs"
            style={{
              backgroundColor: 'var(--accent-primary)',
            }}
            onMouseEnter={(e) => {
              if (!isCompiling && hasHdl) e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
            }}
            title={t("Compile Verilog Code")}
            aria-label={t("Compile Code")}
          >
            <Zap size={13} />
            <span>{isCompiling ? t("Compiling...") : t("Compile")}</span>
          </button>

          {/* Auto Run / Pause */}
          <button
            data-testid="de2-run"
            data-running={isSimRunning ? 'true' : 'false'}
            onClick={() => {
              if (isSimRunning) stopAutoSimulation();
              else startAutoSimulation();
            }}
            disabled={!isReady}
            className={`flex items-center gap-1.5 px-2.5 h-[1.875rem] rounded-[0.25rem] font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none text-white text-xs ${
              isSimRunning
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            title={isSimRunning ? t("Pause Continuous Simulation") : t("Start Continuous Simulation")}
            aria-label={isSimRunning ? t("Pause Simulation") : t("Run Simulation")}
          >
            {isSimRunning ? <Pause size={13} /> : <Play size={13} />}
            <span className="hidden lg:inline">{isSimRunning ? t("Pause") : t("Run")}</span>
          </button>

          {/* Step Clock - Secondary quiet technical action */}
          <button
            data-testid="de2-clock-step"
            onClick={() => tickClock()}
            disabled={!isReady || isSimRunning}
            className="flex items-center gap-1.5 px-2.5 h-[1.875rem] rounded-[0.25rem] border font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none text-xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            title={t("Manual Clock Pulse (tickClock)")}
            aria-label={t("Step Clock")}
          >
            <Clock size={12} className="text-[var(--text-secondary)]" />
            <span className="hidden xl:inline">{t("Step Clk")}</span>
          </button>

          {/* Reset Board */}
          <button
            data-testid="de2-reset"
            onClick={resetBoard}
            className="w-[1.875rem] h-[1.875rem] rounded-[0.25rem] flex items-center justify-center transition-colors border border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-secondary)' }}
            title={t("Reset Board State (Switches, Keys, LEDs, HEX, Clock)")}
            aria-label={t("Reset Board")}
          >
            <RotateCcw size={14} />
          </button>

          <div
            className="w-px h-4 mx-0.5"
            style={{ backgroundColor: 'var(--border-subtle)' }}
          />

          {/* Toggle Bottom Console */}
          <button
            onClick={onToggleConsole}
            className="w-[1.875rem] h-[1.875rem] rounded-[0.25rem] flex items-center justify-center transition-colors border"
            style={{
              color: consoleOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: consoleOpen ? 'var(--accent-subtle)' : 'transparent',
              borderColor: consoleOpen ? 'var(--accent-border)' : 'transparent',
            }}
            title={consoleOpen ? t("Hide Console") : t("Show Console")}
            aria-label={t("Toggle Console")}
          >
            <Terminal size={14} />
          </button>

          {/* Toggle Inspector */}
          <button
            onClick={onToggleInspector}
            className="w-[1.875rem] h-[1.875rem] rounded-[0.25rem] flex items-center justify-center transition-colors border"
            style={{
              color: inspectorOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: inspectorOpen ? 'var(--accent-subtle)' : 'transparent',
              borderColor: inspectorOpen ? 'var(--accent-border)' : 'transparent',
            }}
            title={inspectorOpen ? t("Hide Inspector") : t("Show Inspector")}
            aria-label={t("Toggle Inspector")}
          >
            <PanelRight size={14} />
          </button>

          {/* Reset Workspace Layout (Restore default layout and Board mode) */}
          {onResetLayout && (
            <button
              data-testid="de2-reset-layout"
              onClick={onResetLayout}
              className="w-[1.875rem] h-[1.875rem] rounded-[0.25rem] flex items-center justify-center transition-colors border border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
              style={{
                color: 'var(--text-secondary)',
              }}
              title={t("Reset Workspace Layout (Return to Default Board View)")}
              aria-label={t("Reset Workspace Layout")}
            >
              <LayoutGrid size={14} />
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
            title={t("Compile Verilog Code")}
            aria-label={t("Compile Code")}
          >
            <Zap size={13} />
            <span className="hidden xs:inline">{isCompiling ? '...' : t("Compile")}</span>
          </button>

          {/* Run / Pause always visible on mobile */}
          <button
            data-testid="de2-run-mobile"
            data-running={isSimRunning ? 'true' : 'false'}
            onClick={() => {
              if (isSimRunning) stopAutoSimulation();
              else startAutoSimulation();
            }}
            disabled={!isReady}
            className={`flex items-center gap-1 px-2 py-1 rounded font-semibold text-xs transition-colors disabled:opacity-40 disabled:pointer-events-none text-white ${
              isSimRunning
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            title={isSimRunning ? t("Pause Simulation") : t("Run Simulation")}
            aria-label={isSimRunning ? t("Pause Simulation") : t("Run Simulation")}
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
              title={t("More Actions")}
              aria-label={t("More actions")}
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
                  <span>{t("Import Verilog / Constraints")}</span>
                </button>

                {/* Step Clock */}
                <button
                  data-testid="de2-step-clock-mobile"
                  onClick={() => {
                    tickClock();
                  }}
                  disabled={!isReady || isSimRunning}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-left transition-colors hover:bg-[var(--accent-subtle)] disabled:opacity-40 disabled:pointer-events-none"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
                  <span>{t("Step Clock Pulse")}</span>
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
                  <span>{t("Reset Board State")}</span>
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
                    <span>{t("Project Panel")}</span>
                  </div>
                  <span className="text-[0.625rem] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {projectPanelOpen ? t("ON") : t("OFF")}
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
                    <span>{t("Inspector Panel")}</span>
                  </div>
                  <span className="text-[0.625rem] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {inspectorOpen ? t("ON") : t("OFF")}
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
                    <span>{t("Console / Messages")}</span>
                  </div>
                  <span className="text-[0.625rem] font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {consoleOpen ? t("ON") : t("OFF")}
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
                    <span>{t("Reset Workspace Layout")}</span>
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
