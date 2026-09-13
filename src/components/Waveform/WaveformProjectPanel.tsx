import React from 'react';
import {
  FolderOpen, FileCode, Layers, Upload, Trash2, Cpu, CheckCircle2, Plus,
} from 'lucide-react';
import type { VCDScope } from '../../services/vcdParser';
import { InstanceTree } from './InstanceTree';

export interface ProjectSlotFile {
  id: string;
  name: string;
  type: string;
  content: string;
}

export interface WaveformProjectPanelProps {
  width: number;
  sourceFiles?: ProjectSlotFile[];
  sourceFile?: ProjectSlotFile | null;
  testbenchFile: ProjectSlotFile | null;
  vcdFile: ProjectSlotFile | null;
  activeSourceId?: string | null;
  activeEditorSlot: 'source' | 'testbench' | null;
  onSelectSourceFile?: (id: string) => void;
  onSelectSlot: (slot: 'source' | 'testbench') => void;
  onImportSource: () => void;
  onImportTestbench: () => void;
  onImportVcd: () => void;
  onRemoveSourceFile?: (id: string) => void;
  onClearSlot: (slot: 'source' | 'testbench' | 'vcd') => void;
  rootTree: VCDScope | null;
  activeScope: VCDScope | null;
  onScopeSelect: (scope: VCDScope) => void;
}

export const WaveformProjectPanel: React.FC<WaveformProjectPanelProps> = ({
  width,
  sourceFiles,
  sourceFile,
  testbenchFile,
  vcdFile,
  activeSourceId,
  activeEditorSlot,
  onSelectSourceFile,
  onSelectSlot,
  onImportSource,
  onImportTestbench,
  onImportVcd,
  onRemoveSourceFile,
  onClearSlot,
  rootTree,
  activeScope,
  onScopeSelect,
}) => {
  const sources: ProjectSlotFile[] = sourceFiles && sourceFiles.length > 0
    ? sourceFiles
    : (sourceFile ? [sourceFile] : []);

  const totalFiles = sources.length + (testbenchFile ? 1 : 0) + (vcdFile ? 1 : 0);

  return (
    <aside
      data-testid="wf-project-panel"
      className="shrink-0 flex flex-col bg-[#0f172a] border-r border-[#1e293b] select-none overflow-hidden h-full z-10 min-w-0"
      style={{ width }}
    >
      {/* ── Section 1: Project Files & HDL Slots ─────────────────── */}
      <div className="flex-1 min-h-[180px] flex flex-col border-b border-[#1e293b] overflow-hidden">
        <div className="px-3 py-2 bg-[#0a1120] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1e293b] flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <FolderOpen size={13} className="text-blue-400 shrink-0" />
            <span className="truncate">Project Files</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.2 bg-[#1e293b] text-slate-400 rounded font-mono shrink-0 ml-1">
            {totalFiles}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-3 min-w-0">
          {/* ── Group 1: Design Sources (Multi-File) ── */}
          <div data-testid="wf-slot-source" className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1 min-w-0 truncate">
                <Cpu size={11} className="text-blue-400 shrink-0" />
                <span className="truncate">Sources ({sources.length})</span>
              </span>
              <button
                data-testid="wf-import-source-btn"
                onClick={onImportSource}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-blue-950/40 transition-colors"
                title="Add design source file (.v, .sv)"
              >
                <Plus size={11} />
                <span>Add</span>
              </button>
            </div>

            {sources.length === 0 ? (
              <div className="rounded-lg border border-[#1e293b] bg-[#111c33]/40 p-3 text-center">
                <div className="text-[11px] text-slate-500 mb-2 font-mono">
                  No design sources loaded
                </div>
                <button
                  onClick={onImportSource}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-[#1e293b] hover:bg-blue-600/30 hover:text-blue-200 text-slate-300 border border-[#334155] transition-colors"
                >
                  <Upload size={12} />
                  <span>Import Source</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {sources.map((file, idx) => {
                  const isActive = activeEditorSlot === 'source' && (
                    activeSourceId ? file.id === activeSourceId : idx === 0
                  );
                  return (
                    <div
                      key={file.id || file.name}
                      data-testid={`wf-source-item-${file.name}`}
                      data-filename={file.name}
                      onClick={() => {
                        if (onSelectSourceFile) onSelectSourceFile(file.id);
                        onSelectSlot('source');
                      }}
                      className={`group rounded-md border p-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isActive
                          ? 'border-blue-500/80 bg-blue-950/30 shadow-sm'
                          : 'border-[#1e293b] bg-[#111c33]/30 hover:border-[#334155] hover:bg-[#111c33]/60'
                      }`}
                      title={file.name}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileCode size={14} className={isActive ? 'text-blue-400 shrink-0' : 'text-slate-400 shrink-0'} />
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-mono truncate font-medium ${
                            isActive ? 'text-blue-200' : 'text-slate-200 group-hover:text-blue-300'
                          }`}>
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <span>{file.content.split('\n').length}L</span>
                            {isActive && (
                              <span className="text-emerald-400 flex items-center gap-0.5 text-[9px]">
                                <CheckCircle2 size={8} /> Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        data-testid={idx === 0 ? 'wf-clear-source' : `wf-remove-source-${file.name}`}
                        data-action="remove-source"
                        data-filename={file.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onRemoveSourceFile) {
                            onRemoveSourceFile(file.id);
                          } else {
                            onClearSlot('source');
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 rounded opacity-60 group-hover:opacity-100 transition-all shrink-0"
                        title={`Remove ${file.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Group 2: Testbench (TB) ── */}
          <div
            data-testid="wf-slot-testbench"
            className={`rounded-lg border transition-all ${
              activeEditorSlot === 'testbench'
                ? 'border-amber-500/80 bg-amber-950/20 shadow-sm'
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
