import React, { useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { markWorkspaceDirty } from '../../services/exampleHandoff';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  Activity,
  Cpu,
  Play,
  Pause,
} from 'lucide-react';

const VIRTUAL_BOARD_OPTIONS = [
  'Unmapped',
  'CLOCK_50',
  ...Array.from({ length: 18 }, (_, i) => `SW[${i}]`),
  ...Array.from({ length: 18 }, (_, i) => `LEDR[${i}]`),
  ...Array.from({ length: 9 }, (_, i) => `LEDG[${i}]`),
  ...Array.from({ length: 4 }, (_, i) => `KEY[${i}]`),
  ...Array.from({ length: 8 }, (_, i) => [
    `HEX${i}[0]`, `HEX${i}[1]`, `HEX${i}[2]`, `HEX${i}[3]`,
    `HEX${i}[4]`, `HEX${i}[5]`, `HEX${i}[6]`
  ]).flat(),
];

// Human-friendly board component descriptions
function getComponentLabel(vc: string | null): string {
  if (!vc || vc === 'Unmapped') return 'Unmapped';
  if (vc === 'CLOCK_50') return '50MHz Clock';
  const m = vc.match(/(SW|KEY|LEDR|LEDG|HEX\d)\[?(\d+)?\]?/);
  if (!m) return vc;
  const type = m[1];
  const idx = m[2] ?? '';
  if (type === 'SW') return `Switch ${idx}`;
  if (type === 'KEY') return `Key ${idx}`;
  if (type === 'LEDR') return `Red LED ${idx}`;
  if (type === 'LEDG') return `Green LED ${idx}`;
  if (type.startsWith('HEX')) return `HEX ${type.replace('HEX', '')} Seg ${idx}`;
  return vc;
}

import { ResizableDivider } from './ResizableDivider';

