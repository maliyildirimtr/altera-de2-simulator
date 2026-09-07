// ============================================================
// WaveformSimulator.tsx — EDA Lab Container (F2.1 Refactored)
//
// This is the pure orchestration layer. All rendering logic has
// been extracted to:
//   src/components/Waveform/
//     ├── InstanceTree.tsx
//     ├── ObjectsPanel.tsx
//     ├── SignalNamePanel.tsx
//     └── WaveformCanvas.tsx
//   src/services/
//     ├── waveformRenderer.ts
//     └── transitionSearch.ts
// ============================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play, RotateCcw, ZoomIn, ZoomOut, Settings,
  FolderOpen, FileCode, Clock, Upload,
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';

import { parseRawVCD } from '../services/vcdParser';
import type { SimulationData, VCDSignal, VCDScope } from '../services/vcdParser';
import { simulateSystemVerilog } from '../services/hardwareSimulator';

import { InstanceTree } from '../components/Waveform/InstanceTree';
import { ObjectsPanel } from '../components/Waveform/ObjectsPanel';
import { SignalNamePanel } from '../components/Waveform/SignalNamePanel';
import type { RenderableRow } from '../components/Waveform/SignalNamePanel';
import { WaveformCanvas } from '../components/Waveform/WaveformCanvas';
import type { WaveformMarker } from '../components/Waveform/WaveformCanvas';
import { BASE_PIXELS_PER_UNIT, formatTime } from '../services/waveformRenderer';

