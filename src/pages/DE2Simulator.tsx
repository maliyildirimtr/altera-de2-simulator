import { useState, useCallback, useEffect, useRef } from 'react';
import { useBoardStore } from '../store/boardStore';
import { compileVerilog } from '../core/simulator/verilogEngine';
import { autoMapPort, type ParsedPort } from '../utils/parser/pinParser';

import { DE2Toolbar } from '../components/DE2Workspace/DE2Toolbar';
import { ProjectPanel } from '../components/DE2Workspace/ProjectPanel';
import { BoardViewport } from '../components/DE2Workspace/BoardViewport';
import { InspectorPanel } from '../components/DE2Workspace/InspectorPanel';
import { ConsolePanel, type ConsoleMessage } from '../components/DE2Workspace/ConsolePanel';
import { ImportDialog } from '../components/DE2Workspace/ImportDialog';
import { CodeEditor } from '../components/Editor/CodeEditor';
import { ResizableDivider } from '../components/DE2Workspace/ResizableDivider';
import { consumePendingHandoff, markWorkspaceOrigin } from '../services/exampleHandoff';
import { getExampleById } from '../examples/registry';

const STORAGE_KEY = 'de2_workspace_layout_v1';

interface WorkspaceLayout {
  projectWidth: number;
  inspectorWidth: number;
  editorRatio: number;
  consoleHeight: number;
  pinMappingHeight: number;
}

const DEFAULT_LAYOUT: WorkspaceLayout = {
  projectWidth: 220,
  inspectorWidth: 300,
  editorRatio: 0.38,
  consoleHeight: 190,
  pinMappingHeight: 220,
};