interface InspectorPanelProps {
  isOpen: boolean;
  width?: number;
  pinMappingHeight?: number;
  onPinMappingResize?: (delta: number) => void;
  onPinMappingReset?: () => void;
  onPinMappingResizeEnd?: () => void;
  onToggle: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  isOpen,
  width,
  pinMappingHeight,
  onPinMappingResize,
  onPinMappingReset,
  onPinMappingResizeEnd,
  onToggle,
}) => {
  const {
    pinMappings,
    setPinMappings,
    clockState,
    engine,
    compileState,
    tickClock,
    isSimRunning,
    simFrequency,
    startAutoSimulation,
    stopAutoSimulation,
    setSimFrequency,
    resetBoard,
    switches,
    keys,
    ledR,
    ledG,
  } = useBoardStore();

  const canSimulate = compileState === 'ready' && !!engine;

  const [copiedQsf, setCopiedQsf] = useState(false);
  const [copiedQsfText, setCopiedQsfText] = useState('');
  const [openSections, setOpenSections] = useState({
    pins: true,
    clock: true,
    reset: false,
    io: true,
  });

  if (!isOpen) return null;

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyQsf = () => {
    const qsfText = pinMappings
      .filter(p => p.portName && p.physicalPin)
      .map(p => `set_location_assignment ${p.physicalPin} -to ${p.portName}`)
      .join('\n');
    try {
      navigator.clipboard?.writeText?.(qsfText);
    } catch (_) {}
    setCopiedQsfText(qsfText);
    setCopiedQsf(true);
    setTimeout(() => setCopiedQsf(false), 2000);
  };

  const updatePin = (index: number, field: string, value: string) => {
    const updated = [...pinMappings];
    updated[index] = { ...updated[index], [field]: value };
    setPinMappings(updated);
    markWorkspaceDirty('de2');
  };

  const addPin = () => {
    setPinMappings([...pinMappings, { portName: '', physicalPin: '', virtualComponent: '' }]);
    markWorkspaceDirty('de2');
  };

  const deletePin = (index: number) => {
    const updated = [...pinMappings];
    updated.splice(index, 1);
    setPinMappings(updated);
    markWorkspaceDirty('de2');
  };

  // Active inputs / outputs counts for live IO summary
  const activeSwitches = switches
    .map((v, i) => (v === 1 ? `SW${i}` : null))
    .filter(Boolean);
  const pressedKeys = keys
    .map((v, i) => (v === 0 ? `KEY${i}` : null))
    .filter(Boolean);
  const activeLedR = ledR
    .map((v, i) => (v === 1 ? `R${i}` : null))
    .filter(Boolean);
  const activeLedG = ledG
    .map((v, i) => (v === 1 ? `G${i}` : null))
    .filter(Boolean);

  return (
    <aside
      data-testid="inspector-panel"
      style={{
        width: width ?? 300,
        backgroundColor: 'var(--bg-panel)',
        color: 'var(--text-primary)',
      }}
      className="border-l border-[var(--border-subtle)] flex flex-col shrink-0 select-none z-10 overflow-hidden"
      aria-label="Inspector Panel"
    >
      {/* Header */}
      <div
        className="h-[36px] px-3 flex items-center justify-between border-b border-[var(--border-subtle)] shrink-0"
        style={{ backgroundColor: 'var(--bg-panel-header)' }}
      >
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-[var(--accent-primary)]" />
          <span
            className="text-[11px] font-bold uppercase tracking-wider select-none"
            style={{ color: 'var(--text-muted)' }}
          >
            Inspector
          </span>
        </div>
        <button
          onClick={onToggle}
          className="w-6 h-6 rounded-[4px] flex items-center justify-center transition-colors border border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
          title="Collapse Inspector"
          aria-label="Collapse Inspector"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">

        {/* 1. PIN MAPPING SECTION */}
        <div data-testid="inspector-pins-section">
          <button
            onClick={() => toggleSection('pins')}
            className="w-full h-[36px] px-3 flex items-center justify-between text-xs font-semibold transition-colors hover:bg-[var(--bg-hover)] select-none border-b border-[var(--border-subtle)]"
            style={{ backgroundColor: 'var(--bg-panel-header)', color: 'var(--text-primary)' }}
          >
            <span className="flex items-center gap-1.5">
              <span>Pin Mapping</span>
              <span
                className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded border"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {pinMappings.length}
              </span>
            </span>
            {openSections.pins ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.pins && (
            <div className="p-3 space-y-2.5" style={{ backgroundColor: 'var(--bg-panel)' }}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className="text-[10px] uppercase font-bold tracking-wider select-none"
                  style={{ color: 'var(--text-muted)' }}
                >
                  HDL Port → Board
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    data-testid="copy-qsf-btn"
                    data-copied-text={copiedQsfText}
                    onClick={handleCopyQsf}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[4px] border transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: copiedQsf ? 'var(--state-success, #10b981)' : 'var(--text-secondary)',
                    }}
                    title="Copy QSF constraints"
                  >
                    <Copy size={11} />
                    {copiedQsf ? <span>Copied!</span> : 'Copy QSF'}
                  </button>
                  <button
                    data-testid="add-pin-btn"
                    onClick={addPin}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[4px] border transition-colors font-medium"
                    style={{
                      backgroundColor: 'var(--accent-subtle)',
                      borderColor: 'var(--accent-border)',
                      color: 'var(--accent-primary)',
                    }}
                    title="Add new pin mapping"
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>
              </div>

              {/* Pin Mappings Table with dynamic adjustable height */}
              <div
                data-testid="pin-mapping-scroll-area"
                style={{
                  height: pinMappingHeight ?? 220,
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="overflow-y-auto border rounded-[4px]"
              >
                {pinMappings.length > 0 ? (
                  <div className="divide-y divide-[var(--border-subtle)]/70">
                    {pinMappings.map((pin, i) => {
                      const isAssigned = !!pin.virtualComponent && pin.virtualComponent !== 'Unmapped';
                      return (
                        <div
                          key={i}
                          data-testid={`pin-row-${i}`}
                          className="p-2 flex flex-col gap-1.5 text-xs group hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {/* Port name in HDL */}
                            <input
                              data-testid={`pin-port-${i}`}
                              type="text"
                              value={pin.portName}
                              onChange={e => updatePin(i, 'portName', e.target.value)}
                              placeholder="Port (e.g. SW[0])"
                              style={{
                                backgroundColor: 'var(--bg-panel)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--accent-primary)',
                              }}
                              className="flex-1 min-w-0 border rounded-[3px] px-2 py-1 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                            />
                            {/* Physical pin */}
                            <input
                              data-testid={`pin-physical-${i}`}
                              type="text"
                              value={pin.physicalPin || ''}
                              onChange={e => updatePin(i, 'physicalPin', e.target.value)}
                              placeholder="PIN_N25"
                              style={{
                                backgroundColor: 'var(--bg-panel)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-primary)',
                              }}
                              className="w-24 border rounded-[3px] px-2 py-1 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                            />
                            {/* Delete */}
                            <button
                              data-testid={`pin-delete-${i}`}
                              onClick={() => deletePin(i)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-[var(--bg-hover)] transition-colors"
                              title="Delete mapping"
                              aria-label="Delete mapping"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Virtual component target with status indicator */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isAssigned ? 'bg-emerald-500' : 'bg-amber-500/70'
                              }`}
                              title={isAssigned ? 'Assigned' : 'Unmapped'}
                            />
                            <select
                              data-testid={`pin-virtual-${i}`}
                              value={pin.virtualComponent || 'Unmapped'}
                              onChange={e =>
                                updatePin(
                                  i,
                                  'virtualComponent',
                                  e.target.value === 'Unmapped' ? '' : e.target.value
                                )
                              }
                              style={{
                                backgroundColor: 'var(--bg-panel)',
                                borderColor: 'var(--border-subtle)',
                                color: isAssigned ? 'var(--text-primary)' : 'var(--text-muted)',
                              }}
                              className="flex-1 border rounded-[3px] px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                            >
                              {VIRTUAL_BOARD_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>
                                  {opt} ({getComponentLabel(opt)})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="p-4 text-center text-xs italic"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    No pin assignments loaded. Import a .qsf file or add pins above.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Splitter between Pin Mapping and remaining sections */}
        {openSections.pins && (
          <ResizableDivider
            orientation="horizontal"
            data-testid="splitter-pin-mapping"
            aria-label="Resize Pin Mapping Table"
            valueMin={120}
            valueMax={480}
            valueNow={pinMappingHeight ?? 220}
            onResize={(delta) => onPinMappingResize?.(delta)}
            onResizeEnd={onPinMappingResizeEnd}
            onReset={onPinMappingReset}
          />
        )}

        {/* 2. CLOCK & SIMULATION SECTION */}
        <div>
          <button
            onClick={() => toggleSection('clock')}
            className="w-full h-[36px] px-3 flex items-center justify-between text-xs font-semibold transition-colors hover:bg-[var(--bg-hover)] select-none border-b border-[var(--border-subtle)]"
            style={{ backgroundColor: 'var(--bg-panel-header)', color: 'var(--text-primary)' }}
          >
            <span className="flex items-center gap-2">
              <Clock size={13} className="text-[var(--accent-primary)]" />
              <span>Clock &amp; Timing</span>
            </span>
            {openSections.clock ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.clock && (
            <div className="p-3 space-y-3 text-xs" style={{ backgroundColor: 'var(--bg-panel)' }}>
              {/* Clock Status & Single Tick */}
              <div
                data-testid="clock-indicator"
                data-clock={clockState}
                className="flex items-center justify-between rounded-[4px] p-2.5 border"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      clockState === 1 ? 'bg-amber-500' : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-mono text-[var(--text-primary)] text-xs font-medium">
                    CLOCK_50: {clockState}
                  </span>
                </div>
                <button
                  onClick={() => tickClock()}
                  disabled={!canSimulate || isSimRunning}
                  className="px-2.5 py-1 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                  title="Pulse Clock Signal"
                >
                  <Clock size={11} className="text-[var(--text-muted)]" />
                  Step Clock
                </button>
              </div>

              {/* Continuous Auto-Simulation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)] font-medium">Continuous Run</span>
                  <button
                    onClick={() => {
                      if (isSimRunning) stopAutoSimulation();
                      else startAutoSimulation();
                    }}
                    disabled={!canSimulate}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-colors shadow-xs ${
                      isSimRunning
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/25 hover:bg-rose-500/20'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {isSimRunning ? (
                      <>
                        <Pause size={12} /> Running ({simFrequency} Hz)
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Auto Run
                      </>
                    )}
                  </button>
                </div>

                {/* Frequency Slider */}
                <div className="pt-1">
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
                    <span>Frequency</span>
                    <span className="font-mono text-[var(--text-primary)] font-semibold">
                      {simFrequency} Hz
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={simFrequency}
                    onChange={e => setSimFrequency(parseInt(e.target.value, 10))}
                    className="w-full accent-[var(--accent-primary)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. BOARD RESET SECTION */}
        <div>
          <button
            onClick={() => toggleSection('reset')}
            className="w-full h-[36px] px-3 flex items-center justify-between text-xs font-semibold transition-colors hover:bg-[var(--bg-hover)] select-none border-b border-[var(--border-subtle)]"
            style={{ backgroundColor: 'var(--bg-panel-header)', color: 'var(--text-primary)' }}
          >
            <span className="flex items-center gap-2">
              <RotateCcw size={13} className="text-[var(--text-secondary)]" />
              <span>Board Reset</span>
            </span>
            {openSections.reset ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.reset && (
            <div className="p-3 space-y-2.5 text-xs" style={{ backgroundColor: 'var(--bg-panel)' }}>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Resets all switches to 0, push buttons to unpressed (active-low 1), clears LED and HEX outputs, and resets clock.
              </p>
              <button
                onClick={resetBoard}
                className="w-full h-[30px] flex items-center justify-center gap-1.5 px-3 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium transition-colors shadow-xs"
              >
                <RotateCcw size={13} />
                Reset Board State
              </button>
            </div>
          )}
        </div>

        {/* 4. LIVE I/O STATUS SECTION */}
        <div>
          <button
            onClick={() => toggleSection('io')}
            className="w-full h-[36px] px-3 flex items-center justify-between text-xs font-semibold transition-colors hover:bg-[var(--bg-hover)] select-none border-b border-[var(--border-subtle)]"
            style={{ backgroundColor: 'var(--bg-panel-header)', color: 'var(--text-primary)' }}
          >
            <span className="flex items-center gap-2">
              <Activity size={13} className="text-emerald-500" />
              <span>Live I/O Status</span>
            </span>
            {openSections.io ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.io && (
            <div
              data-testid="live-io-status"
              className="p-3 space-y-2.5 text-xs"
              style={{ backgroundColor: 'var(--bg-panel)' }}
            >
              {/* Inputs */}
              <div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1 select-none"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Active Inputs
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeSwitches.length > 0 || pressedKeys.length > 0 ? (
                    <>
                      {activeSwitches.map(sw => (
                        <span
                          key={sw}
                          className="px-1.5 py-0.5 rounded-[3px] bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-primary)] font-mono text-[10px] font-medium"
                        >
                          {sw}=1
                        </span>
                      ))}
                      {pressedKeys.map(k => (
                        <span
                          key={k}
                          className="px-1.5 py-0.5 rounded-[3px] bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-medium"
                        >
                          {k}=0 (pressed)
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="italic text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      All default (SW=0, KEY=1)
                    </span>
                  )}
                </div>
              </div>

              {/* Outputs */}
              <div className="pt-2 border-t border-[var(--border-subtle)]/70">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block mb-1 select-none"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Active Outputs
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeLedR.length > 0 || activeLedG.length > 0 ? (
                    <>
                      {activeLedR.map(led => (
                        <span
                          key={led}
                          className="px-1.5 py-0.5 rounded-[3px] bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-medium"
                        >
                          {led}
                        </span>
                      ))}
                      {activeLedG.map(led => (
                        <span
                          key={led}
                          className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-medium"
                        >
                          {led}
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="italic text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      No active LEDs
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
};
