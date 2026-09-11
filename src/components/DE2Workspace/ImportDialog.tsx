import React, { useState, useRef } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { parseQsf, parseXdc, type ParsedPort } from '../../utils/parser/pinParser';
import { markWorkspaceUser } from '../../services/exampleHandoff';
import { Upload, FileCode, FileText, X, Check, AlertCircle } from 'lucide-react';

interface StagedFile {
  name: string;
  type: 'hdl' | 'qsf' | 'xdc' | 'unknown';
  content: string;
  size: number;
}

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (summary: string) => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { setHdlCode, setPinMappings, pinMappings } = useBoardStore();
  const [dragActive, setDragActive] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const processFiles = async (files: FileList | File[]) => {
    const newStaged: StagedFile[] = [...stagedFiles];
    setErrorMsg(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();
      let type: StagedFile['type'] = 'unknown';

      if (lower.endsWith('.v') || lower.endsWith('.sv')) type = 'hdl';
      else if (lower.endsWith('.qsf')) type = 'qsf';
      else if (lower.endsWith('.xdc')) type = 'xdc';

      if (type === 'unknown') {
        setErrorMsg(`Unsupported file: ${file.name}. Only .v, .sv, .qsf, and .xdc are supported.`);
        continue;
      }

      try {
        const text = await file.text();
        // Avoid duplicate filenames
        const existingIdx = newStaged.findIndex(f => f.name === file.name);
        const item: StagedFile = { name: file.name, type, content: text, size: file.size };
        if (existingIdx !== -1) newStaged[existingIdx] = item;
        else newStaged.push(item);
      } catch (err: any) {
        setErrorMsg(`Failed reading ${file.name}: ${err.message}`);
      }
    }

    setStagedFiles(newStaged);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const removeStaged = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = () => {
    let combinedHdl = '';
    let parsedPins: ParsedPort[] = [...pinMappings];
    let importedHdlCount = 0;
    let importedConstraintCount = 0;

    for (const f of stagedFiles) {
      if (f.type === 'hdl') {
        combinedHdl = combinedHdl ? combinedHdl + '\n\n' + f.content : f.content;
        importedHdlCount++;
      } else if (f.type === 'qsf') {
        const qsfPins = parseQsf(f.content);
        parsedPins = qsfPins;
        importedConstraintCount++;
      } else if (f.type === 'xdc') {
        const xdcPins = parseXdc(f.content);
        parsedPins = xdcPins;
        importedConstraintCount++;
      }
    }

    if (combinedHdl) {
      setHdlCode(combinedHdl);
      markWorkspaceUser('de2');
    }

    if (importedConstraintCount > 0) {
      setPinMappings(parsedPins);
      markWorkspaceUser('de2');
    }

    const summary = `Imported ${importedHdlCount} HDL file(s), ${parsedPins.length} pin mappings.`;
    if (onImportSuccess) onImportSuccess(summary);

    setStagedFiles([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        data-testid="import-dialog"
        className="w-full max-w-lg bg-[#0d1627] border border-[#1e293b] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
      >
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#1e293b] bg-[#0a1120]">
          <h2 id="import-dialog-title" className="text-sm font-bold text-white flex items-center gap-2">
            <Upload size={16} className="text-blue-400" />
            Import Design Files
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            data-testid="import-dropzone"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-[#1e293b] hover:border-slate-500 bg-[#080d18]'
            }`}
          >
            <input
              ref={fileInputRef}
              data-testid="import-file-input"
              type="file"
              multiple
              accept=".v,.sv,.qsf,.xdc"
              className="hidden"
              onChange={handleChange}
            />
            <Upload size={28} className="text-blue-400 mb-2" />
            <p className="text-sm font-semibold text-white mb-0.5">
              Drag &amp; drop files here, or <span className="text-blue-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400">
              Supports Verilog (.v, .sv) and Pin Constraints (.qsf, .xdc)
            </p>
          </div>

          {/* Staged Files List */}
          {stagedFiles.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Ready for Import ({stagedFiles.length})
              </span>
              <div className="max-h-40 overflow-y-auto border border-[#1e293b] rounded-md bg-[#080d18] divide-y divide-[#1e293b]">
                {stagedFiles.map((file, idx) => (
                  <div key={file.name} className="px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      {file.type === 'hdl' ? (
                        <FileCode size={15} className="text-blue-400 shrink-0" />
                      ) : (
                        <FileText size={15} className="text-emerald-400 shrink-0" />
                      )}
                      <span className="font-mono text-slate-200 truncate">{file.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                          file.type === 'hdl'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {file.type}
                      </span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeStaged(idx);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-4 border-t border-[#1e293b] bg-[#0a1120] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="import-confirm-btn"
            onClick={handleConfirmImport}
            disabled={stagedFiles.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Check size={14} />
            Import to Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
