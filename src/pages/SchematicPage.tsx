import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AlertCircle, FileCode } from 'lucide-react';
import { synthesizeVerilog } from '../services/synthesizer';
import { ResizableDivider } from '../components/DE2Workspace/ResizableDivider';
import { SchematicToolbar } from '../components/SchematicWorkspace/SchematicToolbar';
import type { SynthesisStatus, ViewMode } from '../components/SchematicWorkspace/SchematicToolbar';
import { SchematicProjectPanel } from '../components/SchematicWorkspace/SchematicProjectPanel';
import type { ProjectFile } from '../components/SchematicWorkspace/SchematicProjectPanel';
import { SchematicEditor } from '../components/SchematicWorkspace/SchematicEditor';
import { SchematicViewport } from '../components/SchematicWorkspace/SchematicViewport';
import type { SchematicViewportHandle } from '../components/SchematicWorkspace/SchematicViewport';
import { SchematicInspector } from '../components/SchematicWorkspace/SchematicInspector';
import type { SelectedItemInfo } from '../components/SchematicWorkspace/SchematicInspector';
import { SchematicConsole } from '../components/SchematicWorkspace/SchematicConsole';
import { consumePendingHandoff, markWorkspaceOrigin, markWorkspaceDirty, markWorkspaceUser } from '../services/exampleHandoff';
import { getExampleById } from '../examples/registry';
import '../index.css';

const LAYOUT_STORAGE_KEY = 'schematic_workspace_layout_v1';

interface SchematicLayoutConfig {
  projectWidth: number;
  editorRatio: number;
  inspectorWidth: number;
  consoleHeight: number;
  isProjectOpen: boolean;
  isInspectorOpen: boolean;
  isConsoleOpen: boolean;
  viewMode: ViewMode;
}

const DEFAULT_LAYOUT: SchematicLayoutConfig = {
  projectWidth: 240,
  editorRatio: 0.38,
  inspectorWidth: 260,
  consoleHeight: 180,
  isProjectOpen: true,
  isInspectorOpen: true,
  isConsoleOpen: false,
  viewMode: 'split',
};

// Deterministic default combinational circuit (Point 22)
const DEFAULT_VERILOG = `module logic_test(
    input wire A,
    input wire B,
    input wire SEL,
    output wire Y
);
    assign Y = SEL ? (A | B) : (A & B);
endmodule
`;