function loadSavedLayout(): WorkspaceLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      projectWidth: typeof parsed.projectWidth === 'number' && parsed.projectWidth >= 170 && parsed.projectWidth <= 360
        ? parsed.projectWidth : DEFAULT_LAYOUT.projectWidth,
      inspectorWidth: typeof parsed.inspectorWidth === 'number' && parsed.inspectorWidth >= 240 && parsed.inspectorWidth <= 450
        ? parsed.inspectorWidth : DEFAULT_LAYOUT.inspectorWidth,
      editorRatio: typeof parsed.editorRatio === 'number' && parsed.editorRatio >= 0.25 && parsed.editorRatio <= 0.68
        ? parsed.editorRatio : DEFAULT_LAYOUT.editorRatio,
      consoleHeight: typeof parsed.consoleHeight === 'number' && parsed.consoleHeight >= 100 && parsed.consoleHeight <= 450
        ? parsed.consoleHeight : DEFAULT_LAYOUT.consoleHeight,
      pinMappingHeight: typeof parsed.pinMappingHeight === 'number' && parsed.pinMappingHeight >= 120 && parsed.pinMappingHeight <= 480
        ? parsed.pinMappingHeight : DEFAULT_LAYOUT.pinMappingHeight,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export default function DE2Simulator() {
  const {
    hdlCode,
    setHdlCode,
    setEngine,
    pinMappings,
    setPinMappings,
    resetBoard,
    runSimulationCycle,
    isUploaderOpen,
    setUploaderOpen,
  } = useBoardStore();

  // Layout UI state - Split view is primary desktop experience
  const [activeView, setActiveView] = useState<'board' | 'split' | 'code'>('split');
  const [isProjectOpen, setIsProjectOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Persistent panel dimensions & ratio state
  const [layout, setLayout] = useState<WorkspaceLayout>(loadSavedLayout);
  const centerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const persistLayout = useCallback((updates?: Partial<WorkspaceLayout>) => {
    setLayout(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // Responsive: collapse side panels only on mobile viewports (< 768px)
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsProjectOpen(false);
      setIsInspectorOpen(false);
      setActiveView('board');
    }
  }, []);

  // Compiler / Console state
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [compileError, setCompileError] = useState<string | null>(null);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([
    {
      id: 'init',
      type: 'info',
      text: 'DE2 Engineering Simulator initialized. Ready for simulation.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const addLog = useCallback((type: ConsoleMessage['type'], text: string) => {
    setConsoleMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        type,
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  // Consume incoming example handoff (Phase 6)
  useEffect(() => {
    const handoff = consumePendingHandoff('de2');
    if (handoff) {
      const ex = getExampleById(handoff.exampleId);
      if (ex && ex.de2) {
        setHdlCode(ex.de2.source);
        setPinMappings([]);
        // Re-use existing boardStore state setters (engine invalidation + board reset)
        setEngine(null);
        setCompileStatus('idle');
        setCompileError(null);
        resetBoard();
        addLog('info', `Loaded example into DE2: ${ex.title} (${ex.de2.filename})`);
        markWorkspaceOrigin('de2', 'example');
      }
    }
  }, [setHdlCode, setPinMappings, setEngine, resetBoard, addLog]);

  // Exact existing compilation engine flow
  const handleCompile = useCallback(() => {
    if (!hdlCode || hdlCode.trim().length === 0) {
      addLog('warn', 'Compilation skipped: No HDL source code to compile.');
      return;
    }

    setIsCompiling(true);
    try {
      const module = compileVerilog(hdlCode);
      setEngine(module);
      setCompileError(null);
      setCompileStatus('success');

      // Auto-assign ports to virtual board components if not already mapped
      if (pinMappings.length === 0 && (module.inputs.length > 0 || module.outputs.length > 0)) {
        const autoPins: ParsedPort[] = [];
        const allPorts = [...module.inputs, ...module.outputs];
        for (const port of allPorts) {
          const guessed = autoMapPort(port);
          autoPins.push({
            portName: port,
            physicalPin: null,
            virtualComponent: guessed || '',
          });
        }
        if (autoPins.length > 0) {
          setPinMappings(autoPins);
          addLog('info', `Auto-detected ${autoPins.length} ports from top module.`);
        }
      }

      // Trigger initial simulation tick to settle output states
      setTimeout(() => {
        runSimulationCycle();
      }, 0);

      const modName = module.topModule || 'top';
      addLog(
        'success',
        `Compiled "${modName}" successfully (${module.inputs.length} inputs, ${module.outputs.length} outputs). Engine ready.`
      );
    } catch (err: any) {
      const rawError = err.message || 'Unknown compilation syntax error.';
      setCompileError(rawError);
      setCompileStatus('error');
      addLog('error', `Compilation failed: ${rawError}`);
      setIsConsoleOpen(true);
    } finally {
      setIsCompiling(false);
    }
  }, [hdlCode, pinMappings, setEngine, setPinMappings, runSimulationCycle, addLog]);

  return (
    <div
      data-testid="de2-workspace"
      data-compile-status={compileStatus}
      className="flex-1 flex flex-col h-full w-full bg-[#070b14] text-slate-200 overflow-hidden font-sans"
    >
      {/* ── Top Toolbar ── */}
      <DE2Toolbar
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenImport={() => setUploaderOpen(true)}
        onCompile={handleCompile}
        isCompiling={isCompiling}
        projectPanelOpen={isProjectOpen}
        onToggleProjectPanel={() => setIsProjectOpen(prev => !prev)}
        inspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen(prev => !prev)}
        consoleOpen={isConsoleOpen}
        onToggleConsole={() => setIsConsoleOpen(prev => !prev)}
      />

      {/* ── Main Workspace Body ── */}
      <div ref={bodyRef} className="flex-1 flex flex-row overflow-hidden relative min-h-0">
        {/* Left: Project Panel */}
        <ProjectPanel
          isOpen={isProjectOpen}
          width={layout.projectWidth}
          onToggle={() => setIsProjectOpen(false)}
          onOpenImport={() => setUploaderOpen(true)}
          activeView={activeView}
          onSelectFile={() => {
            if (activeView === 'board') setActiveView('split');
          }}
        />

        {/* Project Panel Splitter (hidden when collapsed) */}
        {isProjectOpen && (
          <ResizableDivider
            orientation="vertical"
            data-testid="splitter-project"
            aria-label="Resize Project Panel"
            valueMin={170}
            valueMax={360}
            valueNow={layout.projectWidth}
            onResize={(delta) => {
              setLayout(prev => ({
                ...prev,
                projectWidth: Math.min(360, Math.max(170, prev.projectWidth + delta)),
              }));
            }}
            onResizeEnd={() => persistLayout()}
            onReset={() => {
              setLayout(prev => ({ ...prev, projectWidth: DEFAULT_LAYOUT.projectWidth }));
              persistLayout({ projectWidth: DEFAULT_LAYOUT.projectWidth });
            }}
          />
        )}

        {/* Center: Dynamic Workspace (Board / Split / Code) */}
        <main ref={centerRef} className="flex-1 flex flex-row overflow-hidden min-w-0 relative">
          {/* Split View: Left column is Code Editor with dynamic ratio */}
          {activeView === 'split' && (
            <>
              <div
                style={{ width: `${Math.round(layout.editorRatio * 10000) / 100}%` }}
                className="h-full flex flex-col shrink-0 overflow-hidden"
              >
                <CodeEditor isOpen={true} onOpenImport={() => setUploaderOpen(true)} />
              </div>

              {/* Editor ↔ Board Divider (Zero physical dead space) */}
              <ResizableDivider
                orientation="vertical"
                data-testid="splitter-editor-board"
                aria-label="Resize HDL Editor and Board Viewport"
                valueMin={25}
                valueMax={68}
                valueNow={Math.round(layout.editorRatio * 100)}
                onResize={(delta, _pos, ratioStep) => {
                  if (ratioStep !== undefined) {
                    setLayout(prev => ({
                      ...prev,
                      editorRatio: Math.min(0.68, Math.max(0.25, +(prev.editorRatio + ratioStep).toFixed(3))),
                    }));
                    return;
                  }
                  const totalW = centerRef.current?.clientWidth || 800;
                  if (totalW <= 0) return;
                  setLayout(prev => {
                    const currentPx = totalW * prev.editorRatio;
                    const targetPx = currentPx + delta;
                    const minRatio = Math.max(0.25, 260 / totalW);
                    const maxRatio = Math.min(0.68, (totalW - 350) / totalW);
                    const clamped = Math.min(maxRatio, Math.max(minRatio, targetPx / totalW));
                    return { ...prev, editorRatio: +clamped.toFixed(4) };
                  });
                }}
                onResizeEnd={() => persistLayout()}
                onReset={() => {
                  setLayout(prev => ({ ...prev, editorRatio: DEFAULT_LAYOUT.editorRatio }));
                  persistLayout({ editorRatio: DEFAULT_LAYOUT.editorRatio });
                }}
              />
            </>
          )}

          {/* Full Code View */}
          {activeView === 'code' && (
            <div className="flex-1 h-full flex flex-col min-w-0">
              <CodeEditor isOpen={true} onOpenImport={() => setUploaderOpen(true)} />
            </div>
          )}

          {/* Board Viewport (Rendered in 'board' and 'split' modes) */}
          {(activeView === 'board' || activeView === 'split') && (
            <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden relative">
              <BoardViewport isSplitView={activeView === 'split'} />
            </div>
          )}
        </main>

        {/* Inspector Panel Splitter (hidden when collapsed) */}
        {isInspectorOpen && (
          <ResizableDivider
            orientation="vertical"
            data-testid="splitter-inspector"
            aria-label="Resize Inspector Panel"
            valueMin={240}
            valueMax={450}
            valueNow={layout.inspectorWidth}
            onResize={(delta) => {
              // Dragging left (negative delta) increases inspector width
              setLayout(prev => ({
                ...prev,
                inspectorWidth: Math.min(450, Math.max(240, prev.inspectorWidth - delta)),
              }));
            }}
            onResizeEnd={() => persistLayout()}
            onReset={() => {
              setLayout(prev => ({ ...prev, inspectorWidth: DEFAULT_LAYOUT.inspectorWidth }));
              persistLayout({ inspectorWidth: DEFAULT_LAYOUT.inspectorWidth });
            }}
          />
        )}

        {/* Right: Inspector Panel */}
        <InspectorPanel
          isOpen={isInspectorOpen}
          width={layout.inspectorWidth}
          pinMappingHeight={layout.pinMappingHeight}
          onPinMappingResize={(delta) => {
            setLayout(prev => ({
              ...prev,
              pinMappingHeight: Math.min(480, Math.max(120, prev.pinMappingHeight + delta)),
            }));
          }}
          onPinMappingReset={() => {
            setLayout(prev => ({ ...prev, pinMappingHeight: DEFAULT_LAYOUT.pinMappingHeight }));
            persistLayout({ pinMappingHeight: DEFAULT_LAYOUT.pinMappingHeight });
          }}
          onPinMappingResizeEnd={() => persistLayout()}
          onToggle={() => setIsInspectorOpen(false)}
        />
      </div>

      {/* ── Console Splitter (Top of Console, hidden when collapsed) ── */}
      {isConsoleOpen && (
        <ResizableDivider
          orientation="horizontal"
          data-testid="splitter-console"
          aria-label="Resize Console Panel"
          valueMin={100}
          valueMax={Math.max(220, Math.floor((bodyRef.current?.clientHeight || 600) * 0.45))}
          valueNow={layout.consoleHeight}
          onResize={(delta) => {
            setLayout(prev => {
              const totalBody = (bodyRef.current?.clientHeight || 500) + (isConsoleOpen ? prev.consoleHeight : 0);
              const maxH = Math.max(280, Math.floor(totalBody * 0.45));
              return {
                ...prev,
                consoleHeight: Math.min(maxH, Math.max(100, prev.consoleHeight - delta)),
              };
            });
          }}
          onResizeEnd={() => persistLayout()}
          onReset={() => {
            setLayout(prev => ({ ...prev, consoleHeight: DEFAULT_LAYOUT.consoleHeight }));
            persistLayout({ consoleHeight: DEFAULT_LAYOUT.consoleHeight });
          }}
        />
      )}

      {/* ── Bottom: Console & Problems Panel ── */}
      <ConsolePanel
        isOpen={isConsoleOpen}
        height={layout.consoleHeight}
        onToggle={() => setIsConsoleOpen(prev => !prev)}
        messages={consoleMessages}
        compileError={compileError}
        onClear={() => setConsoleMessages([])}
      />

      {/* ── File Import Dialog ── */}
      <ImportDialog
        isOpen={isUploaderOpen}
        onClose={() => setUploaderOpen(false)}
        onImportSuccess={summary => {
          addLog('info', summary);
          // Auto-compile when new HDL file is loaded
          setTimeout(handleCompile, 100);
        }}
      />
    </div>
  );
}
