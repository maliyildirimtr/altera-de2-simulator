import React, { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useBoardStore } from '../../store/boardStore';
import { compileVerilog } from '../../core/simulator/verilogEngine';
import { markWorkspaceDirty } from '../../services/exampleHandoff';
import { FileCode, Upload, BookOpen } from 'lucide-react';

interface CodeEditorProps {
  isOpen: boolean;
  onOpenImport?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ isOpen, onOpenImport }) => {
  const navigate = useNavigate();
  const { hdlCode, setHdlCode, setEngine } = useBoardStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
    if (useBoardStore.getState().hdlCode !== value) {
      markWorkspaceDirty('de2');
    }
    setHdlCode(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const newEngine = compileVerilog(value);
        setEngine(newEngine);
      } catch (_) {}
    }, 600);
  }, [setHdlCode, setEngine]);

  if (!isOpen) return null;

  const hasHdl = !!hdlCode && hdlCode.trim().length > 0;

  return (
    <div data-testid="code-editor" className="flex flex-col h-full w-full bg-[#080d18] select-none">
      {/* Editor Header Bar */}
      <div className="h-9 px-3 bg-[#0a1120] border-b border-[#1e293b] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-blue-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">main.sv</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">SystemVerilog</span>
      </div>

      {/* Editor Canvas or Empty State */}
      <div className="flex-1 min-h-0 relative">
        {!hasHdl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-[#080d18]">
            <FileCode size={36} className="text-slate-600 mb-3" />
            <h4 className="text-sm font-semibold text-slate-300 mb-1">No HDL source loaded</h4>
            <p className="text-xs text-slate-500 max-w-xs mb-4">
              Write Verilog/SystemVerilog directly, import an existing file, or start from a gallery example.
            </p>
            <div className="flex items-center gap-2">
              {onOpenImport && (
                <button
                  onClick={onOpenImport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow transition-colors"
                >
                  <Upload size={13} />
                  Import HDL
                </button>
              )}
              <button
                onClick={() => navigate('/examples')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              >
                <BookOpen size={13} />
                Open Example
              </button>
            </div>
            <button
              onClick={() => setHdlCode('module main (\n  input  SW0,\n  output LEDR0\n);\n  assign LEDR0 = SW0;\nendmodule\n')}
              className="mt-4 text-[11px] text-slate-500 hover:text-blue-400 underline transition-colors"
            >
              Or click here to create a minimal module
            </button>
          </div>
        ) : null}

        <Editor
          height="100%"
          defaultLanguage="verilog"
          theme="vs-dark"
          value={hdlCode}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            tabSize: 2,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