export default function SchematicPage({ isDarkMode }: { isDarkMode: boolean }) {
  // Layout persistence
  const [layout, setLayout] = useState<SchematicLayoutConfig>(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_LAYOUT, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return DEFAULT_LAYOUT;
  });

  const saveLayout = useCallback((updates?: Partial<SchematicLayoutConfig>) => {
    setLayout((prev) => {
      const next = { ...prev, ...(updates || {}) };
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // Project files state
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([
    { name: 'main.sv', content: DEFAULT_VERILOG },
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  // Synthesis settings
  const [optimizeInYosys, setOptimizeInYosys] = useState(false);
  const [simplifyDiagram, setSimplifyDiagram] = useState(true);

  // Synthesis & Circuit state
  const [circuitData, setCircuitData] = useState<any>(null);
  const [synthesisStatus, setSynthesisStatus] = useState<SynthesisStatus>('no_source');
  const [topModule, setTopModule] = useState<string>('logic_test');
  const [lastSynthesizedContent, setLastSynthesizedContent] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stdoutLog, setStdoutLog] = useState<string>('');
  const [stderrLog, setStderrLog] = useState<string>('');

  // Inspector selection state
  const [selectedItem, setSelectedItem] = useState<SelectedItemInfo | null>(null);

  // Viewport and File input refs
  const viewportRef = useRef<SchematicViewportHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const centerWorkspaceRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [createPromptOpen, setCreatePromptOpen] = useState(false);
  const [createPromptValue, setCreatePromptValue] = useState('');

  // Synthesis handler
  const handleSynthesize = async () => {
    const hasCode = projectFiles.some((f) => f.content.trim() !== '');
    if (!hasCode) {
      setSynthesisStatus('no_source');
      setErrorMessage('Please enter HDL code or upload files to synthesize.');
      return;
    }

    setSynthesisStatus('synthesizing');
    setErrorMessage(null);

    try {
      const result = await synthesizeVerilog(projectFiles, {
        optimize: optimizeInYosys,
        simplify: simplifyDiagram,
      });

      setCircuitData(result);
      setTopModule(result._topModule || 'logic_test');
      setStdoutLog(result._stdout || '');
      setStderrLog(result._stderr || '');
      setLastSynthesizedContent(projectFiles[activeFileIndex]?.content || '');
      setSynthesisStatus('ready');
      setSelectedItem(null);
    } catch (err: any) {
      // Stale graph safety (Point 11 & 25): hide/invalidate graph and set status to Error
      setCircuitData(null);
      setTopModule('');
      setSynthesisStatus('error');
      const errText = err?.message || 'Synthesis failed.';
      setErrorMessage(errText);
      setStderrLog(err?.stderr || errText);
      if (err?.stdout) setStdoutLog(err.stdout);
      setSelectedItem(null);
      // Automatically reveal Console/Problems panel on error
      saveLayout({ isConsoleOpen: true });
    }
  };

  // Focus Mode deliberate one-time Fit + Center (Point 1)
  const isFocusLayout =
    !layout.isProjectOpen &&
    !layout.isInspectorOpen &&
    !layout.isConsoleOpen &&
    layout.viewMode === 'schematic';
  const prevFocusRef = useRef(false);

  useEffect(() => {
    if (isFocusLayout && !prevFocusRef.current) {
      const timer = setTimeout(() => {
        viewportRef.current?.fit();
      }, 100);
      return () => clearTimeout(timer);
    }
    prevFocusRef.current = isFocusLayout;
  }, [isFocusLayout]);

  // Consume incoming example handoff (Phase 6)
  useEffect(() => {
    const handoff = consumePendingHandoff('schematic');
    if (handoff) {
      const ex = getExampleById(handoff.exampleId);
      if (ex) {
        setProjectFiles([{ name: ex.source.filename, content: ex.source.code }]);
        setActiveFileIndex(0);
        // Clear previous synthesis and circuit data so old graph cannot masquerade
        setCircuitData(null);
        setSynthesisStatus('modified');
        setTopModule(ex.topModule);
        setLastSynthesizedContent('');
        setErrorMessage(null);
        setStdoutLog('');
        setStderrLog('');
        setSelectedItem(null);
        markWorkspaceOrigin('schematic', 'example');
      }
    }
  }, []);

  // Code editor change handler (Point 12: HDL change after success -> state = modified)
  const handleCodeChange = (value: string | undefined) => {
    const newContent = value || '';
    setProjectFiles((prev) => {
      const updated = [...prev];
      if (updated[activeFileIndex]) {
        if (updated[activeFileIndex].content !== newContent) {
          markWorkspaceDirty('schematic');
        }
        updated[activeFileIndex] = { ...updated[activeFileIndex], content: newContent };
      }
      return updated;
    });

    if (synthesisStatus === 'ready' && newContent !== lastSynthesizedContent) {
      setSynthesisStatus('modified');
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = [...projectFiles];
    let lastIndex = activeFileIndex;

    const readPromises = Array.from(files).map((file) => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          newFiles.push({ name: file.name, content: (event.target?.result as string) || '' });
          lastIndex = newFiles.length - 1;
          resolve();
        };
        reader.readAsText(file);
      });
    });

    await Promise.all(readPromises);
    setProjectFiles(newFiles);
    setActiveFileIndex(lastIndex);
    setSynthesisStatus('modified');
    markWorkspaceUser('schematic');

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Create new file
  const handleCreateNewFile = () => {
    setCreatePromptValue(`module${projectFiles.length + 1}.sv`);
    setCreatePromptOpen(true);
  };

  const submitCreateNewFile = (fileName: string) => {
    const name = fileName.trim() || `module${projectFiles.length + 1}.sv`;
    const newFiles = [...projectFiles, { name, content: '' }];
    setProjectFiles(newFiles);
    setActiveFileIndex(newFiles.length - 1);
    setSynthesisStatus('modified');
    markWorkspaceDirty('schematic');
    setCreatePromptOpen(false);
  };

  // Delete file
  const handleDeleteFile = (index: number) => {
    if (projectFiles.length === 1) {
      setAlertMessage('Cannot delete the last file in the project.');
      return;
    }
    const newFiles = [...projectFiles];
    newFiles.splice(index, 1);
    setProjectFiles(newFiles);

    if (activeFileIndex === index) {
      setActiveFileIndex(Math.max(0, index - 1));
    } else if (activeFileIndex > index) {
      setActiveFileIndex(activeFileIndex - 1);
    }
    setSynthesisStatus('modified');
    markWorkspaceDirty('schematic');
  };

  // Resizing Editor <-> Schematic in Split View using ratio (Point 15)
  const handleEditorResize = (delta: number) => {
    if (!centerWorkspaceRef.current) return;
    const centerWidth = centerWorkspaceRef.current.clientWidth - (layout.isInspectorOpen ? layout.inspectorWidth : 0);
    if (centerWidth <= 100) return;

    const currentEditorPx = centerWidth * layout.editorRatio;
    const newPx = currentEditorPx + delta;
    const newRatio = Math.max(0.25, Math.min(0.75, newPx / centerWidth));
    setLayout((prev) => ({ ...prev, editorRatio: newRatio }));
  };

  // Determine visibility by view mode (Point 13)
  const showEditor = layout.viewMode === 'split' || layout.viewMode === 'code';
  const showSchematic = layout.viewMode === 'split' || layout.viewMode === 'schematic';

  // Calculate editor width percentage in Split View
  const editorWidthPercent = layout.viewMode === 'split' ? `${layout.editorRatio * 100}%` : '100%';

  // Adaptive Inspector collapse/restore for Truth Table (Point 6)
  const inspectorCollapsedByTruthTableRef = useRef(false);

  const handleTruthTableChange = (isOpen: boolean) => {
    if (isOpen) {
      if (layout.isInspectorOpen) {
        inspectorCollapsedByTruthTableRef.current = true;
        saveLayout({ isInspectorOpen: false });
      }
    } else {
      if (inspectorCollapsedByTruthTableRef.current) {
        inspectorCollapsedByTruthTableRef.current = false;
        saveLayout({ isInspectorOpen: true });
      }
    }
  };

  const handleToggleInspector = () => {
    inspectorCollapsedByTruthTableRef.current = false;
    saveLayout({ isInspectorOpen: !layout.isInspectorOpen });
  };

  return (
    <div
      data-testid="schematic-workspace"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Hidden File Input for HDL Upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".v,.sv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Main Workspace Toolbar */}
      <SchematicToolbar
        status={synthesisStatus}
        viewMode={layout.viewMode}
        onViewModeChange={(mode) => saveLayout({ viewMode: mode })}
        onSynthesize={handleSynthesize}
        onUploadClick={() => fileInputRef.current?.click()}
        onZoomIn={() => viewportRef.current?.zoomIn()}
        onZoomOut={() => viewportRef.current?.zoomOut()}
        onFit={() => viewportRef.current?.fit()}
        onResetView={() => viewportRef.current?.resetView()}
        isTruthTableOpen={viewportRef.current?.isTruthTableOpen || false}
        onToggleTruthTable={() => viewportRef.current?.toggleTruthTable()}
        isProjectOpen={layout.isProjectOpen}
        onToggleProject={() => saveLayout({ isProjectOpen: !layout.isProjectOpen })}
        isInspectorOpen={layout.isInspectorOpen}
        onToggleInspector={handleToggleInspector}
        isConsoleOpen={layout.isConsoleOpen}
        onToggleConsole={() => saveLayout({ isConsoleOpen: !layout.isConsoleOpen })}
        errorCount={synthesisStatus === 'error' ? 1 : 0}
        hasCircuit={!!circuitData && synthesisStatus !== 'error'}
      />

      {/* Center Layout: Project Panel + Central Canvas / Editor + Inspector */}
      <div
        ref={centerWorkspaceRef}
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        {/* 1. Project Panel */}
        {layout.isProjectOpen && (
          <div
            style={{
              width: `${layout.projectWidth}px`,
              height: '100%',
              flexShrink: 0,
              display: 'flex',
            }}
          >
            <SchematicProjectPanel
              files={projectFiles}
              activeFileIndex={activeFileIndex}
              onSelectFile={(idx) => setActiveFileIndex(idx)}
              onCreateFile={handleCreateNewFile}
              onDeleteFile={handleDeleteFile}
              optimizeInYosys={optimizeInYosys}
              onToggleOptimize={setOptimizeInYosys}
              simplifyDiagram={simplifyDiagram}
              onToggleSimplify={setSimplifyDiagram}
              topModule={topModule}
              synthesisStatus={synthesisStatus}
              onClose={() => saveLayout({ isProjectOpen: false })}
            />
          </div>
        )}

        {/* Divider 1: Project <-> Central Workspace */}
        {layout.isProjectOpen && (
          <ResizableDivider
            orientation="vertical"
            data-testid="divider-project-workspace"
            onResize={(delta) => {
              setLayout((prev) => ({
                ...prev,
                projectWidth: Math.max(180, Math.min(420, prev.projectWidth + delta)),
              }));
            }}
            onResizeEnd={() => saveLayout()}
            onReset={() => {
              setLayout((prev) => ({ ...prev, projectWidth: DEFAULT_LAYOUT.projectWidth }));
              saveLayout({ projectWidth: DEFAULT_LAYOUT.projectWidth });
            }}
          />
        )}

        {/* 2. Central Area (Editor + Schematic) & Bottom Console */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Top: Editor and/or Schematic */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              minHeight: 0,
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              height: '100%',
            }}
          >
            {/* Left/Main: HDL Monaco Editor */}
            {showEditor && (
              <div
                style={{
                  width: editorWidthPercent,
                  height: '100%',
                  flexShrink: 0,
                  display: 'flex',
                }}
              >
                <SchematicEditor
                  files={projectFiles}
                  activeFileIndex={activeFileIndex}
                  onCodeChange={handleCodeChange}
                  isDarkMode={isDarkMode}
                  onImportHDL={() => fileInputRef.current?.click()}
                  isModified={synthesisStatus === 'modified'}
                  onClose={
                    layout.viewMode === 'split'
                      ? () => saveLayout({ viewMode: 'schematic' })
                      : undefined
                  }
                />
              </div>
            )}

            {/* Divider 2: Editor <-> Schematic (in Split View) */}
            {layout.viewMode === 'split' && (
              <ResizableDivider
                orientation="vertical"
                data-testid="divider-editor-schematic"
                onResize={handleEditorResize}
                onResizeEnd={() => saveLayout()}
                onReset={() => {
                  setLayout((prev) => ({ ...prev, editorRatio: DEFAULT_LAYOUT.editorRatio }));
                  saveLayout({ editorRatio: DEFAULT_LAYOUT.editorRatio });
                }}
              />
            )}

            {/* Right/Main: DigitalJS Schematic Viewport */}
            {showSchematic && (
              <div
                style={{
                  flex: 1,
                  height: '100%',
                  minWidth: 0,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <SchematicViewport
                  ref={viewportRef}
                  onAlert={setAlertMessage}
                  circuitData={circuitData}
                  simplify={simplifyDiagram}
                  status={synthesisStatus}
                  errorMessage={errorMessage}
                  onSelectItem={(item) => setSelectedItem(item)}
                  onOpenProblems={() => saveLayout({ isConsoleOpen: true })}
                  onImportHDL={() => fileInputRef.current?.click()}
                  onTruthTableChange={handleTruthTableChange}
                />
              </div>
            )}
          </div>

          {/* Divider 4: Central Workspace <-> Console */}
          {layout.isConsoleOpen && (
            <ResizableDivider
              orientation="horizontal"
              data-testid="divider-workspace-console"
              onResize={(delta) => {
                setLayout((prev) => ({
                  ...prev,
                  consoleHeight: Math.max(100, Math.min(420, prev.consoleHeight - delta)),
                }));
              }}
              onResizeEnd={() => saveLayout()}
              onReset={() => {
                setLayout((prev) => ({ ...prev, consoleHeight: DEFAULT_LAYOUT.consoleHeight }));
                saveLayout({ consoleHeight: DEFAULT_LAYOUT.consoleHeight });
              }}
            />
          )}

          {/* Bottom: Console & Problems Panel */}
          {layout.isConsoleOpen && (
            <div
              style={{
                height: `${layout.consoleHeight}px`,
                flexShrink: 0,
                display: 'flex',
              }}
            >
              <SchematicConsole
                isOpen={layout.isConsoleOpen}
                onClose={() => saveLayout({ isConsoleOpen: false })}
                stdout={stdoutLog}
                stderr={stderrLog}
                error={errorMessage}
                onClear={() => {
                  setStdoutLog('');
                  setStderrLog('');
                  setErrorMessage(null);
                }}
              />
            </div>
          )}
        </div>

        {/* Divider 3: Central Workspace <-> Inspector */}
        {layout.isInspectorOpen && (
          <ResizableDivider
            orientation="vertical"
            data-testid="divider-workspace-inspector"
            onResize={(delta) => {
              setLayout((prev) => ({
                ...prev,
                inspectorWidth: Math.max(200, Math.min(450, prev.inspectorWidth - delta)),
              }));
            }}
            onResizeEnd={() => saveLayout()}
            onReset={() => {
              setLayout((prev) => ({ ...prev, inspectorWidth: DEFAULT_LAYOUT.inspectorWidth }));
              saveLayout({ inspectorWidth: DEFAULT_LAYOUT.inspectorWidth });
            }}
          />
        )}

        {/* 3. Inspector Panel */}
        {layout.isInspectorOpen && (
          <div
            style={{
              width: `${layout.inspectorWidth}px`,
              height: '100%',
              flexShrink: 0,
              display: 'flex',
            }}
          >
            <SchematicInspector
              selectedItem={selectedItem}
              circuitData={circuitData}
              topModule={topModule}
              synthesisStatus={synthesisStatus}
              onSetInputValue={(inputId, val) => {
                viewportRef.current?.setInput(inputId, val);
                if (selectedItem && selectedItem.id === inputId) {
                  setSelectedItem({ ...selectedItem, logicValue: val });
                }
              }}
              onClose={() => {
                inspectorCollapsedByTruthTableRef.current = false;
                saveLayout({ isInspectorOpen: false });
              }}
            />
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={() => setAlertMessage(null)}>
          <div className="relative flex flex-col w-full max-w-sm bg-[#0c1322] border border-amber-500/40 rounded-xl shadow-2xl overflow-hidden font-sans" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-[#090f1c]">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100">Action Blocked</h3>
            </div>
            <div className="p-6 text-xs text-slate-300">
              {alertMessage}
            </div>
            <div className="flex justify-end px-6 py-3.5 bg-[#090f1c] border-t border-slate-800">
              <button onClick={() => setAlertMessage(null)} className="px-4 py-2 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Prompt Modal */}
      {createPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={() => setCreatePromptOpen(false)}>
          <div className="relative flex flex-col w-full max-w-sm bg-[#0c1322] border border-indigo-500/40 rounded-xl shadow-2xl overflow-hidden font-sans" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-[#090f1c]">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100">Create New Module</h3>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-slate-400 mb-2">Enter HDL module file name:</label>
              <input
                type="text"
                value={createPromptValue}
                onChange={e => setCreatePromptValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitCreateNewFile(createPromptValue);
                  if (e.key === 'Escape') setCreatePromptOpen(false);
                }}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-3.5 bg-[#090f1c] border-t border-slate-800">
              <button onClick={() => setCreatePromptOpen(false)} className="px-4 py-2 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">Cancel</button>
              <button onClick={() => submitCreateNewFile(createPromptValue)} className="px-4 py-2 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shadow-sm">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
