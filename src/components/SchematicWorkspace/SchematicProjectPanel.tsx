import React, { useState } from 'react';
import { FolderTree, FileCode, Plus, X } from 'lucide-react';

export interface ProjectFile {
  name: string;
  content: string;
}

interface SchematicProjectPanelProps {
  files: ProjectFile[];
  activeFileIndex: number;
  onSelectFile: (index: number) => void;
  onCreateFile: () => void;
  onDeleteFile: (index: number) => void;
  optimizeInYosys: boolean;
  onToggleOptimize: (val: boolean) => void;
  simplifyDiagram: boolean;
  onToggleSimplify: (val: boolean) => void;
  topModule?: string;
  synthesisStatus?: 'no_source' | 'synthesizing' | 'ready' | 'error' | 'modified';
  onClose?: () => void;
}

export const SchematicProjectPanel: React.FC<SchematicProjectPanelProps> = ({
  files,
  activeFileIndex,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  optimizeInYosys,
  onToggleOptimize,
  simplifyDiagram,
  onToggleSimplify,
  topModule,
  synthesisStatus,
  onClose,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <aside
      data-testid="schematic-project-panel"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontSize: '0.82rem',
        userSelect: 'none',
        color: 'var(--text-primary)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Panel Header */}
      <div
        className="h-9 px-3 flex items-center justify-between shrink-0 select-none"
        style={{
          backgroundColor: 'var(--bg-panel-header)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <FolderTree size={13} className="text-blue-500 shrink-0" />
          <span
            className="text-[11px] font-bold uppercase tracking-wider truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            Project Files
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {files.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            data-testid="create-file-btn"
            onClick={onCreateFile}
            title="Create New HDL File"
            className="p-1 rounded-[4px] border transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Plus size={12} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Collapse Project Panel"
              className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* File List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {files.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.78rem',
            }}
          >
            No source files loaded
          </div>
        ) : (
          files.map((file, idx) => {
            const isActive = activeFileIndex === idx;
            const lineCount = file.content.split('\n').length;
            return (
              <div
                key={idx}
                data-testid={`project-file-${idx}`}
                onClick={() => onSelectFile(idx)}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  padding: '5px 12px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.12s ease',
                  borderLeft: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                  <FileCode size={13} className={isActive ? 'text-blue-500' : 'text-slate-400'} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <span
                    className="text-[10px] font-mono select-none"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {lineCount}L
                  </span>

                  {hoveredIndex === idx && files.length > 1 && (
                    <button
                      data-testid={`delete-file-btn-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFile(idx);
                      }}
                      title="Delete File"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: '0 2px',
                        lineHeight: 1,
                        opacity: 0.85,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Top Module Info (Point 7) */}
      {topModule && synthesisStatus !== 'error' && (
        <div
          style={{
            padding: '6px 12px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          <span>Top Module: </span>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{topModule}</strong>
        </div>
      )}

      {/* Synthesis Settings */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flexShrink: 0,
          backgroundColor: 'var(--bg-app)',
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Synthesis Settings
        </span>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <input
            data-testid="checkbox-optimize-yosys"
            type="checkbox"
            checked={optimizeInYosys}
            onChange={(e) => {
              onToggleOptimize(e.target.checked);
              if (e.target.checked) onToggleSimplify(false);
            }}
            style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
          />
          Optimize Logic (Yosys)
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <input
            data-testid="checkbox-simplify-diagram"
            type="checkbox"
            checked={simplifyDiagram}
            onChange={(e) => {
              onToggleSimplify(e.target.checked);
              if (e.target.checked) onToggleOptimize(false);
            }}
            style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
          />
          Simplify RTL Diagram
        </label>
      </div>
    </aside>
  );
};
