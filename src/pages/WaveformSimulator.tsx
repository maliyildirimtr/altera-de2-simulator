// ============================================================
// WaveformSimulator.tsx — Modern Waveform Simulation Workspace
//
// Phase 4: Structured Teaching-First EDA Waveform Workspace
// - WaveformToolbar: View toggles, Compile, Run, Restart, Zoom Fit, Real Timings
// - WaveformProjectPanel: Source & Testbench slots with explicit assignment + Hierarchy
// - WaveformObjectsPanel: Collapsible signals list with instant filter
// - WaveformConsole: Tabbed Console & Problems with syntax styling
// - 5 Resizable boundaries with Phase 3.2 ResizableDivider
// - Real VCD timescale preservation, deterministic cursor navigation
// ============================================================

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';

import { parseRawVCD } from '../services/vcdParser';
import type { SimulationData, VCDSignal, VCDScope } from '../services/vcdParser';
import { simulateSystemVerilog } from '../services/hardwareSimulator';

import { WaveformToolbar } from '../components/Waveform/WaveformToolbar';
import { WaveformProjectPanel, type ProjectSlotFile } from '../components/Waveform/WaveformProjectPanel';
import { WaveformObjectsPanel } from '../components/Waveform/WaveformObjectsPanel';
import { WaveformConsole } from '../components/Waveform/WaveformConsole';
import { SignalNamePanel, type RenderableRow } from '../components/Waveform/SignalNamePanel';
import { WaveformCanvas, type WaveformMarker } from '../components/Waveform/WaveformCanvas';
import { ResizableDivider } from '../components/DE2Workspace/ResizableDivider';
import { BASE_PIXELS_PER_UNIT } from '../services/waveformRenderer';
import { consumePendingHandoff, markWorkspaceOrigin, markWorkspaceDirty, markWorkspaceUser } from '../services/exampleHandoff';
import { getExampleById } from '../examples/registry';

// ── Layout Persistence Schema ────────────────────────────────
const LAYOUT_STORAGE_KEY = 'wf_workspace_layout_v1';

interface WaveformLayout {
  projectWidth: number;      // px, default 220
  objectsWidth: number;      // px, default 240
  editorRatio: number;       // ratio of right area height, default 0.35
  signalColumnWidth: number; // px, default 240
  consoleHeight: number;     // px, default 160
}

const DEFAULT_LAYOUT: WaveformLayout = {
  projectWidth: 220,
  objectsWidth: 240,
  editorRatio: 0.35,
  signalColumnWidth: 240,
  consoleHeight: 160,
};

