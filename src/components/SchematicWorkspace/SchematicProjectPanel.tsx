import React, { useState } from 'react';

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
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontSize: '0.85rem',
        userSelect: 'none',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <span>📁</span>
          <span>Project Files</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            data-testid="create-file-btn"
            onClick={onCreateFile}
            title="Create New HDL File"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '4px',
              padding: '2px 7px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            +
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Collapse Project Panel"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '0 4px',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* File List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {files.map((file, idx) => {
          const isActive = activeFileIndex === idx;
          return (
            <div
              key={idx}
              data-testid={`project-file-${idx}`}
              onClick={() => onSelectFile(idx)}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                fontSize: '0.82rem',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.9rem' }}>📄</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
              </div>

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
                    color: isActive ? '#fff' : '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '0 4px',
                    lineHeight: 1,
                    opacity: 0.9,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Top Module Info (Point 7) */}
      {topModule && synthesisStatus !== 'error' && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Top Module: </span>
          <strong style={{ color: 'var(--text-primary)' }}>{topModule}</strong>
        </div>
      )}

      {/* Synthesis Settings */}
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
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
            fontSize: '0.8rem',
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
            style={{ cursor: 'pointer' }}
          />
          Optimize Logic (Yosys)
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
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
            style={{ cursor: 'pointer' }}
          />
          Simplify RTL Diagram
        </label>
      </div>
    </aside>
  );
};
