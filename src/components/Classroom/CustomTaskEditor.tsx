import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { compileVerilog } from '../../core/simulator/verilogEngine';
import { tableReference, type CustomTaskSpec } from '../../exercises/exercises';
import { fmt } from '../../i18n/dictionary';

export interface CustomTaskText {
  customTaskTitle: string;
  customPrompt: string;
  customHint: string;
  modeTable: string;
  modeVerilog: string;
  customInputs: string;
  customOutputs: string;
  clickCells: string;
  referenceLabel: string;
  addTask: string;
  taskError: string;
  badNames: string;
  noPorts: string;
}

const NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
const SAMPLE = `module detect (
    input  logic clk,
    input  logic reset,
    input  logic x,
    output logic z
);
    // z = 1 when the last two inputs were both 1
    logic prev;
    always_ff @(posedge clk) begin
        if (reset) prev <= 1'b0;
        else prev <= x;
    end
    assign z = prev & x;
endmodule
`;

/**
 * A teacher writes one task: either a truth table (the reference module is
 * generated from it) or a correct Verilog module. The reference is checked
 * to compile before the task can be added.
 */
export function CustomTaskEditor({ text, onAdd, field, fieldStyle }: { text: CustomTaskText; onAdd: (t: CustomTaskSpec) => void; field: string; fieldStyle: React.CSSProperties }) {
  const [mode, setMode] = useState<'table' | 'verilog'>('table');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [hint, setHint] = useState('');
  const [ins, setIns] = useState('a b c');
  const [outs, setOuts] = useState('y');
  const [cells, setCells] = useState<Record<string, number>>({});
  const [reference, setReference] = useState(SAMPLE);
  const [error, setError] = useState('');

  const inputs = useMemo(() => ins.trim().split(/[\s,]+/).filter(Boolean), [ins]);
  const outputs = useMemo(() => outs.trim().split(/[\s,]+/).filter(Boolean), [outs]);
  const namesOk = inputs.length >= 1 && inputs.length <= 5 && outputs.length >= 1 && outputs.length <= 4 && [...inputs, ...outputs].every((n) => NAME.test(n)) && new Set([...inputs, ...outputs]).size === inputs.length + outputs.length;
  const rows = namesOk ? 1 << inputs.length : 0;

  const add = () => {
    if (!title.trim()) return setError(fmt(text.taskError, { msg: text.customTaskTitle }));
    let ref = reference;
    if (mode === 'table') {
      if (!namesOk) return setError(fmt(text.taskError, { msg: text.badNames }));
      const table = Array.from({ length: rows }, (_, m) => outputs.map((o) => cells[`${m}:${o}`] ?? 0));
      ref = tableReference('task', inputs, outputs, table);
    }
    try {
      const e = compileVerilog(ref);
      if (e.transpileError) throw new Error(e.transpileError);
      if (!e.inputs.length || !e.outputs.length) throw new Error(text.noPorts);
    } catch (err) {
      return setError(fmt(text.taskError, { msg: (err as Error).message }));
    }
    const auto = mode === 'table' ? `${inputs.join(', ')} → ${outputs.join(', ')}` : '';
    onAdd({ title: title.trim(), prompt: prompt.trim() || auto, hint: hint.trim(), reference: ref });
    setError('');
    setTitle('');
    setPrompt('');
    setHint('');
    setCells({});
  };

  const tab = (m: 'table' | 'verilog', label: string) => (
    <button type="button" data-testid={`cls-custom-mode-${m}`} onClick={() => setMode(m)} aria-pressed={mode === m} className="h-8 px-3 rounded-[0.25rem] border text-[0.75rem]" style={{ borderColor: mode === m ? 'var(--accent-primary)' : 'var(--border-subtle)', backgroundColor: mode === m ? 'var(--accent-subtle)' : undefined }}>{label}</button>
  );

  return (
    <div data-testid="cls-custom-editor" className="flex flex-col gap-2.5 p-3 rounded-[0.375rem] border" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
          {text.customTaskTitle}
          <input data-testid="cls-custom-title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} style={fieldStyle} />
        </label>
        <label className="flex flex-col gap-1 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
          {text.customHint}
          <input value={hint} onChange={(e) => setHint(e.target.value)} className={field} style={fieldStyle} />
        </label>
        <label className="sm:col-span-2 flex flex-col gap-1 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
          {text.customPrompt}
          <input data-testid="cls-custom-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} className={field} style={fieldStyle} />
        </label>
      </div>
      <div className="flex gap-2">{tab('table', text.modeTable)}{tab('verilog', text.modeVerilog)}</div>
      {mode === 'table' ? (
        <>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
              {text.customInputs}
              <input data-testid="cls-custom-inputs" value={ins} onChange={(e) => { setIns(e.target.value); setCells({}); }} className={`${field} font-mono`} style={fieldStyle} />
            </label>
            <label className="flex flex-col gap-1 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
              {text.customOutputs}
              <input data-testid="cls-custom-outputs" value={outs} onChange={(e) => { setOuts(e.target.value); setCells({}); }} className={`${field} font-mono`} style={fieldStyle} />
            </label>
          </div>
          {namesOk ? (
            <>
              <p className="text-[0.7188rem]" style={{ color: 'var(--text-muted)' }}>{text.clickCells}</p>
              <div className="overflow-x-auto max-h-[18rem] overflow-y-auto">
                <table data-testid="cls-custom-table" className="text-[0.75rem] font-mono border-collapse">
                  <thead>
                    <tr>
                      {inputs.map((n) => <th key={n} className="px-2 py-1 text-left" style={{ color: 'var(--text-muted)' }}>{n}</th>)}
                      {outputs.map((n) => <th key={n} className="px-2 py-1 text-left" style={{ color: 'var(--accent-primary)' }}>{n}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: rows }, (_, m) => (
                      <tr key={m} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        {inputs.map((n, k) => <td key={n} className="px-2 py-0.5">{(m >> (inputs.length - 1 - k)) & 1}</td>)}
                        {outputs.map((o) => {
                          const v = cells[`${m}:${o}`] ?? 0;
                          return (
                            <td key={o} className="px-1 py-0.5">
                              <button type="button" data-testid={`cls-cell-${m}-${o}`} onClick={() => setCells((c) => ({ ...c, [`${m}:${o}`]: v ? 0 : 1 }))} className="w-7 h-6 rounded-[0.1875rem] border font-bold" style={{ borderColor: 'var(--border-subtle)', backgroundColor: v ? 'var(--accent-primary)' : 'transparent', color: v ? '#fff' : 'var(--text-primary)' }}>{v}</button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-[0.7188rem]" style={{ color: '#d97706' }}>{text.badNames}</p>
          )}
        </>
      ) : (
        <label className="flex flex-col gap-1 text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>
          {text.referenceLabel}
          <textarea data-testid="cls-custom-reference" value={reference} onChange={(e) => setReference(e.target.value)} rows={12} spellCheck={false} className="px-2.5 py-1.5 rounded-[0.25rem] border text-[0.75rem] font-mono" style={fieldStyle} />
        </label>
      )}
      {error && <p data-testid="cls-custom-error" className="text-[0.75rem]" style={{ color: '#ef4444' }}>{error}</p>}
      <div>
        <button type="button" data-testid="cls-custom-add" onClick={add} className="h-8 px-3 rounded-[0.25rem] border text-[0.8125rem] flex items-center gap-1.5" style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}><Plus size={14} /> {text.addTask}</button>
      </div>
    </div>
  );
}
