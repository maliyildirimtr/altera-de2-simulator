import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import type { ProjectFile } from './SchematicProjectPanel';

interface SchematicEditorProps {
  files: ProjectFile[];
  activeFileIndex: number;
  onCodeChange: (value: string | undefined) => void;
  isDarkMode: boolean;
  onImportHDL: () => void;
  onClose?: () => void;
  isModified?: boolean;
}

export const SchematicEditor: React.FC<SchematicEditorProps> = ({
  files,
  activeFileIndex,
  onCodeChange,
  isDarkMode,
  onImportHDL,
  onClose,
  isModified,
}) => {
  const [isEditorReady, setIsEditorReady] = useState(false);
  const currentFile = files[activeFileIndex];

  return (
    <div
      data-testid="schematic-editor"
      data-editor-ready={isEditorReady ? 'true' : 'false'}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary)',
        overflow: 'hidden',
      }}
    >
      {/* Editor Tab Bar */}
      <div
        style={{
          height: '34px',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'var(--bg-secondary)',
              borderTop: '2px solid var(--accent-color)',
              borderRight: '1px solid var(--border-color)',
              borderLeft: '1px solid var(--border-color)',
              borderRadius: '4px 4px 0 0',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            <span>📄</span>
            <span>{currentFile?.name || 'untitled.sv'}</span>
            {isModified && (
              <span
                title="File modified since last synthesis"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                }}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            data-testid="editor-import-hdl-btn"
            onClick={onImportHDL}
            style={{
              padding: '2px 8px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Import HDL
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Editor"
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

      {/* Monaco Container */}
      <div
        data-testid="schematic-monaco-editor"
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      >
        {currentFile ? (
          <Editor
            height="100%"
            language="systemverilog"
            theme={isDarkMode ? 'vs-dark' : 'vs-light'}
            value={currentFile.content}
            onChange={onCodeChange}
            loading={
              <div
                data-testid="monaco-loading"
                style={{
                  color: 'var(--text-secondary)',
                  padding: '16px',
                  fontFamily: 'sans-serif',
                  fontSize: '0.85rem',
                }}
              >
                Loading editor...
              </div>
            }
            onMount={(editor) => {
              setIsEditorReady(true);
              const ta = editor.getDomNode()?.querySelector('textarea');
              if (ta) {
                ta.setAttribute('data-testid', 'schematic-editor-textarea');
                ta.setAttribute('aria-label', 'HDL Code Editor');
              }
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
            }}
          />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <div>No HDL file open.</div>
            <button
              onClick={onImportHDL}
              style={{
                padding: '6px 14px',
                background: 'var(--accent-color)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Import HDL
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
