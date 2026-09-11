import React from 'react';
import {
  FolderOpen, FileCode, Layers, Upload, Trash2, Cpu, CheckCircle2,
} from 'lucide-react';
import type { VCDScope } from '../../services/vcdParser';
import { InstanceTree } from './InstanceTree';

export interface ProjectSlotFile {
  name: string;
  type: string;
  content: string;
}

export interface WaveformProjectPanelProps {
  width: number;
  sourceFile: ProjectSlotFile | null;
  testbenchFile: ProjectSlotFile | null;
  vcdFile: ProjectSlotFile | null;
  activeEditorSlot: 'source' | 'testbench' | null;
  onSelectSlot: (slot: 'source' | 'testbench') => void;
  onImportSource: () => void;
  onImportTestbench: () => void;
  onImportVcd: () => void;
  onClearSlot: (slot: 'source' | 'testbench' | 'vcd') => void;
  rootTree: VCDScope | null;
  activeScope: VCDScope | null;
  onScopeSelect: (scope: VCDScope) => void;
}

export const WaveformProjectPanel: React.FC<WaveformProjectPanelProps> = ({
  width,
  sourceFile,
  testbenchFile,
  vcdFile,
  activeEditorSlot,
  onSelectSlot,
  onImportSource,
  onImportTestbench,
  onImportVcd,
  onClearSlot,
  rootTree,
  activeScope,
  onScopeSelect,
}) => {
  return (
    <aside
      data-testid="wf-project-panel"
      className="shrink-0 flex flex-col bg-[#0f172a] border-r border-[#1e293b] select-none overflow-hidden h-full z-10"
      style={{ width }}
    >
      {/* ── Section 1: Project Files & HDL Slots ─────────────────── */}
      <div className="flex-1 min-h-[160px] flex flex-col border-b border-[#1e293b] overflow-hidden">
        <div className="px-3 py-2 bg-[#0a1120] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1e293b] flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <FolderOpen size={13} className="text-blue-400" />
            Project Files
          </span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#1e293b] text-slate-400 rounded font-mono">
            {(sourceFile ? 1 : 0) + (testbenchFile ? 1 : 0) + (vcdFile ? 1 : 0)}/2
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
          {/* ── Slot 1: Source (DUT) ── */}
          <div
            data-testid="wf-slot-source"
            className={`rounded-lg border transition-all ${
              activeEditorSlot === 'source'
                ? 'border-blue-500/80 bg-blue-950/20 shadow-sm'
                : 'border-[#1e293b] bg-[#111c33]/40 hover:border-[#334155]'
            }`}
          >
            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[#1e293b]/60">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1">
                <Cpu size={11} className="text-blue-400" />
                Source (DUT)
              </span>
              {sourceFile && (
                <button
                  data-testid="wf-clear-source"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearSlot('source');
                  }}
                  className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                  title="Remove Source File"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {sourceFile ? (
              <div
                onClick={() => onSelectSlot('source')}
                className="p-2.5 flex items-center gap-2 cursor-pointer group"
                title="Click to edit Source file"
              >
                <FileCode size={16} className="text-blue-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-slate-200 truncate font-medium group-hover:text-blue-300">
                    {sourceFile.name}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span>{sourceFile.content.split('\n').length} lines</span>
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 size={9} /> Assigned
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center">
                <div className="text-[11px] text-slate-500 mb-2 font-mono">
                  No design module loaded
                </div>
                <button
                  data-testid="wf-import-source-btn"
                  onClick={onImportSource}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-[#1e293b] hover:bg-blue-600/30 hover:text-blue-200 text-slate-300 border border-[#334155] transition-colors"
                >
                  <Upload size={12} />
                  <span>Import Source</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Slot 2: Testbench (TB) ── */}
          <div
            data-testid="wf-slot-testbench"
            className={`rounded-lg border transition-all ${
              activeEditorSlot === 'testbench'
                ? 'border-blue-500/80 bg-blue-950/20 shadow-sm'
                : 'border-[#1e293b] bg-[#111c33]/40 hover:border-[#334155]'
            }`}
          >
            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[#1e293b]/60">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1">
                <Layers size={11} className="text-amber-400" />
                Testbench (TB)
              </span>
              {testbenchFile && (
                <button
                  data-testid="wf-clear-testbench"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearSlot('testbench');
                  }}
                  className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                  title="Remove Testbench File"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {testbenchFile ? (
              <div
                onClick={() => onSelectSlot('testbench')}
                className="p-2.5 flex items-center gap-2 cursor-pointer group"
                title="Click to edit Testbench file"
              >
                <FileCode size={16} className="text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-slate-200 truncate font-medium group-hover:text-amber-300">
                    {testbenchFile.name}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span>{testbenchFile.content.split('\n').length} lines</span>
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 size={9} /> Assigned
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center">
                <div className="text-[11px] text-slate-500 mb-2 font-mono">
                  No testbench loaded
                </div>
                <button
                  data-testid="wf-import-tb-btn"
                  onClick={onImportTestbench}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-[#1e293b] hover:bg-amber-600/30 hover:text-amber-200 text-slate-300 border border-[#334155] transition-colors"
                >
                  <Upload size={12} />
                  <span>Import Testbench</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Optional: Direct VCD Load ── */}
          {vcdFile && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode size={15} className="text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-mono text-emerald-200 truncate font-medium">
                    {vcdFile.name}
                  </div>
                  <div className="text-[10px] text-emerald-400/70">Direct VCD Mode</div>
                </div>
              </div>
              <button
                onClick={() => onClearSlot('vcd')}
                className="text-slate-500 hover:text-red-400 transition-colors p-1"
                title="Remove VCD File"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}

          {!vcdFile && (
            <div className="pt-1 flex justify-center">
              <button
                data-testid="wf-import-vcd-btn"
                onClick={onImportVcd}
                className="text-[10px] text-slate-500 hover:text-slate-300 underline transition-colors"
              >
                or load pre-generated .vcd directly
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Hardware Hierarchy ───────────────────────── */}
      <div className="flex-1 min-h-[140px] flex flex-col overflow-hidden bg-[#0f172a]">
        <div className="px-3 py-2 bg-[#0a1120] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1e293b] flex items-center gap-1.5 shrink-0">
          <Cpu size={13} className="text-slate-400" />
          <span>Hardware Hierarchy</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {rootTree ? (
            <InstanceTree
              tree={rootTree}
              activeScope={activeScope}
              onScopeSelect={onScopeSelect}
            />
          ) : (
            <div className="px-3 py-6 text-center text-xs text-slate-500 italic">
              Compile HDL to inspect design instance hierarchy.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
