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
      style={{ width: width ?? 300 }}
      className="bg-[#0d1627] flex flex-col shrink-0 select-none z-10 overflow-hidden"
      aria-label="Inspector Panel"
    >
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#1e293b] bg-[#0a1120]">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-blue-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Inspector
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Collapse Inspector"
          aria-label="Collapse Inspector"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]">

        {/* 1. PIN MAPPING SECTION */}
        <div data-testid="inspector-pins-section">
          <button
            onClick={() => toggleSection('pins')}
            className="w-full h-9 px-3 flex items-center justify-between bg-[#0a1120]/60 hover:bg-[#0a1120] text-slate-300 text-xs font-semibold transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span>Pin Mapping</span>
              <span className="text-[10px] font-mono font-normal text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                {pinMappings.length}
              </span>
            </span>
            {openSections.pins ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.pins && (
            <div className="p-3 bg-[#0d1627] space-y-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  HDL Port → Board
                </span>
                <div className="flex items-center gap-1">
                  <button
                    data-testid="copy-qsf-btn"
                    data-copied-text={copiedQsfText}
                    onClick={handleCopyQsf}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                    title="Copy QSF constraints"
                  >
                    <Copy size={11} />
                    {copiedQsf ? <span className="text-emerald-400">Copied!</span> : 'Copy QSF'}
                  </button>
                  <button
                    data-testid="add-pin-btn"
                    onClick={addPin}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
                    title="Add new pin mapping"
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>
              </div>

              {/* Pin Mappings Table with dynamic adjustable height */}
              <div
                data-testid="pin-mapping-scroll-area"
                style={{ height: pinMappingHeight ?? 220 }}
                className="overflow-y-auto border border-[#1e293b] rounded-md bg-[#080d18]"
              >
                {pinMappings.length > 0 ? (
                  <div className="divide-y divide-[#1e293b]/70">
                    {pinMappings.map((pin, i) => (
                      <div key={i} data-testid={`pin-row-${i}`} className="p-1.5 flex flex-col gap-1 text-xs group hover:bg-white/[0.02]">
                        <div className="flex items-center gap-1.5">
                          {/* Port name in HDL */}
                          <input
                            data-testid={`pin-port-${i}`}
                            type="text"
                            value={pin.portName}
                            onChange={e => updatePin(i, 'portName', e.target.value)}
                            placeholder="Port (e.g. SW[0])"
                            className="flex-1 min-w-0 bg-[#0d1627] border border-[#1e293b] rounded px-1.5 py-0.5 text-xs font-mono text-blue-300 focus:outline-none focus:border-blue-500"
                          />
                          {/* Physical pin */}
                          <input
                            data-testid={`pin-physical-${i}`}
                            type="text"
                            value={pin.physicalPin || ''}
                            onChange={e => updatePin(i, 'physicalPin', e.target.value)}
                            placeholder="PIN_N25"
                            className="w-20 bg-[#0d1627] border border-[#1e293b] rounded px-1.5 py-0.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
                          />
                          {/* Delete */}
                          <button
                            data-testid={`pin-delete-${i}`}
                            onClick={() => deletePin(i)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete mapping"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {/* Virtual component target */}
                        <div className="flex items-center gap-1.5">
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
                            className={`flex-1 bg-[#0d1627] border border-[#1e293b] rounded px-1.5 py-0.5 text-[11px] font-mono focus:outline-none focus:border-blue-500 ${
                              !pin.virtualComponent ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {VIRTUAL_BOARD_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>
                                {opt} ({getComponentLabel(opt)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
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
            className="w-full h-9 px-3 flex items-center justify-between bg-[#0a1120]/60 hover:bg-[#0a1120] text-slate-300 text-xs font-semibold transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock size={13} className="text-amber-400" />
              <span>Clock &amp; Timing</span>
            </span>
            {openSections.clock ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.clock && (
            <div className="p-3 bg-[#0d1627] space-y-3 text-xs">
              {/* Clock Status & Single Tick */}
              <div
                data-testid="clock-indicator"
                data-clock={clockState}
                className="flex items-center justify-between bg-[#080d18] border border-[#1e293b] rounded-md p-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      clockState === 1
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span className="font-mono text-slate-300">CLOCK_50: {clockState}</span>
                </div>
                <button
                  onClick={() => tickClock()}
                  className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded font-medium text-xs transition-colors"
                  title="Pulse Clock Signal"
                >
                  Step Clock
                </button>
              </div>

              {/* Continuous Auto-Simulation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Continuous Run</span>
                  <button
                    onClick={() => {
                      if (isSimRunning) stopAutoSimulation();
                      else startAutoSimulation();
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isSimRunning
                        ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30'
                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
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
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Frequency</span>
                    <span className="font-mono text-slate-300">{simFrequency} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={simFrequency}
                    onChange={e => setSimFrequency(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
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
            className="w-full h-9 px-3 flex items-center justify-between bg-[#0a1120]/60 hover:bg-[#0a1120] text-slate-300 text-xs font-semibold transition-colors"
          >
            <span className="flex items-center gap-2">
              <RotateCcw size={13} className="text-blue-400" />
              <span>Board Reset</span>
            </span>
            {openSections.reset ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.reset && (
            <div className="p-3 bg-[#0d1627] space-y-2 text-xs">
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Resets all switches to 0, push buttons to unpressed (active-low 1), clears LED and HEX outputs, and resets clock.
              </p>
              <button
                onClick={resetBoard}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-[#1e293b] rounded font-medium transition-colors"
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
            className="w-full h-9 px-3 flex items-center justify-between bg-[#0a1120]/60 hover:bg-[#0a1120] text-slate-300 text-xs font-semibold transition-colors"
          >
            <span className="flex items-center gap-2">
              <Activity size={13} className="text-emerald-400" />
              <span>Live I/O Status</span>
            </span>
            {openSections.io ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {openSections.io && (
            <div data-testid="live-io-status" className="p-3 bg-[#0d1627] space-y-2 text-xs">
              {/* Inputs */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Active Inputs
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeSwitches.length > 0 || pressedKeys.length > 0 ? (
                    <>
                      {activeSwitches.map(sw => (
                        <span
                          key={sw}
                          className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-400/25 text-blue-300 font-mono text-[10px]"
                        >
                          {sw}=1
                        </span>
                      ))}
                      {pressedKeys.map(k => (
                        <span
                          key={k}
                          className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/25 text-amber-300 font-mono text-[10px]"
                        >
                          {k}=0 (pressed)
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">All default (SW=0, KEY=1)</span>
                  )}
                </div>
              </div>

              {/* Outputs */}
              <div className="pt-2 border-t border-[#1e293b]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Active Outputs
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeLedR.length > 0 || activeLedG.length > 0 ? (
                    <>
                      {activeLedR.map(led => (
                        <span
                          key={led}
                          className="px-1.5 py-0.5 rounded bg-red-500/15 border border-red-400/25 text-red-300 font-mono text-[10px]"
                        >
                          {led}
                        </span>
                      ))}
                      {activeLedG.map(led => (
                        <span
                          key={led}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 font-mono text-[10px]"
                        >
                          {led}
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">No active LEDs</span>
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