function loadSavedLayout(): WaveformLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      projectWidth: typeof parsed.projectWidth === 'number' ? Math.max(150, Math.min(380, parsed.projectWidth)) : DEFAULT_LAYOUT.projectWidth,
      objectsWidth: typeof parsed.objectsWidth === 'number' ? Math.max(160, Math.min(420, parsed.objectsWidth)) : DEFAULT_LAYOUT.objectsWidth,
      editorRatio: typeof parsed.editorRatio === 'number' ? Math.max(0.18, Math.min(0.72, parsed.editorRatio)) : DEFAULT_LAYOUT.editorRatio,
      signalColumnWidth: typeof parsed.signalColumnWidth === 'number' ? Math.max(160, Math.min(480, parsed.signalColumnWidth)) : DEFAULT_LAYOUT.signalColumnWidth,
      consoleHeight: typeof parsed.consoleHeight === 'number' ? Math.max(80, Math.min(400, parsed.consoleHeight)) : DEFAULT_LAYOUT.consoleHeight,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export default function WaveformSimulator() {
  // ── Layout State ──────────────────────────────────────────
  const [layout, setLayout] = useState<WaveformLayout>(loadSavedLayout);
  const layoutRef = useRef<WaveformLayout>(layout);
  layoutRef.current = layout;

  // Panel Collapsed States
  const [isProjectOpen, setIsProjectOpen] = useState(true);
  const [isObjectsOpen, setIsObjectsOpen] = useState(true);
  const [isEditorOpen,  setIsEditorOpen]  = useState(true);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);

  // Center right area ref to measure height for editorRatio
  const rightAreaRef = useRef<HTMLDivElement>(null);

  // Save layout only on drag end / resize end
  const persistLayout = useCallback((updated: WaveformLayout) => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  }, []);

  // ── File & Slot Management ────────────────────────────────
  const [sourceFile,    setSourceFile]    = useState<ProjectSlotFile | null>(null);
  const [testbenchFile, setTestbenchFile] = useState<ProjectSlotFile | null>(null);
  const [vcdFile,       setVcdFile]       = useState<ProjectSlotFile | null>(null);
  const [activeEditorSlot, setActiveEditorSlot] = useState<'source' | 'testbench'>('source');


  // Input refs for file uploads
  const sourceInputRef  = useRef<HTMLInputElement>(null);
  const tbInputRef      = useRef<HTMLInputElement>(null);
  const vcdInputRef     = useRef<HTMLInputElement>(null);
  const generalInputRef = useRef<HTMLInputElement>(null);

  // ── Simulation Engine State ───────────────────────────────
  const [simulationData,   setSimulationData]   = useState<SimulationData | null>(null);
  const [currentTime,      setCurrentTime]      = useState<number>(0);
  const [zoomLevel,        setZoomLevel]        = useState<number>(1);
  const [hoverTime,        setHoverTime]        = useState<number | null>(null);
  const [cursorB,          setCursorB]          = useState<number | null>(null);
  const [rootTree,         setRootTree]         = useState<VCDScope | null>(null);
  const [activeScope,      setActiveScope]      = useState<VCDScope | null>(null);
  const [waveSignalNames,  setWaveSignalNames]  = useState<string[]>([]);
  const [expandedBusses,   setExpandedBusses]   = useState<string[]>([]);
  const [selectedSignal,   setSelectedSignal]   = useState<string | null>(null);
  const [radixes,          setRadixes]          = useState<Record<string, 'hex' | 'dec' | 'bin'>>({});
  const [markers,          setMarkers]          = useState<WaveformMarker[]>([]);

  const [isSimRunning, setIsSimRunning] = useState<boolean>(false);
  const [isPlaying,    setIsPlaying]    = useState<boolean>(false);
  const [isCompiling,  setIsCompiling]  = useState<boolean>(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [consoleLogs,  setConsoleLogs]  = useState<string[]>([
    '[EDA Studio] Waveform Workspace initialized. Load HDL files to begin.',
  ]);

  const simulationDataRef = useRef<SimulationData | null>(null);
  const isSimRunningRef   = useRef<boolean>(false);
  const isPlayingRef      = useRef<boolean>(false);
  const currentTimeRef    = useRef<number>(0);
  const zoomLevelRef      = useRef<number>(1);

  const waveformCanvasContainerRef = useRef<HTMLDivElement>(null);
  const playbackAnimRef = useRef<number | null>(null);

  // ── Explicit Intent Updaters ──────────────────────────────
  const clearSimulationState = useCallback(() => {
    setSimulationData(null);
    simulationDataRef.current = null;
    setRootTree(null);
    setActiveScope(null);
    setWaveSignalNames([]);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setHoverTime(null);
    setCursorB(null);
    setMarkers([]);
    setCompileStatus('idle');
    setIsSimRunning(false);
    isSimRunningRef.current = false;
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const loadSourceFile = useCallback((f: ProjectSlotFile | null) => {
    setSourceFile(f);
    clearSimulationState();
  }, [clearSimulationState]);

  const editSourceContent = useCallback((content: string) => {
    setSourceFile(prev => prev ? { ...prev, content } : null);
  }, []);

  const loadTestbenchFile = useCallback((f: ProjectSlotFile | null) => {
    setTestbenchFile(f);
    clearSimulationState();
  }, [clearSimulationState]);

  const editTestbenchContent = useCallback((content: string) => {
    setTestbenchFile(prev => prev ? { ...prev, content } : null);
  }, []);

  const loadVcdFile = useCallback((f: ProjectSlotFile | null) => {
    setVcdFile(f);
    clearSimulationState();
  }, [clearSimulationState]);


  // ── Context Menus ─────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; signalName: string; type: 'radix' | 'remove';
  } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Consume incoming example handoff (Phase 6)
  useEffect(() => {
    const handoff = consumePendingHandoff('waveform');
    if (handoff) {
      const ex = getExampleById(handoff.exampleId);
      if (ex) {
        loadSourceFile({ name: ex.source.filename, type: 'sv', content: ex.source.code });
        loadTestbenchFile(
          ex.testbench
            ? { name: ex.testbench.filename, type: 'sv', content: ex.testbench.code }
            : null
        );
        loadVcdFile(null);
        setActiveEditorSlot('source');
        setConsoleLogs((prev) => [
          ...prev,
          `[EDA Studio] Loaded example: ${ex.title} (${ex.source.filename})`,
        ]);
        markWorkspaceOrigin('waveform', 'example');
      }
    }
  }, [loadSourceFile, loadTestbenchFile, loadVcdFile]);

  // ── File Handlers (Explicit Import Wins) ───────────────────
  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      loadSourceFile({ name: file.name, type: file.name.split('.').pop() || 'sv', content });
      markWorkspaceUser('waveform');
      setActiveEditorSlot('source');
      setIsEditorOpen(true);
      setConsoleLogs(prev => [...prev, `[Project] Loaded Source module: ${file.name}`]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleTbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      loadTestbenchFile({ name: file.name, type: file.name.split('.').pop() || 'sv', content });
      markWorkspaceUser('waveform');
      setActiveEditorSlot('testbench');
      setIsEditorOpen(true);
      setConsoleLogs(prev => [...prev, `[Project] Loaded Testbench: ${file.name}`]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleVcdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      loadVcdFile({ name: file.name, type: 'vcd', content });
      setConsoleLogs(prev => [...prev, `[Project] Loaded VCD directly: ${file.name}`]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGeneralUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = (ev.target?.result as string) || '';
        const name = file.name;
        const lower = name.toLowerCase();

        if (lower.endsWith('.vcd')) {
          loadVcdFile({ name, type: 'vcd', content });
          setConsoleLogs(prev => [...prev, `[Project] Loaded VCD: ${name}`]);
        } else if (lower.includes('_tb') || lower.includes('tb_') || lower.includes('testbench') || lower.includes('bench')) {
          loadTestbenchFile({ name, type: name.split('.').pop() || 'sv', content });
          markWorkspaceUser('waveform');
          setActiveEditorSlot('testbench');
          setIsEditorOpen(true);
          setConsoleLogs(prev => [...prev, `[Project] Assigned to Testbench slot: ${name}`]);
        } else {
          loadSourceFile({ name, type: name.split('.').pop() || 'sv', content });
          markWorkspaceUser('waveform');
          setActiveEditorSlot('source');
          setIsEditorOpen(true);
          setConsoleLogs(prev => [...prev, `[Project] Assigned to Source slot: ${name}`]);
        }
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const handleClearSlot = (slot: 'source' | 'testbench' | 'vcd') => {
    if (slot === 'source') {
      loadSourceFile(null);
      setConsoleLogs(prev => [...prev, '[Project] Cleared Source slot.']);
    } else if (slot === 'testbench') {
      loadTestbenchFile(null);
      setConsoleLogs(prev => [...prev, '[Project] Cleared Testbench slot.']);
    } else {
      loadVcdFile(null);
      setConsoleLogs(prev => [...prev, '[Project] Cleared VCD slot.']);
    }
  };

  // ── Simulation Initialization ─────────────────────────────
  const initSimulationData = (data: SimulationData) => {
    simulationDataRef.current = data;
    setSimulationData(data);
    setRootTree(data.tree);

    // Auto-select obvious top/testbench scope if available
    const childKeys = Object.keys(data.tree.children || {});
    let topScope: VCDScope = data.tree;
    if (childKeys.length === 1) {
      topScope = data.tree.children[childKeys[0]];
    } else if (childKeys.length > 1) {
      const tbKey = childKeys.find(k => k.toLowerCase().includes('tb') || k.toLowerCase().includes('test'));
      if (tbKey && data.tree.children[tbKey]) {
        topScope = data.tree.children[tbKey];
      }
    }
    setActiveScope(topScope);

    currentTimeRef.current = 0;
    setCurrentTime(0);
    setCursorB(null);
    setMarkers([]);
    setCompileStatus('success');
    isSimRunningRef.current = false;
    setIsSimRunning(false);
    isPlayingRef.current = false;
    setIsPlaying(false);

    // Auto-populate signals from selected top scope if present
    const topScopeSignals = Object.values(topScope.signals).map(s => s.name);
    if (topScopeSignals.length > 0) {
      setWaveSignalNames(topScopeSignals);
    } else if (data.signals.length > 0) {
      setWaveSignalNames(data.signals.slice(0, 8).map(s => s.name));
    } else {
      setWaveSignalNames([]);
    }
  };

  // ── Compilation ───────────────────────────────────────────
  const compileSimulation = async () => {
    if (playbackAnimRef.current) {
      cancelAnimationFrame(playbackAnimRef.current);
      playbackAnimRef.current = null;
    }

    setIsCompiling(true);
    setCompileStatus('compiling');
    isSimRunningRef.current = false;
    setIsSimRunning(false);
    isPlayingRef.current = false;
    setIsPlaying(false);
    setConsoleLogs(prev => [...prev, '[Compiler] Starting compilation pipeline...']);

    const currentVcd = vcdFile;
    const currentSrc = sourceFile;
    const currentTb  = testbenchFile;

    // PATH 1: Direct VCD mode
    if (currentVcd) {
      try {
        const data = parseRawVCD(currentVcd.content);
        initSimulationData(data);
        setConsoleLogs(prev => [
          ...prev,
          `[VCD] Parsed direct VCD successfully (${data.signals.length} signals, maxTime=${data.maxTime}).`,
        ]);
      } catch (err) {
        simulationDataRef.current = null;
        setSimulationData(null);
        setRootTree(null);
        setActiveScope(null);
        setCompileStatus('error');
        setWaveSignalNames([]);
        setCursorB(null);
        setMarkers([]);
        setIsConsoleOpen(true);
        setConsoleLogs(prev => [...prev, `[HATA] VCD parse error: ${String(err)}`]);
      }
      setIsCompiling(false);
      return;
    }

    // PATH 2: HDL Source & Testbench mode
    const filesToCompile: { name: string; type: string; content: string }[] = [];
    if (currentSrc) filesToCompile.push(currentSrc);
    if (currentTb)  filesToCompile.push(currentTb);

    if (filesToCompile.length === 0) {
      simulationDataRef.current = null;
      setSimulationData(null);
      setCompileStatus('error');
      setWaveSignalNames([]);
      setCursorB(null);
      setMarkers([]);
      setConsoleLogs(prev => [
        ...prev,
        '[HATA] No HDL files to compile. Please import a Source or Testbench file first.',
      ]);
      setIsCompiling(false);
      return;
    }

    // Testbench file is always the top-level testbench for simulation
    const activeName = currentTb ? currentTb.name : (currentSrc?.name || filesToCompile[0].name);
    const result = await simulateSystemVerilog(filesToCompile, activeName);

    if (result.logs && result.logs.length > 0) {
      setConsoleLogs(prev => [...prev, ...result.logs]);
    }

    if (result.status === 'ok' && result.simulationData) {
      const data = result.simulationData as SimulationData;
      data.logs = [...result.logs, ...(data.logs ?? [])];
      initSimulationData(data);
      setConsoleLogs(prev => [
        ...prev,
        `[Compiler] Compilation succeeded. Loaded ${data.signals.length} signals, duration: ${data.maxTime} units. ✓`,
      ]);
    } else {
      simulationDataRef.current = null;
      setSimulationData(null);
      setRootTree(null);
      setActiveScope(null);
      setCompileStatus('error');
      setWaveSignalNames([]);
      setCursorB(null);
      setMarkers([]);
      setIsConsoleOpen(true);
      setConsoleLogs(prev => [...prev, '[HATA] Simulation failed to produce valid VCD.']);
    }

    currentTimeRef.current = 0;
    setCurrentTime(0);
    setIsCompiling(false);
  };

  // ── One-shot Playback Simulation ───────────────────────────
  const runSimulation = () => {
    const data = simulationDataRef.current || simulationData;
    if (!data || data.maxTime === 0) return;

    if (playbackAnimRef.current) {
      cancelAnimationFrame(playbackAnimRef.current);
      playbackAnimRef.current = null;
    }

    isSimRunningRef.current = true;
    setIsSimRunning(true);
    isPlayingRef.current = true;
    setIsPlaying(true);
    currentTimeRef.current = 0;
    setCurrentTime(0);

    const maxT = data.maxTime;
    const durationMs = 1200; // ~1.2s smooth playback duration
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.min(1, elapsed / durationMs);
      const newT = Math.max(0, Math.min(maxT, Math.round(progress * maxT)));

      currentTimeRef.current = newT;
      setCurrentTime(newT);

      if (progress < 1) {
        playbackAnimRef.current = requestAnimationFrame(step);
      } else {
        playbackAnimRef.current = null;
        isPlayingRef.current = false;
        setIsPlaying(false);
        currentTimeRef.current = maxT;
        setCurrentTime(maxT);
      }
    };

    playbackAnimRef.current = requestAnimationFrame(step);
  };

  const restartSimulation = () => {
    if (playbackAnimRef.current) {
      cancelAnimationFrame(playbackAnimRef.current);
      playbackAnimRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    currentTimeRef.current = 0;
    setCurrentTime(0);
  };

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (playbackAnimRef.current) cancelAnimationFrame(playbackAnimRef.current);
    };
  }, []);

  // ── Zoom Fit ──────────────────────────────────────────────
  const handleZoomFit = useCallback(() => {
    const data = simulationDataRef.current || simulationData;
    if (!data || data.maxTime <= 0) return;
    const container = waveformCanvasContainerRef.current;
    if (!container) return;

    const availableWidth = container.clientWidth;
    if (availableWidth <= 0) return;

    const neededWidth = data.maxTime * BASE_PIXELS_PER_UNIT;
    if (neededWidth <= 0) return;

    // Fit with 2% breathing room so waveform spans nearly full available width
    const targetZoom = Math.max(0.0001, Math.min(20, (availableWidth * 0.98) / neededWidth));
    zoomLevelRef.current = targetZoom;
    setZoomLevel(targetZoom);
    container.scrollLeft = 0;
  }, [simulationData]);

  // Automatically recompute Zoom Fit when panel visibility changes (e.g. Focus Mode)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (simulationDataRef.current && simulationDataRef.current.maxTime > 0) {
        handleZoomFit();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [isProjectOpen, isObjectsOpen, isEditorOpen, isConsoleOpen, handleZoomFit]);

  // ── Global Keyboard Shortcuts ─────────────────────────────
  const compileSimulationRef = useRef(compileSimulation);
  useEffect(() => {
    compileSimulationRef.current = compileSimulation;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing inside inputs
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.altKey) {
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setIsProjectOpen(prev => !prev);
        } else if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          setIsObjectsOpen(prev => !prev);
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          setIsEditorOpen(prev => !prev);
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          setIsConsoleOpen(prev => !prev);
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          handleZoomFit();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        compileSimulationRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulationData]);

  // ── Ruler Ticks Calculation ───────────────────────────────
  const rulerTicks = useMemo(() => {
    if (!simulationData || simulationData.maxTime === 0) return [];
    const targetUnits = 100 / (BASE_PIXELS_PER_UNIT * zoomLevel);
    const magnitude = Math.pow(10, Math.floor(Math.log10(targetUnits || 1)));
    const norm = targetUnits / magnitude;
    let interval = norm > 5 ? 10 * magnitude : norm > 2 ? 5 * magnitude : norm > 1 ? 2 * magnitude : magnitude;
    interval = Math.max(1, Math.round(interval));

    const ticks: number[] = [];
    for (let t = 0; t <= simulationData.maxTime; t += interval) {
      ticks.push(t);
    }
    return ticks;
  }, [simulationData, zoomLevel]);

  // ── Visible Signals & Renderable Rows ─────────────────────
  const visibleSignals = useMemo(() => {
    if (!simulationData) return [] as VCDSignal[];
    const sigMap = new Map<string, VCDSignal>();
    simulationData.signals.forEach(s => sigMap.set(s.name, s));
    const result: VCDSignal[] = [];
    waveSignalNames.forEach(name => {
      const sig = sigMap.get(name);
      if (sig && !result.includes(sig)) {
        result.push(sig);
      }
    });
    return result;
  }, [simulationData, waveSignalNames]);

  const renderableRows = useMemo<RenderableRow[]>(() => {
    const rows: RenderableRow[] = [];
    visibleSignals.forEach(sig => {
      const parts = sig.name.split('.');
      const leaf = parts.pop() || sig.name;
      const scope = parts.join('.');
      rows.push({
        type: 'signal',
        id: sig.name,
        signal: sig,
        displayName: leaf,
        scopePath: scope || undefined,
        indent: 0,
      });
      if (sig.width > 1 && expandedBusses.includes(sig.name)) {
        for (let i = sig.width - 1; i >= 0; i--) {
          rows.push({
            type: 'bit',
            id: `${sig.name}[${i}]`,
            signal: sig,
            bitIndex: i,
            displayName: `[${i}]`,
            scopePath: scope || undefined,
            indent: 12,
            parentName: sig.name,
          });
        }
      }
    });
    return rows;
  }, [visibleSignals, expandedBusses]);

  const toggleBusExpand = (name: string) => {
    setExpandedBusses(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleContextMenu = (e: React.MouseEvent, signalName: string, type: 'radix' | 'remove') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, signalName, type });
  };


  const activeEditorFile = activeEditorSlot === 'source' ? sourceFile : testbenchFile;

  return (
    <div
      data-testid="waveform-workspace"
      data-compile-status={compileStatus}
      className="flex flex-col h-full w-full bg-[#0a1120] text-slate-200 font-sans overflow-hidden select-none"
    >
      {/* ── Hidden File Inputs ──────────────────────────────────── */}
      <input
        type="file"
        ref={sourceInputRef}
        onChange={handleSourceUpload}
        className="hidden"
        accept=".v,.sv,.txt"
      />
      <input
        type="file"
        ref={tbInputRef}
        onChange={handleTbUpload}
        className="hidden"
        accept=".v,.sv,.txt"
      />
      <input
        type="file"
        ref={vcdInputRef}
        onChange={handleVcdUpload}
        className="hidden"
        accept=".vcd"
      />
      <input
        type="file"
        ref={generalInputRef}
        onChange={handleGeneralUpload}
        multiple
        className="hidden"
        accept=".v,.sv,.txt,.vcd"
      />

      {/* ── TOP TOOLBAR ─────────────────────────────────────────── */}
      <WaveformToolbar
        isCompiled={compileStatus === 'success' && Boolean(simulationData && simulationData.maxTime > 0)}
        isCompiling={isCompiling}
        isSimRunning={isSimRunning}
        isPlaying={isPlaying}
        zoomLevel={zoomLevel}
        currentTime={currentTime}
        cursorB={cursorB}
        timescale={simulationData?.timescale}
        projectPanelOpen={isProjectOpen}
        objectsPanelOpen={isObjectsOpen}
        editorOpen={isEditorOpen}
        consoleOpen={isConsoleOpen}
        onToggleProjectPanel={() => setIsProjectOpen(prev => !prev)}
        onToggleObjectsPanel={() => setIsObjectsOpen(prev => !prev)}
        onToggleEditor={() => setIsEditorOpen(prev => !prev)}
        onToggleConsole={() => setIsConsoleOpen(prev => !prev)}
        onUpload={() => generalInputRef.current?.click()}
        onCompile={compileSimulation}
        onRun={runSimulation}
        onRestart={restartSimulation}
        onZoomIn={() => setZoomLevel(prev => Math.min(10, prev + 0.2))}
        onZoomOut={() => setZoomLevel(prev => Math.max(0.1, prev - 0.2))}
        onZoomFit={handleZoomFit}
      />

      {/* ── MAIN WORKSPACE AREA ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <div className="flex-1 flex min-h-0 overflow-hidden relative">

          {/* ── Panel 1: Project Panel ───────────────────────────── */}
          {isProjectOpen && (
            <>
              <WaveformProjectPanel
                width={layout.projectWidth}
                sourceFile={sourceFile}
                testbenchFile={testbenchFile}
                vcdFile={vcdFile}
                activeEditorSlot={activeEditorSlot}
                onSelectSlot={(slot) => {
                  setActiveEditorSlot(slot);
                  setIsEditorOpen(true);
                }}
                onImportSource={() => sourceInputRef.current?.click()}
                onImportTestbench={() => tbInputRef.current?.click()}
                onImportVcd={() => vcdInputRef.current?.click()}
                onClearSlot={handleClearSlot}
                rootTree={rootTree}
                activeScope={activeScope}
                onScopeSelect={setActiveScope}
              />

              {/* Boundary 1: Project ↔ Rest */}
              <ResizableDivider
                orientation="vertical"
                data-testid="splitter-wf-project"
                aria-label="Resize Project Panel"
                className="z-30"
                valueNow={layout.projectWidth}
                valueMin={150}
                valueMax={380}
                onResize={(delta) => {
                  setLayout(prev => {
                    const next = { ...prev, projectWidth: Math.max(150, Math.min(380, prev.projectWidth + delta)) };
                    return next;
                  });
                }}
                onResizeEnd={() => persistLayout(layoutRef.current)}
                onReset={() => {
                  setLayout(prev => ({ ...prev, projectWidth: DEFAULT_LAYOUT.projectWidth }));
                  persistLayout({ ...layoutRef.current, projectWidth: DEFAULT_LAYOUT.projectWidth });
                }}
              />
            </>
          )}

          {/* ── Panel 2: Objects Panel ───────────────────────────── */}
          {isObjectsOpen && (
            <>
              <WaveformObjectsPanel
                width={layout.objectsWidth}
                activeScope={activeScope}
                currentTime={currentTime}
                waveSignalNames={waveSignalNames}
                isCompiled={compileStatus === 'success' && Boolean(simulationData && simulationData.maxTime > 0)}
                hasSimulationData={Boolean(simulationData)}
                onAddSignals={(names) => setWaveSignalNames(prev => Array.from(new Set([...prev, ...names])))}
                onClose={() => setIsObjectsOpen(false)}
              />

              {/* Boundary 2: Objects ↔ Right Area */}
              <ResizableDivider
                orientation="vertical"
                data-testid="splitter-wf-objects"
                aria-label="Resize Objects Panel"
                className="z-30"
                valueNow={layout.objectsWidth}
                valueMin={160}
                valueMax={420}
                onResize={(delta) => {
                  setLayout(prev => {
                    const next = { ...prev, objectsWidth: Math.max(160, Math.min(420, prev.objectsWidth + delta)) };
                    return next;
                  });
                }}
                onResizeEnd={() => persistLayout(layoutRef.current)}
                onReset={() => {
                  setLayout(prev => ({ ...prev, objectsWidth: DEFAULT_LAYOUT.objectsWidth }));
                  persistLayout({ ...layoutRef.current, objectsWidth: DEFAULT_LAYOUT.objectsWidth });
                }}
              />
            </>
          )}

          {/* ── Center Right Area: Editor + Waveform ─────────────── */}
          <div ref={rightAreaRef} className="flex-1 flex flex-col min-w-0 bg-[#070c18] relative overflow-hidden isolate">
            
            {/* ── Top Section: HDL Code Editor ───────────────────── */}
            {isEditorOpen && (
              <>
                <div
                  data-testid="wf-editor-container"
                  className="flex flex-col min-h-[120px] bg-[#0c1322] border-b border-[#1e293b]"
                  style={{
                    height: rightAreaRef.current
                      ? Math.round(rightAreaRef.current.clientHeight * layout.editorRatio)
                      : '35%',
                  }}
                >
                  {/* Editor Tab Bar */}
                  <div className="h-8 bg-[#090f1d] border-b border-[#1e293b] flex items-center justify-between px-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        data-testid="wf-editor-tab-source"
                        onClick={() => setActiveEditorSlot('source')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-colors ${
                          activeEditorSlot === 'source'
                            ? 'bg-[#1e293b] text-blue-300 font-semibold border-b-2 border-blue-500'
                            : 'text-slate-400 hover:bg-[#111c33] hover:text-slate-200'
                        }`}
                      >
                        <span>{sourceFile ? sourceFile.name : 'source (empty)'}</span>
                      </button>

                      <button
                        data-testid="wf-editor-tab-tb"
                        onClick={() => setActiveEditorSlot('testbench')}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-colors ${
                          activeEditorSlot === 'testbench'
                            ? 'bg-[#1e293b] text-amber-300 font-semibold border-b-2 border-amber-500'
                            : 'text-slate-400 hover:bg-[#111c33] hover:text-slate-200'
                        }`}
                      >
                        <span>{testbenchFile ? testbenchFile.name : 'testbench (empty)'}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsEditorOpen(false)}
                      title="Collapse Editor (Alt+E)"
                      className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors text-xs"
                    >
                      Hide Editor
                    </button>
                  </div>

                  {/* Monaco or Empty Slot View */}
                  <div className="flex-1 min-h-0 relative">
                    {activeEditorFile ? (
                      <MonacoEditor
                        height="100%"
                        language={activeEditorFile.name.endsWith('.v') ? 'verilog' : 'systemverilog'}
                        theme="vs-dark"
                        value={activeEditorFile.content}
                        onChange={(val) => {
                          const updated = val ?? '';
                          if (activeEditorSlot === 'source') {
                            if (sourceFile?.content !== updated) {
                              markWorkspaceDirty('waveform');
                              clearSimulationState();
                              setCompileStatus('idle');
                              editSourceContent(updated);
                            }
                          } else {
                            if (testbenchFile?.content !== updated) {
                              markWorkspaceDirty('waveform');
                              clearSimulationState();
                              setCompileStatus('idle');
                              editTestbenchContent(updated);
                            }
                          }
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
                          automaticLayout: true,
                          padding: { top: 8 },
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#0a1120]">
                        <div className="text-slate-400 text-sm font-medium mb-1">
                          No {activeEditorSlot === 'source' ? 'Source Module' : 'Testbench'} Loaded
                        </div>
                        <div className="text-slate-500 text-xs font-mono max-w-sm mb-4">
                          {activeEditorSlot === 'source'
                            ? 'Import your Verilog / SystemVerilog DUT design module to begin simulation.'
                            : 'Import your Verilog / SystemVerilog testbench ($dumpfile / $dumpvars) to drive simulation.'}
                        </div>
                        <button
                          onClick={() => activeEditorSlot === 'source' ? sourceInputRef.current?.click() : tbInputRef.current?.click()}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                        >
                          Import {activeEditorSlot === 'source' ? 'Source File' : 'Testbench File'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Boundary 3: Editor ↔ Waveform */}
                <ResizableDivider
                  orientation="horizontal"
                  data-testid="splitter-wf-editor-wave"
                  aria-label="Resize Editor vs Waveform"
                  valueNow={layout.editorRatio}
                  valueMin={0.18}
                  valueMax={0.72}
                  onResize={(_, currentPos, stepMultiplier) => {
                    if (stepMultiplier !== undefined) {
                      setLayout(prev => ({
                        ...prev,
                        editorRatio: Math.max(0.18, Math.min(0.72, prev.editorRatio + stepMultiplier)),
                      }));
                      return;
                    }
                    if (rightAreaRef.current) {
                      const rect = rightAreaRef.current.getBoundingClientRect();
                      const relativeY = currentPos.clientY - rect.top;
                      const newRatio = Math.max(0.18, Math.min(0.72, relativeY / rect.height));
                      setLayout(prev => ({ ...prev, editorRatio: newRatio }));
                    }
                  }}
                  onResizeEnd={() => persistLayout(layoutRef.current)}
                  onReset={() => {
                    setLayout(prev => ({ ...prev, editorRatio: DEFAULT_LAYOUT.editorRatio }));
                    persistLayout({ ...layoutRef.current, editorRatio: DEFAULT_LAYOUT.editorRatio });
                  }}
                />
              </>
            )}

            {/* ── Bottom Section: Waveform Workspace ─────────────── */}
            <div className="flex-1 flex min-h-0 bg-black overflow-hidden relative">
              {/* Left Column: Signal Names Panel */}
              <SignalNamePanel
                width={layout.signalColumnWidth}
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

              {/* Boundary 4: Signal Names ↔ Timeline Canvas */}
              <ResizableDivider
                orientation="vertical"
                data-testid="splitter-wf-signal-col"
                aria-label="Resize Signal Name Column"
                valueNow={layout.signalColumnWidth}
                valueMin={160}
                valueMax={480}
                onResize={(delta) => {
                  setLayout(prev => {
                    const next = { ...prev, signalColumnWidth: Math.max(160, Math.min(480, prev.signalColumnWidth + delta)) };
                    return next;
                  });
                }}
                onResizeEnd={() => persistLayout(layoutRef.current)}
                onReset={() => {
                  setLayout(prev => ({ ...prev, signalColumnWidth: DEFAULT_LAYOUT.signalColumnWidth }));
                  persistLayout({ ...layoutRef.current, signalColumnWidth: DEFAULT_LAYOUT.signalColumnWidth });
                }}
              />

              {/* Right Column: Waveform Canvas */}
              <WaveformCanvas
                containerRef={waveformCanvasContainerRef}
                simulationData={simulationData}
                compileStatus={compileStatus}
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
                onAddMarker={(mk) => setMarkers(prev => [...prev, mk])}
                onRemoveMarker={(id) => setMarkers(prev => prev.filter(m => m.id !== id))}
              />
            </div>

          </div>
        </div>

        {/* ── Bottom Panel: Console & Problems ────────────────────── */}
        {isConsoleOpen && (
          <>
            {/* Boundary 5: Workspace ↔ Console */}
            <ResizableDivider
              orientation="horizontal"
              data-testid="splitter-wf-console"
              aria-label="Resize Console Panel"
              valueNow={layout.consoleHeight}
              valueMin={80}
              valueMax={400}
              onResize={(delta) => {
                setLayout(prev => {
                  const next = { ...prev, consoleHeight: Math.max(80, Math.min(400, prev.consoleHeight - delta)) };
                  return next;
                });
              }}
              onResizeEnd={() => persistLayout(layoutRef.current)}
              onReset={() => {
                setLayout(prev => ({ ...prev, consoleHeight: DEFAULT_LAYOUT.consoleHeight }));
                persistLayout({ ...layoutRef.current, consoleHeight: DEFAULT_LAYOUT.consoleHeight });
              }}
            />

            <WaveformConsole
              height={layout.consoleHeight}
              logs={consoleLogs}
              isCompiling={isCompiling}
              onClearLogs={() => setConsoleLogs([])}
              onClose={() => setIsConsoleOpen(false)}
            />
          </>
        )}
      </div>

      {/* ── Context Menu (Portal/Absolute) ────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#0f172a] border border-[#334155] shadow-2xl py-1 rounded w-36 text-slate-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.type === 'radix' && (
            <>
              <div className="px-3 py-1 text-[10px] text-slate-400 border-b border-[#1e293b] mb-1 font-bold">
                RADIX
              </div>
              <button
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white transition-colors"
                onClick={() => {
                  setRadixes(prev => ({ ...prev, [contextMenu.signalName]: 'hex' }));
                  setContextMenu(null);
                }}
              >
                Hexadecimal
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white transition-colors"
                onClick={() => {
                  setRadixes(prev => ({ ...prev, [contextMenu.signalName]: 'dec' }));
                  setContextMenu(null);
                }}
              >
                Decimal
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white transition-colors"
                onClick={() => {
                  setRadixes(prev => ({ ...prev, [contextMenu.signalName]: 'bin' }));
                  setContextMenu(null);
                }}
              >
                Binary
              </button>
            </>
          )}

          {contextMenu.type === 'remove' && (
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/40 hover:text-red-200 transition-colors"
              onClick={() => {
                setWaveSignalNames(prev => prev.filter(n => n !== contextMenu.signalName));
                setContextMenu(null);
              }}
            >
              Remove from Wave
            </button>
          )}
        </div>
      )}
    </div>
  );
}
