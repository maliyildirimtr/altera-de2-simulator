import React, { useState, useRef, useEffect } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { parseQsf, parseXdc } from '../../utils/parser/pinParser';
import { compileVerilog } from '../../core/simulator/verilogEngine';
import { Trash2, Copy, Plus } from 'lucide-react';

const VIRTUAL_BOARD_OPTIONS = [
  'Unmapped',
  'CLOCK_50',
  ...Array.from({length: 18}, (_, i) => `SW[${i}]`),
  ...Array.from({length: 18}, (_, i) => `LEDR[${i}]`),
  ...Array.from({length: 8}, (_, i) => `LEDG[${i}]`),
  ...Array.from({length: 4}, (_, i) => `KEY[${i}]`),
  ...Array.from({length: 8}, (_, i) => [
    `HEX${i}[0]`, `HEX${i}[1]`, `HEX${i}[2]`, `HEX${i}[3]`,
    `HEX${i}[4]`, `HEX${i}[5]`, `HEX${i}[6]`
  ]).flat(),
];

export const FileUploader: React.FC = () => {
  const { isUploaderOpen, setUploaderOpen, pinMappings, setPinMappings, hdlCode, setHdlCode, setEngine } = useBoardStore();
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [localPins, setLocalPins] = useState(pinMappings);
  const [localHdl, setLocalHdl] = useState(hdlCode);
  const [copiedQsf, setCopiedQsf] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isUploaderOpen) {
      setLocalPins(pinMappings);
      setLocalHdl(hdlCode);
      setCopiedQsf(false);
      setCopiedCode(false);
      setErrorMsg(null);
    }
  }, [isUploaderOpen, pinMappings, hdlCode]);

  if (!isUploaderOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    let combinedHdl = localHdl || '';
    let newPins = [...localPins];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      const name = file.name.toLowerCase();
      
      if (name.endsWith('.qsf')) {
        newPins = parseQsf(text);
      } else if (name.endsWith('.xdc')) {
        newPins = parseXdc(text);
      } else if (name.endsWith('.v') || name.endsWith('.sv')) {
        combinedHdl = combinedHdl ? combinedHdl + '\n\n' + text : text;
      }
    }
    
    setLocalPins(newPins);
    setLocalHdl(combinedHdl);
  };

  const handleLoadToSimulator = () => {
    if (!localHdl) return;
    try {
      const module = compileVerilog(localHdl);
      setEngine(module);
      setPinMappings(localPins);
      setHdlCode(localHdl);
      setErrorMsg(null);
      // Give it a tiny tick to let state settle then run first cycle
      setTimeout(() => {
        useBoardStore.getState().runSimulationCycle();
      }, 0);
      setUploaderOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Derleme hatası oluştu! Lütfen kodu kontrol edin.");
    }
  };

  const updatePinMapping = (index: number, field: string, value: string) => {
    const newPins = [...localPins];
    newPins[index] = { ...newPins[index], [field]: value };
    setLocalPins(newPins);
  };

  const deletePinMapping = (index: number) => {
    const newPins = [...localPins];
    newPins.splice(index, 1);
    setLocalPins(newPins);
  };

  const addPinMapping = () => {
    setLocalPins([...localPins, { portName: '', physicalPin: '', virtualComponent: '' }]);
  };

  const handleCopyQsf = () => {
    const qsfText = localPins
      .filter(p => p.portName && p.physicalPin)
      .map(p => `set_location_assignment ${p.physicalPin} -to ${p.portName}`)
      .join('\n');
    navigator.clipboard.writeText(qsfText);
    setCopiedQsf(true);
    setTimeout(() => setCopiedQsf(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(localHdl);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-[800px] max-w-[90vw] max-h-[90vh] flex flex-col border border-slate-600">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Project Files Upload</h2>
          <button 
            onClick={() => setUploaderOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 text-sm text-red-200">
                <strong className="block font-semibold text-red-400 mb-1">Compilation Failed</strong>
                {errorMsg}
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-300">
                ✕
              </button>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
              ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-500 hover:border-slate-400 hover:bg-slate-700/50'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".v,.sv,.qsf,.xdc"
              className="hidden"
              onChange={handleChange}
            />
            <svg className="w-12 h-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-white text-lg mb-1">Drag and drop your files here</p>
            <p className="text-slate-400 text-sm">Supports Quartus (.qsf), Vivado (.xdc), and Verilog (.v, .sv)</p>
          </div>

          {/* Status / Mapping Results */}
          <div className="flex gap-4">
            <div className="flex-1 bg-slate-900 rounded-md p-4 border border-slate-700 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-slate-300">Pin Mappings ({localPins.length})</h3>
                <button
                  onClick={handleCopyQsf}
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                >
                  {copiedQsf ? (
                    <span className="text-emerald-400">Copied!</span>
                  ) : (
                    <>
                      <Copy size={12} /> Copy QSF
                    </>
                  )}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[250px]">
                <table className="w-full text-sm text-left table-fixed">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-1 py-2 w-[30%] truncate">Port Name</th>
                      <th className="px-1 py-2 w-[35%] truncate">Physical Pin</th>
                      <th className="px-1 py-2 w-[28%] truncate">Virtual Board</th>
                      <th className="px-1 py-2 w-[7%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {localPins.map((m, i) => (
                      <tr key={i} className="border-b border-slate-800 text-slate-300 group">
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={m.portName}
                            onChange={(e) => updatePinMapping(i, 'portName', e.target.value)}
                            placeholder="e.g. SW[0]"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-blue-400 focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={m.physicalPin || ''}
                            onChange={(e) => updatePinMapping(i, 'physicalPin', e.target.value)}
                            placeholder="e.g. PIN_N25"
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={m.virtualComponent || 'Unmapped'}
                            onChange={(e) => updatePinMapping(i, 'virtualComponent', e.target.value === 'Unmapped' ? '' : e.target.value)}
                            className={`w-full bg-slate-800 border border-slate-700 rounded px-1 py-1 text-[11px] focus:outline-none focus:border-blue-500 ${!m.virtualComponent ? 'text-red-400' : 'text-emerald-400'}`}
                          >
                            {VIRTUAL_BOARD_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1 text-right">
                          <button
                            onClick={() => deletePinMapping(i)}
                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Delete Mapping"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {localPins.length === 0 && (
                  <p className="text-slate-500 text-sm italic mt-4 text-center">No pin mappings.</p>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800">
                <button
                  onClick={addPinMapping}
                  className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded border border-dashed border-blue-900/50 transition-colors"
                >
                  <Plus size={14} /> Add Pin
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-900 rounded-md p-4 border border-slate-700 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-slate-300">HDL Source Code</h3>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                >
                  {copiedCode ? (
                    <span className="text-emerald-400">Copied!</span>
                  ) : (
                    <>
                      <Copy size={12} /> Copy Code
                    </>
                  )}
                </button>
              </div>
              <div className="flex-1 min-h-[250px] relative">
                <textarea
                  value={localHdl}
                  onChange={(e) => setLocalHdl(e.target.value)}
                  placeholder="Paste or write your Verilog code here..."
                  className="absolute inset-0 w-full h-full bg-slate-950 border border-slate-700 rounded p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-blue-500 resize-none overflow-y-auto"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

        </div>
        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50 rounded-b-lg">
          <button 
            onClick={() => setUploaderOpen(false)}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-md hover:bg-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleLoadToSimulator}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50"
            disabled={!localHdl}
          >
            Load to Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
