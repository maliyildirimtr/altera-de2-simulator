import React from 'react';
import type { TargetTool } from '../../services/exampleHandoff';
import type { LearningExample } from '../../examples/types';

interface OverwriteConfirmModalProps {
  isOpen: boolean;
  example: LearningExample | null;
  targetTool: TargetTool | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OverwriteConfirmModal: React.FC<OverwriteConfirmModalProps> = ({
  isOpen,
  example,
  targetTool,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !example || !targetTool) return null;

  const toolLabels: Record<TargetTool, string> = {
    schematic: 'Schematic Workspace',
    waveform: 'Waveform Workspace',
    de2: 'DE2 Board Workspace',
  };

  return (
    <div
      data-testid="example-overwrite-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="relative flex flex-col w-full max-w-md bg-[#0c1322] border border-amber-500/40 rounded-xl shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-[#090f1c]">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Replace Active Workspace Content?
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {toolLabels[targetTool]} has unsaved modifications
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            You have unsaved changes in <strong className="text-slate-100">{toolLabels[targetTool]}</strong>.
          </p>
          <p className="text-slate-400">
            Loading <strong className="text-indigo-300">{example.title}</strong> will replace your current workspace files and reset simulation state. Unsaved edits will be lost.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 bg-[#090f1c] border-t border-slate-800">
          <button
            data-testid="example-overwrite-cancel"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            data-testid="example-overwrite-confirm"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors shadow-sm"
          >
            Replace and Open
          </button>
        </div>
      </div>
    </div>
  );
};
