import React, { useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useBoardStore } from '../../store/boardStore';
import { compileVerilog } from '../../core/simulator/verilogEngine';

interface CodeEditorProps {
  isOpen: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ isOpen }) => {
  const { hdlCode, setHdlCode, setEngine } = useBoardStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
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

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e]">
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center shrink-0">
        <h3 className="text-sm font-semibold text-gray-200 whitespace-nowrap">Verilog Code</h3>
        <span className="text-xs text-gray-500 whitespace-nowrap">Auto-sync</span>
      </div>
      <div className="flex-1 min-h-0">
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
          }}
        />
      </div>
    </div>
  );
};
