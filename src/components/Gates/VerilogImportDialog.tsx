import { useState } from 'react';
import { X } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { ConvertError, verilogToCircuit } from '../../gates/fromVerilog';
import type { Circuit } from '../../gates/circuit';

export interface VerilogImportText {
  fromVerilogTitle: string;
  fromVerilogLead: string;
  fromVerilogConvert: string;
  fromVerilogFromDe2: string;
  fromVerilogError: string;
  close: string;
}

const SAMPLE = `module majority (
    input  logic a,
    input  logic b,
    input  logic c,
    output logic y
);
    assign y = (a & b) | (a & c) | (b & c);
endmodule
`;

/**
 * Paste a Verilog module and get it as a gate circuit (see gates/fromVerilog).
 * Starts from the code currently in the DE2 editor when there is some.
 */
export function VerilogImportDialog({ text, lang, onClose, onDone }: { text: VerilogImportText; lang: 'en' | 'tr'; onClose: () => void; onDone: (c: Circuit, name: string) => void }) {
  const de2Code = useBoardStore((s) => s.hdlCode);
  const [code, setCode] = useState(() => (de2Code && de2Code.trim() ? de2Code : SAMPLE));
  const [error, setError] = useState<string | null>(null);
  const convert = () => {
    try {
      const r = verilogToCircuit(code);
      onDone(r.circuit, r.name);
    } catch (err) {
      setError(err instanceof ConvertError ? (lang === 'tr' ? err.tr : err.message) : (err as Error).message);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onPointerDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={text.fromVerilogTitle} data-testid="gate-verilog-dialog" onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-[44rem] max-h-[90vh] overflow-auto rounded-[0.5rem] border shadow-xl p-4 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
        <div className="flex items-center gap-2">
          <h2 className="text-[0.9375rem] font-bold">{text.fromVerilogTitle}</h2>
          <button type="button" aria-label={text.close} className="ml-auto p-1 rounded hover:bg-[var(--bg-hover)]" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>{text.fromVerilogLead}</p>
        <textarea data-testid="gate-verilog-code" value={code} onChange={(e) => { setCode(e.target.value); setError(null); }} rows={16} spellCheck={false}
          className="w-full px-2 py-1.5 rounded-[0.25rem] border text-[0.75rem] font-mono" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }} />
        {error && <p data-testid="gate-verilog-error" className="text-[0.75rem]" style={{ color: '#ef4444' }}>{text.fromVerilogError} {error}</p>}
        <div className="flex gap-2 justify-end">
          {de2Code && de2Code.trim() && code !== de2Code && (
            <button type="button" className="px-3 h-8 rounded-[0.25rem] border text-xs mr-auto" style={{ borderColor: 'var(--border-subtle)' }} onClick={() => setCode(de2Code)}>{text.fromVerilogFromDe2}</button>
          )}
          <button type="button" className="px-3 h-8 rounded-[0.25rem] border text-xs" style={{ borderColor: 'var(--border-subtle)' }} onClick={onClose}>{text.close}</button>
          <button type="button" data-testid="gate-verilog-convert" className="px-3 h-8 rounded-[0.25rem] text-xs text-white" style={{ backgroundColor: 'var(--accent-primary)' }} onClick={convert}>{text.fromVerilogConvert}</button>
        </div>
      </div>
    </div>
  );
}