// ─────────────────────────────────────────────────────────────
export default function WaveformSimulator() {

  // ── Core simulation state ─────────────────────────────────
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [currentTime,    setCurrentTime]    = useState<number>(0);
  const [zoomLevel,      setZoomLevel]      = useState<number>(1);
  const [hoverTime,      setHoverTime]      = useState<number | null>(null);
  const [cursorB,        setCursorB]        = useState<number | null>(null);   // F1.1

  // ── Hierarchy & signal selection ──────────────────────────
  const [rootTree,       setRootTree]       = useState<VCDScope | null>(null); // full hierarchy — never changes after load
  const [activeScope,    setActiveScope]    = useState<VCDScope | null>(null); // currently selected scope (highlight only)
  const [waveSignalNames,  setWaveSignalNames]  = useState<string[]>([]);
  const [expandedBusses,   setExpandedBusses]   = useState<string[]>([]);
  const [selectedSignal,   setSelectedSignal]   = useState<string | null>(null);
  const [radixes,          setRadixes]          = useState<Record<string, 'hex' | 'dec' | 'bin'>>({});

  // ── EDA two-stage workflow ───────────────────────────────
  const [isSimRunning, setIsSimRunning] = useState<boolean>(false);
  const [isCompiling,  setIsCompiling]  = useState<boolean>(false);

  // ── F2.4: Marker / Bookmark system ───────────────────────
  const [markers, setMarkers] = useState<WaveformMarker[]>([]);

  const handleAddMarker = (mk: WaveformMarker) =>
    setMarkers(prev => [...prev, mk]);

  const handleRemoveMarker = (id: string) =>
    setMarkers(prev => prev.filter(m => m.id !== id));

  // ── Context menu ──────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; signalName: string; type: 'radix' | 'remove';
  } | null>(null);

  // ── File context menu (right-click delete) ───────────────────
  const [fileContextMenu, setFileContextMenu] = useState<{
    x: number; y: number; fileName: string;
  } | null>(null);

  const handleFileContextMenu = (e: React.MouseEvent, fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFileContextMenu({ x: e.clientX, y: e.clientY, fileName });
  };

  const deleteFile = (fileName: string) => {
    setProjectFiles(prev => prev.filter(f => f.name !== fileName));
    setOpenTabs(prev => prev.filter(t => t !== fileName));
    if (activeTab === fileName) setActiveTab('waveform');
    setFileContextMenu(null);
  };

  // ── Layout / resize ───────────────────────────────────────
  const [leftWidth,    setLeftWidth]    = useState(20);
  const [midWidth,     setMidWidth]     = useState(25);
  const [bottomHeight, setBottomHeight] = useState(25);
  const [isResizing,   setIsResizing]   = useState(false);

  // ── File / tab management ─────────────────────────────────
  const [projectFiles, setProjectFiles] = useState<{name: string; type: string; content: string}[]>([]);
  const [openTabs,     setOpenTabs]     = useState<string[]>(['waveform']);
  const [activeTab,    setActiveTab]    = useState<string>('waveform');

  const transcriptRef = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [simulationData?.logs]);

  // Click outside to close context menus
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setFileContextMenu(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const name = file.name;
        const type = name.endsWith('.vcd') ? 'vcd' : name.split('.').pop() || 'txt';
        setProjectFiles(prev => [...prev.filter(f => f.name !== name), { name, type, content: text }]);
        if (!openTabs.includes(name)) setOpenTabs(prev => [...prev, name]);
        setActiveTab(name);
      };
      reader.readAsText(file);
    });
  };

  const handleCodeChange = (name: string, content: string) => {
    setProjectFiles(prev => prev.map(f => f.name === name ? { ...f, content } : f));
  };

  const initSimulationData = (data: SimulationData) => {
    setSimulationData(data);
    setRootTree(data.tree);   // ← kaydet, bir daha değişmez
    setActiveScope(data.tree); // ← başlangıçta root seçili
    setWaveSignalNames([]);
    setCurrentTime(0);
    setCursorB(null);
    setIsSimRunning(false);
    setActiveTab('waveform');
    if (!openTabs.includes('waveform')) setOpenTabs(prev => ['waveform', ...prev]);
  };

  const compileSimulation = async () => {
    setIsCompiling(true);
    setIsSimRunning(false);

    // PATH 1: Direct .vcd file load
    const vcdFile = projectFiles.find(f => f.type === 'vcd');
    if (vcdFile) {
      const data = parseRawVCD(vcdFile.content);
      initSimulationData(data);
      setIsCompiling(false);
      return;
    }

    // PATH 2: Source files → Worker
    const sourceFiles = projectFiles.filter(f => f.type !== 'vcd');
    const activeName  = projectFiles.find(f => f.name === activeTab)?.name;
    const result      = await simulateSystemVerilog(sourceFiles, activeName);

    if (result.status === 'ok' && result.simulationData) {
      const data = result.simulationData as SimulationData;
      data.logs  = [...result.logs, ...(data.logs ?? [])];
      initSimulationData(data);
    } else {
      setSimulationData({
        maxTime: 0, signals: [], logs: result.logs,
        tree: { name: 'Root', type: 'root', children: {}, signals: {} },
        timescale: { magnitude: 1, unit: 'ps', toPsFactor: 1 },
      });
      setWaveSignalNames([]);
    }

    setCurrentTime(0);
    setIsCompiling(false);
    if (activeTab !== 'waveform') {
      setActiveTab('waveform');
      if (!openTabs.includes('waveform')) setOpenTabs(prev => ['waveform', ...prev]);
    }
  };

  const runSimulation = () => {
    if (!simulationData) return;
    setIsSimRunning(true);
    setCurrentTime(0);
  };

  const restartSimulation = () => setCurrentTime(0);

  // ── F2.6 Ruler ticks (Fixed scale ratio) ────────────────────
  const rulerTicks = useMemo(() => {
    if (!simulationData || simulationData.maxTime === 0) return [];
    
    // Determine how many time units represent roughly 100 pixels at current zoom
    const targetUnits = 100 / (BASE_PIXELS_PER_UNIT * zoomLevel);
    
    // Find nearest nice order of magnitude (1, 10, 100, etc)
    const magnitude = Math.pow(10, Math.floor(Math.log10(targetUnits || 1)));
    const norm = targetUnits / magnitude;
    
    // Pick nice intervals: 1, 2, 5, 10
    let interval = norm > 5 ? 10 * magnitude : norm > 2 ? 5 * magnitude : norm > 1 ? 2 * magnitude : magnitude;
    interval = Math.max(1, Math.round(interval)); // Enforce minimum tick of 1 unit
    
    const ticks: number[] = [];
    for (let t = 0; t <= simulationData.maxTime; t += interval) {
      ticks.push(t);
    }
    return ticks;
  }, [simulationData, zoomLevel]);

  // ── Visible signals & renderable rows ────────────────────
  const visibleSignals = useMemo(() => {
    if (!simulationData) return [] as VCDSignal[];
    return simulationData.signals.filter(s => waveSignalNames.includes(s.name));
  }, [simulationData, waveSignalNames]);

  const renderableRows = useMemo<RenderableRow[]>(() => {
    const rows: RenderableRow[] = [];
    visibleSignals.forEach(sig => {
      rows.push({ type: 'signal', id: sig.name, signal: sig,
        displayName: sig.name.split('.').pop() || sig.name, indent: 0 });
      if (sig.width > 1 && expandedBusses.includes(sig.name)) {
        for (let i = sig.width - 1; i >= 0; i--) {
          rows.push({ type: 'bit', id: `${sig.name}[${i}]`, signal: sig,
            bitIndex: i, displayName: `[${i}]`, indent: 12, parentName: sig.name });
        }
      }
    });
    return rows;
  }, [visibleSignals, expandedBusses]);

  const toggleBusExpand = (name: string) =>
    setExpandedBusses(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  // ── Context menu ──────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent, signalName: string, type: 'radix' | 'remove') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, signalName, type });
  };
  const closeContextMenu = () => setContextMenu(null);

  // ── Layout drag ───────────────────────────────────────────
  const handleDrag = (e: MouseEvent, setter: React.Dispatch<React.SetStateAction<number>>) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const isVertical = setter === setBottomHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isVertical) {
        const delta = startY - moveEvent.clientY;
        setter(prev => Math.max(10, Math.min(80, prev + (delta / window.innerHeight) * 100)));
      } else {
        const delta = moveEvent.clientX - startX;
        setter(prev => Math.max(10, Math.min(50, prev + (delta / window.innerWidth) * 100)));
      }
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={`flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-sans overflow-hidden ${isResizing ? 'select-none' : 'selection:bg-[#3a3d41]'}`}>

      {/* ── TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="flex items-center px-4 h-12 bg-[#2d2d2d] border-b border-[#3c3c3c] shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-6 w-full">
          {/* EDA Actions */}
          <div className="flex items-center gap-2">
            {/* Upload — Compile'in solunda */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-[#3a3d41] hover:bg-[#4a4d51] transition-colors"
              title="Upload .sv / .v / .vcd file"
            >
              <Upload size={16} />
              Upload
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept=".v,.sv,.txt,.vcd"
            />

            <div className="w-px h-5 bg-[#555]" />

            <button
              onClick={compileSimulation}
              disabled={isCompiling}
              className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-all ${
                isCompiling
                  ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isCompiling ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <Settings size={16} />}
              {isCompiling ? 'Compiling...' : 'Compile & Load'}
            </button>
            <button
              onClick={runSimulation}
              disabled={!simulationData || isCompiling || isSimRunning}
              className={`flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-all ${
                !simulationData || isCompiling || isSimRunning
                  ? 'bg-green-700/50 text-green-300/50 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white shadow-md hover:shadow-lg'
              }`}
            >
              <Play size={16} />
              Run
            </button>
            <button
              onClick={restartSimulation}
              disabled={!isSimRunning}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium hover:bg-[#3a3d41] transition-colors disabled:opacity-50"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="w-px h-6 bg-[#444]" />

          {/* Zoom & Navigation */}
          <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-md px-3 py-1 border border-[#3c3c3c]">
            <button onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.2))}
                    className="p-1 hover:bg-[#3a3d41] hover:text-white rounded text-gray-400">
              <ZoomOut size={16} />
            </button>
            <div className="flex flex-col items-center min-w-[50px]">
              <span className="text-[10px] text-gray-500 font-medium tracking-wider">ZOOM</span>
              <span className="text-xs font-mono">{zoomLevel.toFixed(1)}x</span>
            </div>
            <button onClick={() => setZoomLevel(prev => Math.min(10, prev + 0.2))}
                    className="p-1 hover:bg-[#3a3d41] hover:text-white rounded text-gray-400">
              <ZoomIn size={16} />
            </button>
          </div>
          

          <div className="ml-auto flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
                <span className="text-[10px] text-gray-500 font-medium">TIME:</span>
                <span className="text-xs font-mono text-[#00ff00] w-[60px] text-right">
                  {formatTime(currentTime, simulationData?.timescale)}
                </span>
             </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT PANEL: Project Explorer & Hardware Hierarchy */}
          <div className="shrink-0 flex flex-col border-r border-[#333333] bg-[#252526]" style={{ width: `${leftWidth}%`, transition: isResizing ? 'none' : '' }}>
            {/* Project Files */}
            <div className="flex-1 min-h-[100px] flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 bg-[#2d2d2d] text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-[#333] flex items-center gap-2 shrink-0">
                <FolderOpen size={14} /> Project Files
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {projectFiles.length === 0 && (
                  <div className="px-3 py-4 text-xs text-gray-500 italic text-center">
                    No files. Upload a .sv/.v/.vcd file.
                  </div>
                )}
                {projectFiles.map(file => (
                  <div
                    key={file.name}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-300 hover:bg-[#37373d] hover:text-white cursor-pointer group"
                    onClick={() => {
                      if (!openTabs.includes(file.name)) setOpenTabs(prev => [...prev, file.name]);
                      setActiveTab(file.name);
                    }}
                    onContextMenu={e => handleFileContextMenu(e, file.name)}
                  >
                    <FileCode size={14} className={file.name.endsWith('.sv') ? 'text-blue-400' : file.name.endsWith('.vcd') ? 'text-green-400' : 'text-gray-400'} />
                    <span className="truncate flex-1">{file.name}</span>
                    {/* Hover trash icon */}
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 text-gray-500"
                      onClick={e => { e.stopPropagation(); deleteFile(file.name); }}
                      title="Delete file"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="h-px bg-[#333] shrink-0" />

            {/* Instance Tree (only populated during compilation) */}
            <div className="flex-1 min-h-[100px] flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 bg-[#2d2d2d] text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-[#333] flex items-center gap-2 shrink-0">
                <Settings size={14} /> Hardware Hierarchy
              </div>
              <div className="flex-1 overflow-y-auto">
                <InstanceTree
                  tree={rootTree}
                  activeScope={activeScope}
                  onScopeSelect={setActiveScope}
                />
              </div>
            </div>
          </div>

          {/* SPLITTER */}
          <div className="w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 z-10 shrink-0 transition-colors"
               onMouseDown={e => handleDrag(e.nativeEvent, setLeftWidth)} />

          {/* MIDDLE PANEL: Objects */}
          <div className="shrink-0 flex flex-col border-r border-[#333333] bg-[#252526]" style={{ width: `${midWidth}%`, transition: isResizing ? 'none' : '' }}>
            <ObjectsPanel
              activeScope={activeScope}
              currentTime={currentTime}
              waveSignalNames={waveSignalNames}
              onAddSignals={names => setWaveSignalNames(prev => Array.from(new Set([...prev, ...names])))}
            />
          </div>

          {/* SPLITTER */}
          <div className="w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 z-10 shrink-0 transition-colors"
               onMouseDown={e => handleDrag(e.nativeEvent, setMidWidth)} />

          {/* RIGHT PANEL: Editor & Waveform */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] relative">
            {/* Tab Bar */}
            <div className="flex bg-[#2d2d2d] shrink-0 overflow-x-auto overflow-y-hidden border-b border-[#1e1e1e]">
              {openTabs.map((tab, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm border-r border-[#1e1e1e] cursor-pointer min-w-max transition-colors relative ${
                    activeTab === tab
                      ? 'bg-[#1e1e1e] text-blue-400'
                      : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#37373d]'
                  }`}
                >
                  {tab === 'waveform' ? <Clock size={14} /> : <FileCode size={14} />}
                  <span>{tab === 'waveform' ? 'Wave - Default' : tab}</span>
                  {activeTab === tab && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500" />
                  )}
                  {tab !== 'waveform' && (
                    <button
                      className="ml-2 p-0.5 rounded-full hover:bg-gray-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenTabs(prev => prev.filter(t => t !== tab));
                        if (activeTab === tab) setActiveTab('waveform');
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'waveform' ? (
              <div className="flex-1 flex overflow-hidden bg-black" style={{ pointerEvents: isResizing ? 'none' : 'auto' }}>
                {/* Left: Signal Names Panel */}
                <SignalNamePanel
                  rows={renderableRows}
                  currentTime={currentTime}
                  selectedSignal={selectedSignal}
                  radixes={radixes}
                  onSelectSignal={setSelectedSignal}
                  onSetCurrentTime={setCurrentTime}
                  onContextMenu={handleContextMenu}
                  onToggleBusExpand={toggleBusExpand}
                  expandedBusses={expandedBusses}
                />
                
                {/* Right: SVG Canvas */}
                <WaveformCanvas
                  simulationData={simulationData}
                  isSimRunning={isSimRunning}
                  rows={renderableRows}
                  selectedSignal={selectedSignal}
                  zoomLevel={zoomLevel}
                  rulerTicks={rulerTicks}
                  currentTime={currentTime}
                  cursorB={cursorB}
                  hoverTime={hoverTime}
                  radixes={radixes}
                  markers={markers}
                  onTimeChange={setCurrentTime}
                  onCursorBChange={setCursorB}
                  onHoverChange={setHoverTime}
                  onAddMarker={handleAddMarker}
                  onRemoveMarker={handleRemoveMarker}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 w-full h-full relative" style={{ pointerEvents: isResizing ? 'none' : 'auto' }}>
                <MonacoEditor
                  height="100%"
                  language={activeTab.endsWith('.sv') || activeTab.endsWith('.v') ? 'systemverilog' : 'verilog'}
                  theme="vs-dark"
                  value={projectFiles.find(f => f.name === activeTab)?.content || ''}
                  onChange={value => handleCodeChange(activeTab, value ?? '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
                    fontLigatures: true,
                    lineNumbers: 'on',
                    glyphMargin: false,
                    folding: true,
                    automaticLayout: true,
                    padding: { top: 16 }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM TRANSCRIPT PANEL ─────────────────────────────────── */}
        <div className="shrink-0 flex flex-col bg-[#1e1e1e] border-t border-[#3c3c3c]" style={{ height: `${bottomHeight}%`, transition: isResizing ? 'none' : '' }}>
          <div
            className="h-1 cursor-row-resize hover:bg-blue-500 active:bg-blue-600 transition-colors shrink-0 -mt-[1px]"
            onMouseDown={e => handleDrag(e.nativeEvent, setBottomHeight)}
          />
          <div className="px-4 py-1.5 bg-[#2d2d2d] text-xs font-semibold tracking-wider text-gray-300 flex justify-between items-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.3)] z-10">
            <span>TRANSCRIPT</span>
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] text-gray-300 leading-tight">
            {simulationData?.logs && simulationData.logs.length > 0 ? (
              simulationData.logs.map((log, i) => (
                <div key={i} className={`whitespace-pre-wrap mb-1 ${log.includes('Error') || log.includes('error') ? 'text-red-400' : log.includes('Warning') ? 'text-yellow-400' : ''}`}>
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No output yet.</div>
            )}
          </div>
        </div>

      </div>

      {/* ── Context Menu (Portal/Absolute) ────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#252526] border border-[#454545] shadow-xl py-1 rounded w-36"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.type === 'radix' && (
            <>
              <div className="px-3 py-1 text-[10px] text-gray-400 border-b border-[#333] mb-1">Radix</div>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#094771] hover:text-white"
                onClick={() => {
                  setRadixes(prev => ({ ...prev, [contextMenu.signalName]: 'hex' }));
                  closeContextMenu();
                }}
              >Hexadecimal</button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#094771] hover:text-white"
                onClick={() => {
                  setRadixes(prev => ({ ...prev, [contextMenu.signalName]: 'dec' }));
                  closeContextMenu();
                }}
              >Decimal</button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-[#cccccc] hover:bg-[#094771] hover:text-white"
                onClick={() => {
                  setRadixes(prev => ({ ...prev, [contextMenu.signalName]: 'bin' }));
                  closeContextMenu();
                }}
              >Binary</button>
            </>
          )}
          {contextMenu.type === 'remove' && (
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-[#5a1d1d] hover:text-white"
              onClick={() => {
                setWaveSignalNames(prev => prev.filter(n => n !== contextMenu.signalName));
                closeContextMenu();
              }}
            >Remove from Wave</button>
          )}
        </div>
      )}

      {/* ── File Context Menu (right-click delete) ────────────────── */}
      {fileContextMenu && (
        <div
          className="fixed z-50 bg-[#252526] border border-[#454545] shadow-xl py-1 rounded w-44"
          style={{ top: fileContextMenu.y, left: fileContextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[10px] text-gray-400 border-b border-[#333] mb-1 truncate">
            {fileContextMenu.fileName}
          </div>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-[#5a1d1d] hover:text-white flex items-center gap-2"
            onClick={() => deleteFile(fileContextMenu.fileName)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Delete File
          </button>
        </div>
      )}
    </div>
  );
}
