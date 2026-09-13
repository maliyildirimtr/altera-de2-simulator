// ============================================================
// WaveformSimulator.tsx — Modern Waveform Simulation Workspace
//
// Phase 12.2D: Waveform Workspace UX & Multi-File HDL Project Support
// - Multi-file source architecture (sourceFiles[] + stable activeSourceId)
// - Real project structure with independent add/remove and conflict handling
// - Primary view switcher: [Waveform] [Code Editor] [Split]
// - Objects & Console closed by default on fresh workspace
// - Resizable dividers with strict min/max limits & no clipping
// - Monaco mounted offscreen when hidden to preserve state & layout
// ============================================================

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Plus, X } from 'lucide-react';

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
  editorRatio: number;       // ratio of right area height in split mode, default 0.35
  signalColumnWidth: number; // px, default 240
  consoleHeight: number;     // px, default 160
  mainView: 'waveform' | 'editor' | 'split';
}

const DEFAULT_LAYOUT: WaveformLayout = {
  projectWidth: 220,
  objectsWidth: 240,
  editorRatio: 0.35,
  signalColumnWidth: 240,
  consoleHeight: 160,
  mainView: 'waveform',
};

function loadSavedLayout(): WaveformLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      projectWidth: typeof parsed.projectWidth === 'number' ? Math.max(180, Math.min(360, parsed.projectWidth)) : DEFAULT_LAYOUT.projectWidth,
      objectsWidth: typeof parsed.objectsWidth === 'number' ? Math.max(200, Math.min(420, parsed.objectsWidth)) : DEFAULT_LAYOUT.objectsWidth,
      editorRatio: typeof parsed.editorRatio === 'number' ? Math.max(0.18, Math.min(0.72, parsed.editorRatio)) : DEFAULT_LAYOUT.editorRatio,
      signalColumnWidth: typeof parsed.signalColumnWidth === 'number' ? Math.max(160, Math.min(380, parsed.signalColumnWidth)) : DEFAULT_LAYOUT.signalColumnWidth,
      consoleHeight: typeof parsed.consoleHeight === 'number' ? Math.max(100, Math.min(380, parsed.consoleHeight)) : DEFAULT_LAYOUT.consoleHeight,
      mainView: (parsed.mainView === 'editor' || parsed.mainView === 'split' || parsed.mainView === 'waveform')
        ? parsed.mainView
        : 'waveform',
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export default function WaveformSimulator({ isDarkMode = true }: { isDarkMode?: boolean }) {
  // ── Layout State ──────────────────────────────────────────
  const [layout, setLayout] = useState<WaveformLayout>(loadSavedLayout);
  const layoutRef = useRef<WaveformLayout>(layout);
  layoutRef.current = layout;

  const mainView = layout.mainView;

  // Save layout only on drag end / resize end
  const persistLayout = useCallback((updated: WaveformLayout) => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  }, []);

  const handleMainViewChange = useCallback((view: 'waveform' | 'editor' | 'split') => {
    setLayout(prev => {
      const next = { ...prev, mainView: view };
      persistLayout(next);
      return next;
    });
  }, [persistLayout]);

  const handleResetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    persistLayout(DEFAULT_LAYOUT);
    setIsProjectOpen(true);
    setIsObjectsOpen(false);
    setIsConsoleOpen(false);
  }, [persistLayout]);

  // Panel Collapsed States (Objects & Console closed by default on fresh workspace, Project auto-collapsed on mobile)
  const [isProjectOpen, setIsProjectOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [isObjectsOpen, setIsObjectsOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const userDismissedObjectsRef = useRef(false);

  // Center right area ref to measure height for editorRatio
  const rightAreaRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<any>(null);

  // Trigger Monaco layout when switched to editor or split
  useEffect(() => {
    if (mainView === 'editor' || mainView === 'split') {
      const timer = setTimeout(() => {
        monacoEditorRef.current?.layout();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mainView, layout.editorRatio]);

  // ── Multi-File Project State ──────────────────────────────
  const [sourceFiles, setSourceFiles] = useState<ProjectSlotFile[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [testbenchFile, setTestbenchFile] = useState<ProjectSlotFile | null>(null);
  const [vcdFile, setVcdFile] = useState<ProjectSlotFile | null>(null);
  const [activeEditorRole, setActiveEditorRole] = useState<'source' | 'testbench'>('source');

  const activeSourceFile = sourceFiles.find(f => f.id === activeSourceId) || sourceFiles[0] || null;
  const activeEditorFile = activeEditorRole === 'source' ? activeSourceFile : testbenchFile;

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

  const editSourceContent = useCallback((id: string, content: string) => {
    setSourceFiles(prev => prev.map(f => f.id === id ? { ...f, content } : f));
  }, []);

  const editTestbenchContent = useCallback((content: string) => {
    setTestbenchFile(prev => prev ? { ...prev, content } : null);
  }, []);

  // ── Context Menus ─────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; signalName: string; type: 'radix' | 'remove';
  } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Consume incoming example handoff (Phase 6 / Phase 9)
  useEffect(() => {
    const handoff = consumePendingHandoff('waveform');
    if (handoff) {
      const ex = getExampleById(handoff.exampleId);
      if (ex) {
        const initialSrc: ProjectSlotFile = {
          id: `src_${Date.now()}`,
          name: ex.source.filename,
          type: 'sv',
          content: ex.source.code,
        };
        const initialTb: ProjectSlotFile | null = ex.testbench ? {
          id: `tb_${Date.now()}`,
          name: ex.testbench.filename,
          type: 'sv',
          content: ex.testbench.code,
        } : null;

        setSourceFiles([initialSrc]);
        setActiveSourceId(initialSrc.id);
        setTestbenchFile(initialTb);
        setVcdFile(null);
        setActiveEditorRole('source');
        clearSimulationState();
        setConsoleLogs(prev => [
          ...prev,
          `[EDA Studio] Loaded example: ${ex.title} (${ex.source.filename})`,
        ]);
        markWorkspaceOrigin('waveform', 'example');
      }
    }
  }, [clearSimulationState]);

  // ── File Handlers (Multi-File Sources & TB) ─────────────────
  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      return ext === '.v' || ext === '.sv' || ext === '.txt';
    });
    if (validFiles.length === 0) return;

    const readFiles = await Promise.all(
      validFiles.map(file => new Promise<{ name: string; content: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve({
          name: file.name,
          content: (ev.target?.result as string) || ''
        });
        reader.readAsText(file);
      }))
    );

    setSourceFiles(prev => {
      const existingNames = new Set(prev.map(p => p.name));
      const newSlots: ProjectSlotFile[] = [];
      const collisionLogs: string[] = [];

      readFiles.forEach(rf => {
        let targetName = rf.name;
        if (existingNames.has(targetName)) {
          const dotIdx = targetName.lastIndexOf('.');
          const base = dotIdx !== -1 ? targetName.slice(0, dotIdx) : targetName;
          const ext = dotIdx !== -1 ? targetName.slice(dotIdx) : '';
          let counter = 1;
          while (existingNames.has(`${base}_${counter}${ext}`)) counter++;
          const uniqueName = `${base}_${counter}${ext}`;
          collisionLogs.push(`[Project] Filename collision for '${targetName}': saved as '${uniqueName}'.`);
          targetName = uniqueName;
        }
        existingNames.add(targetName);

        const slotFile: ProjectSlotFile = {
          id: `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: targetName,
          type: targetName.split('.').pop() || 'sv',
          content: rf.content,
        };
        newSlots.push(slotFile);
      });

      if (collisionLogs.length > 0) {
        setConsoleLogs(cl => [...cl, ...collisionLogs]);
      }

      if (newSlots.length > 0) {
        setActiveSourceId(newSlots[newSlots.length - 1].id);
        setActiveEditorRole('source');
      }

      return [...prev, ...newSlots];
    });

    markWorkspaceDirty('waveform');
    markWorkspaceUser('waveform');
    clearSimulationState();
    handleMainViewChange('editor');
    setConsoleLogs(cl => [
      ...cl,
      `[Project] Loaded ${validFiles.length} source file(s).`,
    ]);
    e.target.value = '';
  };

  const handleTbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      setTestbenchFile({
        id: `tb_${Date.now()}`,
        name: file.name,
        type: file.name.split('.').pop() || 'sv',
        content,
      });
      markWorkspaceDirty('waveform');
      markWorkspaceUser('waveform');
      setActiveEditorRole('testbench');
      clearSimulationState();
      handleMainViewChange('editor');
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
      setVcdFile({
        id: `vcd_${Date.now()}`,
        name: file.name,
        type: 'vcd',
        content,
      });
      clearSimulationState();
      setConsoleLogs(prev => [...prev, `[Project] Loaded VCD directly: ${file.name}`]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGeneralUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const readFiles = await Promise.all(
      fileList.map(file => new Promise<{ name: string; content: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve({
          name: file.name,
          content: (ev.target?.result as string) || ''
        });
        reader.readAsText(file);
      }))
    );

    const newSources: { name: string; content: string }[] = [];
    let lastTb: { name: string; content: string } | null = null;
    let lastVcd: { name: string; content: string } | null = null;

    readFiles.forEach(rf => {
      const lower = rf.name.toLowerCase();
      if (lower.endsWith('.vcd')) {
        lastVcd = rf;
      } else if (lower.includes('_tb') || lower.includes('tb_') || lower.includes('testbench') || lower.includes('bench')) {
        lastTb = rf;
      } else {
        newSources.push(rf);
      }
    });

    if (lastVcd) {
      setVcdFile({ id: `vcd_${Date.now()}`, name: (lastVcd as any).name, type: 'vcd', content: (lastVcd as any).content });
      clearSimulationState();
      setConsoleLogs(prev => [...prev, `[Project] Loaded VCD: ${(lastVcd as any).name}`]);
    }

    if (lastTb) {
      setTestbenchFile({ id: `tb_${Date.now()}`, name: (lastTb as any).name, type: (lastTb as any).name.split('.').pop() || 'sv', content: (lastTb as any).content });
      markWorkspaceDirty('waveform');
      markWorkspaceUser('waveform');
      setActiveEditorRole('testbench');
      clearSimulationState();
      handleMainViewChange('editor');
      setConsoleLogs(prev => [...prev, `[Project] Assigned to Testbench slot: ${(lastTb as any).name}`]);
    }

    if (newSources.length > 0) {
      setSourceFiles(prev => {
        const existingNames = new Set(prev.map(p => p.name));
        const newSlots: ProjectSlotFile[] = [];

        newSources.forEach(rf => {
          let targetName = rf.name;
          if (existingNames.has(targetName)) {
            const dotIdx = targetName.lastIndexOf('.');
            const base = dotIdx !== -1 ? targetName.slice(0, dotIdx) : targetName;
            const ext = dotIdx !== -1 ? targetName.slice(dotIdx) : '';
            let counter = 1;
            while (existingNames.has(`${base}_${counter}${ext}`)) counter++;
            targetName = `${base}_${counter}${ext}`;
          }
          existingNames.add(targetName);

          const slotFile: ProjectSlotFile = {
            id: `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: targetName,
            type: targetName.split('.').pop() || 'sv',
            content: rf.content,
          };
          newSlots.push(slotFile);
        });

        if (newSlots.length > 0) {
          setActiveSourceId(newSlots[newSlots.length - 1].id);
          setActiveEditorRole('source');
        }
        return [...prev, ...newSlots];
      });

      markWorkspaceDirty('waveform');
      markWorkspaceUser('waveform');
      clearSimulationState();
      handleMainViewChange('editor');
      setConsoleLogs(prev => [...prev, `[Project] Added ${newSources.length} file(s) to Sources.`]);
    }
    e.target.value = '';
  };

  const handleRemoveSource = useCallback((id: string) => {
    setSourceFiles(prev => {
      const file = prev.find(f => f.id === id);
      const remaining = prev.filter(f => f.id !== id);
      if (activeSourceId === id) {
        setActiveSourceId(remaining.length > 0 ? remaining[0].id : null);
      }
      if (file) {
        setConsoleLogs(cl => [...cl, `[Project] Removed source file: ${file.name}`]);
      }
      return remaining;
    });
    markWorkspaceDirty('waveform');
    markWorkspaceUser('waveform');
    clearSimulationState();
  }, [activeSourceId, clearSimulationState]);

  const handleClearSlot = useCallback((slot: 'source' | 'testbench' | 'vcd') => {
    if (slot === 'source') {
      if (activeSourceId) {
        handleRemoveSource(activeSourceId);
      } else if (sourceFiles.length > 0) {
        handleRemoveSource(sourceFiles[0].id);
      }
    } else if (slot === 'testbench') {
      setTestbenchFile(null);
      markWorkspaceDirty('waveform');
      markWorkspaceUser('waveform');
      clearSimulationState();
      setConsoleLogs(prev => [...prev, '[Project] Cleared Testbench slot.']);
    } else {
      setVcdFile(null);
      clearSimulationState();
      setConsoleLogs(prev => [...prev, '[Project] Cleared VCD slot.']);
    }
  }, [activeSourceId, sourceFiles, handleRemoveSource, clearSimulationState]);

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

  // ── Multi-File Compilation ─────────────────────────────────
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
    const currentSources = sourceFiles;
    const currentTb  = testbenchFile;

    // PATH 1: Direct VCD mode
    if (currentVcd) {
      try {
        const data = parseRawVCD(currentVcd.content);
        initSimulationData(data);
        handleMainViewChange('waveform');
        if (!userDismissedObjectsRef.current && data.signals.length > 0) {
          setIsObjectsOpen(true);
        }
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

    // PATH 2: HDL Multi-File Sources & Testbench mode
    const filesToCompile: { name: string; type: string; content: string }[] = [];
    currentSources.forEach(f => filesToCompile.push(f));
    if (currentTb)  filesToCompile.push(currentTb);

    if (filesToCompile.length === 0) {
      simulationDataRef.current = null;
      setSimulationData(null);
      setCompileStatus('error');
      setWaveSignalNames([]);
      setCursorB(null);
      setMarkers([]);
      setIsConsoleOpen(true);
      setConsoleLogs(prev => [
        ...prev,
        '[HATA] No HDL files to compile. Please import a Source or Testbench file first.',
      ]);
      setIsCompiling(false);
      return;
    }

    // Testbench file is top-level if present, otherwise active source
    const activeName = currentTb
      ? currentTb.name
      : (activeSourceFile ? activeSourceFile.name : filesToCompile[0].name);

    const result = await simulateSystemVerilog(filesToCompile, activeName);

    if (result.logs && result.logs.length > 0) {
      setConsoleLogs(prev => [...prev, ...result.logs]);
    }

    if (result.status === 'ok' && result.simulationData) {
      const data = result.simulationData as SimulationData;
      data.logs = [...result.logs, ...(data.logs ?? [])];
      initSimulationData(data);
      handleMainViewChange('waveform');
      if (!userDismissedObjectsRef.current && data.signals.length > 0) {
        setIsObjectsOpen(true);
      }
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

    const targetZoom = Math.max(0.0001, Math.min(20, (availableWidth * 0.98) / neededWidth));
    zoomLevelRef.current = targetZoom;
    setZoomLevel(targetZoom);
    container.scrollLeft = 0;
  }, [simulationData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (simulationDataRef.current && simulationDataRef.current.maxTime > 0) {
        handleZoomFit();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [isProjectOpen, isObjectsOpen, isConsoleOpen, mainView, handleZoomFit]);

  // ── Global Keyboard Shortcuts ─────────────────────────────
  const compileSimulationRef = useRef(compileSimulation);
  useEffect(() => {
    compileSimulationRef.current = compileSimulation;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          setIsObjectsOpen(prev => {
            if (prev) userDismissedObjectsRef.current = true;
            return !prev;
          });
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          handleMainViewChange('editor');
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
  }, [handleMainViewChange, handleZoomFit]);

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

  return (
    <div
      data-testid="waveform-workspace"
      data-compile-status={compileStatus}
      data-main-view={mainView}
      data-sources-count={sourceFiles.length}
      data-active-source-id={activeSourceId ?? ''}
      data-active-role={activeEditorRole}
      className="flex flex-col h-full w-full bg-[#0a1120] text-slate-200 font-sans overflow-hidden select-none"
    >
      {/* ── Hidden File Inputs ──────────────────────────────────── */}
      <input
        type="file"
        data-testid="wf-input-source"
        ref={sourceInputRef}
        onChange={handleSourceUpload}
        multiple
        className="hidden"
        accept=".v,.sv"
      />
      <input
        type="file"
        data-testid="wf-input-tb"
        ref={tbInputRef}
        onChange={handleTbUpload}
        className="hidden"
        accept=".v,.sv"
      />
      <input
        type="file"
        data-testid="wf-input-vcd"
        ref={vcdInputRef}
        onChange={handleVcdUpload}
        className="hidden"
        accept=".vcd"
      />
      <input
        type="file"
        data-testid="wf-input-general"
        ref={generalInputRef}
        onChange={handleGeneralUpload}
        multiple
        className="hidden"
        accept=".v,.sv,.vcd"
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
        consoleOpen={isConsoleOpen}
        mainView={mainView}
        onChangeMainView={handleMainViewChange}
        onToggleProjectPanel={() => setIsProjectOpen(prev => !prev)}
        onToggleObjectsPanel={() => {
          setIsObjectsOpen(prev => {
            if (prev && simulationData) userDismissedObjectsRef.current = true;
            return !prev;
          });
        }}
        onToggleEditor={() => handleMainViewChange(mainView === 'editor' ? 'waveform' : 'editor')}
        onToggleConsole={() => setIsConsoleOpen(prev => !prev)}
        onResetLayout={handleResetLayout}
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
                sourceFiles={sourceFiles}
                testbenchFile={testbenchFile}
                vcdFile={vcdFile}
                activeSourceId={activeSourceId}
                activeEditorSlot={activeEditorRole}
                onSelectSourceFile={(id) => {
                  setActiveSourceId(id);
                  setActiveEditorRole('source');
                  handleMainViewChange('editor');
                }}
                onSelectSlot={(slot) => {
                  setActiveEditorRole(slot);
                  handleMainViewChange('editor');
                }}
                onImportSource={() => sourceInputRef.current?.click()}
                onImportTestbench={() => tbInputRef.current?.click()}
                onImportVcd={() => vcdInputRef.current?.click()}
                onRemoveSourceFile={handleRemoveSource}
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
                valueMin={180}
                valueMax={360}
                onResize={(delta) => {
                  setLayout(prev => {
                    const next = { ...prev, projectWidth: Math.max(180, Math.min(360, prev.projectWidth + delta)) };
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
                onClose={() => {
                  userDismissedObjectsRef.current = true;
                  setIsObjectsOpen(false);
                }}
              />

              {/* Boundary 2: Objects ↔ Right Area */}
              <ResizableDivider
                orientation="vertical"
                data-testid="splitter-wf-objects"
                aria-label="Resize Objects Panel"
                className="z-30"
                valueNow={layout.objectsWidth}
                valueMin={200}
                valueMax={420}
                onResize={(delta) => {
                  setLayout(prev => {
                    const next = { ...prev, objectsWidth: Math.max(200, Math.min(420, prev.objectsWidth + delta)) };
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

          {/* ── Center Right Area: Editor / Waveform / Split ─────── */}
          <div ref={rightAreaRef} className="flex-1 flex flex-col min-w-0 bg-[#070c18] relative overflow-hidden isolate">
            
            {/* ── Code Editor Surface (Mounted Offscreen when in Waveform mode to guarantee zero layout glitch and test access) ── */}
            <div
              data-testid="wf-editor-container"
              style={mainView === 'waveform' ? {
                position: 'absolute',
                top: -9999,
                left: -9999,
                width: 800,
                height: 600,
                visibility: 'hidden',
                pointerEvents: 'none',
              } : mainView === 'editor' ? {
                flex: 1,
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 0,
              } : {
                height: rightAreaRef.current
                  ? Math.round(rightAreaRef.current.clientHeight * layout.editorRatio)
                  : '35%',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 0,
              }}
              className="bg-[#0c1322] border-b border-[#1e293b]"
            >
              {/* Editor Multi-File Tab Bar */}
              <div className="h-9 bg-[#090f1d] border-b border-[#1e293b] flex items-center justify-between px-2 shrink-0 gap-2 overflow-x-auto min-w-0">
                <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
                  {/* Source Files Tabs */}
                  {sourceFiles.map((file, idx) => {
                    const isActive = activeEditorRole === 'source' && (
                      activeSourceId ? file.id === activeSourceId : idx === 0
                    );
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          setActiveSourceId(file.id);
                          setActiveEditorRole('source');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-colors group cursor-pointer shrink-0 border ${
                          isActive
                            ? 'bg-[#1e293b] text-blue-300 font-semibold border-blue-500/80 shadow-sm'
                            : 'text-slate-400 hover:bg-[#111c33] hover:text-slate-200 border-transparent'
                        }`}
                        title={file.name}
                        data-editor-tab="source"
                        data-filename={file.name}
                        data-testid={isActive ? "wf-editor-tab-source" : `wf-editor-tab-source-${file.name}`}
                      >
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        {sourceFiles.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSource(file.id);
                            }}
                            className="text-slate-500 hover:text-red-400 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                            title={`Close ${file.name}`}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Quick Add Source Button in Tab Strip */}
                  <button
                    onClick={() => sourceInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 rounded border border-dashed border-blue-500/30 transition-colors shrink-0"
                    title="Add or import another source file"
                  >
                    <Plus size={11} />
                    <span>Add Source</span>
                  </button>

                  <div className="w-px h-4 bg-[#1e293b] mx-1 shrink-0" />

                  {/* Testbench Tab */}
                  <button
                    data-testid="wf-editor-tab-tb"
                    data-editor-tab="testbench"
                    data-filename={testbenchFile ? testbenchFile.name : 'testbench'}
                    onClick={() => setActiveEditorRole('testbench')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded transition-colors shrink-0 border ${
                      activeEditorRole === 'testbench'
                        ? 'bg-[#1e293b] text-amber-300 font-semibold border-amber-500/80 shadow-sm'
                        : 'text-slate-400 hover:bg-[#111c33] hover:text-slate-200 border-transparent'
                    }`}
                    title={testbenchFile ? testbenchFile.name : 'Testbench'}
                  >
                    <span className="truncate max-w-[150px]">{testbenchFile ? testbenchFile.name : 'testbench (empty)'}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 uppercase tracking-wider font-sans font-semibold">
                      testbench
                    </span>
                  </button>
                </div>

                {mainView === 'split' && (
                  <button
                    onClick={() => handleMainViewChange('waveform')}
                    title="Maximize Waveform"
                    className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors text-xs shrink-0"
                  >
                    Hide Editor
                  </button>
                )}
              </div>

              {/* Monaco or Deliberate Empty Slot View */}
              <div className="flex-1 min-h-0 relative">
                {activeEditorFile ? (
                  <MonacoEditor
                    height="100%"
                    language={activeEditorFile.name.endsWith('.v') ? 'verilog' : 'systemverilog'}
                    theme={isDarkMode ? 'vs-dark' : 'vs-light'}
                    value={activeEditorFile.content}
                    onMount={(editor) => {
                      monacoEditorRef.current = editor;
                    }}
                    onChange={(val) => {
                      const updated = val ?? '';
                      if (activeEditorRole === 'source') {
                        if (activeSourceFile && activeSourceFile.content !== updated) {
                          markWorkspaceDirty('waveform');
                          markWorkspaceUser('waveform');
                          clearSimulationState();
                          setCompileStatus('idle');
                          editSourceContent(activeSourceFile.id, updated);
                        }
                      } else {
                        if (testbenchFile && testbenchFile.content !== updated) {
                          markWorkspaceDirty('waveform');
                          markWorkspaceUser('waveform');
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
                    <div className="text-slate-300 text-sm font-semibold mb-1">
                      No {activeEditorRole === 'source' ? 'Source Module' : 'Testbench'} Selected
                    </div>
                    <div className="text-slate-500 text-xs font-mono max-w-sm mb-4 leading-relaxed">
                      {activeEditorRole === 'source'
                        ? 'Import or add your Verilog / SystemVerilog design source files (.v, .sv).'
                        : 'Import your Verilog / SystemVerilog testbench ($dumpfile / $dumpvars) to drive simulation.'}
                    </div>
                    <button
                      data-testid="wf-empty-editor-import-btn"
                      onClick={() => activeEditorRole === 'source' ? sourceInputRef.current?.click() : tbInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
                    >
                      Import {activeEditorRole === 'source' ? 'Source File' : 'Testbench File'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Split divider only when in Split view */}
            {mainView === 'split' && (
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
            )}

            {/* ── Waveform Workspace Viewport (Active in Waveform and Split modes) ── */}
            {(mainView === 'waveform' || mainView === 'split') && (
              <div className="flex-1 flex min-h-0 bg-black overflow-hidden relative min-w-0">
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
                  valueMax={380}
                  onResize={(delta) => {
                    setLayout(prev => {
                      const next = { ...prev, signalColumnWidth: Math.max(160, Math.min(380, prev.signalColumnWidth + delta)) };
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
            )}

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
              valueMin={100}
              valueMax={380}
              onResize={(delta) => {
                setLayout(prev => {
                  const next = { ...prev, consoleHeight: Math.max(100, Math.min(380, prev.consoleHeight - delta)) };
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
