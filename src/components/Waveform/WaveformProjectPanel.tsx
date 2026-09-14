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
      className="shrink-0 flex flex-col select-none overflow-hidden h-full z-10 min-w-0 border-r"
      style={{
        width,
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      {/* ── Section 1: Project Files & HDL Slots ─────────────────── */}
      <div className="flex-1 min-h-[180px] flex flex-col border-b border-[var(--border-subtle)] overflow-hidden">
        <div
          className="h-9 px-3 text-[11px] font-bold uppercase tracking-wider border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-panel-header)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <FolderOpen size={13} className="text-blue-500 shrink-0" />
            <span className="truncate">Project Files</span>
          </span>
          <span
            className="text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ml-1 border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            {totalFiles}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-3 min-w-0">
          {/* ── Group 1: Design Sources (Multi-File) ── */}
          <div data-testid="wf-slot-source" className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1 min-w-0 truncate">
                <Cpu size={11} className="text-[var(--accent-primary)] shrink-0" />
                <span className="truncate">Sources ({sources.length})</span>
              </span>
              <button
                data-testid="wf-import-source-btn"
                onClick={onImportSource}
                className="text-[11px] text-[var(--accent-primary)] hover:text-[var(--accent-hover)] flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                title="Add design source file (.v, .sv)"
              >
                <Plus size={11} />
                <span>Add</span>
              </button>
            </div>

            {sources.length === 0 ? (
              <div
                className="rounded-[4px] border p-3 text-center"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="text-[11px] text-[var(--text-muted)] mb-2 font-mono">
                  No design sources loaded
                </div>
                <button
                  onClick={onImportSource}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium border transition-colors shadow-xs"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
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
                      className={`group rounded-[4px] border p-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isActive
                          ? 'border-[var(--accent-border)] bg-[var(--accent-subtle)] shadow-xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)]'
                      }`}
                      title={file.name}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileCode size={14} className={isActive ? 'text-[var(--accent-primary)] shrink-0' : 'text-[var(--text-muted)] shrink-0'} />
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-mono truncate font-medium ${
                            isActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                          }`}>
                            {file.name}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
                            <span className="font-mono">{file.content.split('\n').length}L</span>
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
                        className="text-[var(--text-muted)] hover:text-rose-400 p-1 rounded opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
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

          {/* ── Group 2: Testbench (TB) (Quiet informational/neutral styling, zero amber warning color) ── */}
          <div
            data-testid="wf-slot-testbench"
            className={`rounded-[4px] border transition-colors ${
              activeEditorSlot === 'testbench'
                ? 'border-[var(--border-strong)] bg-[var(--bg-hover)] shadow-xs'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase flex items-center gap-1">
                <Layers size={11} className="text-slate-400" />
                Testbench (TB)
              </span>
              {testbenchFile && (
                <button
                  data-testid="wf-clear-testbench"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearSlot('testbench');
                  }}
                  className="text-[var(--text-muted)] hover:text-rose-400 transition-colors p-0.5"
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
                <FileCode size={15} className="text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-[var(--text-secondary)] truncate font-medium group-hover:text-[var(--text-primary)]">
                    {testbenchFile.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className="font-mono">{testbenchFile.content.split('\n').length} lines</span>
                    <span className="text-slate-400 flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded border border-[var(--border-subtle)] bg-[var(--bg-input)]">
                      <CheckCircle2 size={8} className="text-emerald-400" /> Assigned
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center">
                <div className="text-[11px] text-[var(--text-muted)] mb-2 font-mono">
                  No testbench loaded
                </div>
                <button
                  data-testid="wf-import-tb-btn"
                  onClick={onImportTestbench}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium border transition-colors shadow-xs"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
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
      <div
        className="flex-1 min-h-[140px] flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-panel)' }}
      >
        <div
          className="h-9 px-3 text-[11px] font-bold uppercase tracking-wider border-b flex items-center gap-1.5 shrink-0"
          style={{
            backgroundColor: 'var(--bg-panel-header)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <Cpu size={13} style={{ color: 'var(--text-muted)' }} />
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
            <div className="px-3 py-6 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>
              Compile HDL to inspect design instance hierarchy.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
