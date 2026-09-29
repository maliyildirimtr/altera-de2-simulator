import { useMemo } from 'react';
import { X } from 'lucide-react';
import {
  DE2_BANKS,
  de2Assignment,
  de2Banks,
  ioNodes,
  parseDe2,
  signalWidths,
  type Circuit,
  type De2Bank,
  type De2Slot,
  type GateNode,
} from '../../gates/circuit';
import { fmt } from '../../i18n/dictionary';

type Bank = Exclude<De2Bank, 'CLOCK_50'>;

export interface PinDialogText {
  pinTitle: string;
  pinLead: string;
  pinPart: string;
  pinPlace: string;
  pinAuto: string;
  pinAutoNow: string;
  pinAllAuto: string;
  pinConflict: string;
  pinNoRoom: string;
  pinClock: string;
  pinBoard: string;
  close: string;
  openDe2: string;
}

const placeText = (slot: De2Slot | null | undefined) =>
  !slot ? '—' : slot.bank === 'CLOCK_50' ? 'CLOCK_50' : slot.width > 1 ? `${slot.bank}${slot.start + slot.width - 1}..${slot.start}` : `${slot.bank}${slot.start}`;

/**
 * Where each input, output and 7-segment display of a gate design goes on the
 * DE2 board. The choice is stored on the part (GateNode.de2) and used by the
 * DE2 Verilog; parts left on automatic fill the first free places.
 */
export function De2PinDialog({ circuit, flat, text, onChange, onAllAuto, onClose, onRun }: {
  /** The drawn circuit (its parts carry the choices). */
  circuit: Circuit;
  /** The circuit the simulator runs (for bus widths through blocks). */
  flat: Circuit;
  text: PinDialogText;
  onChange: (id: string, place: string | undefined) => void;
  onAllAuto: () => void;
  onClose: () => void;
  onRun: () => void;
}) {
  const widths = useMemo(() => signalWidths(flat).widths, [flat]);
  const slots = useMemo(() => de2Assignment(circuit, widths), [circuit, widths]);
  const { ins, outs, displays } = ioNodes(circuit);
  const parts = [...ins, ...outs, ...displays];

  // Which part uses each place, for the board overview.
  const owner: Record<string, string> = {};
  for (const n of parts) {
    const s = slots[n.id];
    if (!s || s.bank === 'CLOCK_50') continue;
    for (let k = 0; k < s.width; k++) owner[`${s.bank}${s.start + k}`] = n.label || n.type;
  }

  const options = (n: GateNode, width: number) =>
    de2Banks(n).flatMap((bank) => Array.from({ length: DE2_BANKS[bank] - width + 1 }, (_, k) => ({ bank, start: k })));

  const Row = ({ bank }: { bank: Bank }) => (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-[0.6875rem] font-semibold" style={{ color: 'var(--text-muted)' }}>{bank}</span>
      <div className="flex flex-wrap gap-0.5" style={{ flexDirection: 'row-reverse', justifyContent: 'flex-end' }}>
        {Array.from({ length: DE2_BANKS[bank] }, (_, k) => {
          const who = owner[`${bank}${k}`];
          return (
            <span key={k} title={`${bank}${k}${who ? ` = ${who}` : ''}`} data-pin={`${bank}${k}`} data-owner={who}
              className="w-[1.625rem] h-[1.375rem] rounded-[0.1875rem] border text-[0.5625rem] flex flex-col items-center justify-center leading-none font-mono"
              style={{ borderColor: who ? 'var(--accent-primary)' : 'var(--border-subtle)', backgroundColor: who ? 'var(--accent-subtle)' : 'transparent', color: who ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              <span>{k}</span>
              {who && <span className="max-w-[1.5rem] truncate" style={{ fontSize: '0.5rem' }}>{who}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onPointerDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={text.pinTitle} data-testid="gate-pin-dialog" onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-[46rem] max-h-[90vh] overflow-auto rounded-[0.5rem] border shadow-xl p-4 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
        <div className="flex items-center gap-2">
          <h2 className="text-[0.9375rem] font-bold">{text.pinTitle}</h2>
          <button type="button" aria-label={text.close} className="ml-auto p-1 rounded hover:bg-[var(--bg-hover)]" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="text-[0.75rem]" style={{ color: 'var(--text-secondary)' }}>{text.pinLead}</p>
        <table className="w-full text-[0.8125rem]">
          <thead>
            <tr className="text-left text-[0.6875rem] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <th className="py-1">{text.pinPart}</th>
              <th className="py-1">{text.pinPlace}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {parts.map((n) => {
              const slot = slots[n.id];
              const width = slot?.width ?? 1;
              const chosen = parseDe2(n.de2);
              const conflict = !!n.de2 && !!slot && !slot.chosen;
              return (
                <tr key={n.id} data-pin-row={n.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td className="py-1.5 pr-2">
                    <span className="font-mono font-semibold">{n.label || n.type}</span>
                    <span className="ml-1.5 text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{n.type}{width > 1 ? ` · ${width} bit` : ''}</span>
                  </td>
                  <td className="py-1.5 pr-2">
                    {n.type === 'CLK' ? (
                      <span className="text-[0.75rem] font-mono">{text.pinClock}</span>
                    ) : (
                      <select data-testid={`gate-pin-${n.label || n.id}`} value={chosen ? `${chosen.bank}${chosen.index}` : ''} onChange={(e) => onChange(n.id, e.target.value || undefined)}
                        className="h-8 px-2 rounded-[0.25rem] border text-[0.8125rem] font-mono" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
                        <option value="">{slot && !slot.chosen ? fmt(text.pinAutoNow, { place: placeText(slot) }) : text.pinAuto}</option>
                        {options(n, width).map((o) => {
                          const label = placeText({ bank: o.bank, start: o.start, width, chosen: true });
                          return <option key={`${o.bank}${o.start}`} value={`${o.bank}${o.start}`}>{label}</option>;
                        })}
                      </select>
                    )}
                  </td>
                  <td className="py-1.5 text-[0.6875rem]" style={{ color: conflict || !slot ? '#d97706' : 'var(--text-muted)' }}>
                    {!slot ? text.pinNoRoom : conflict ? text.pinConflict : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-col gap-1.5 p-2 rounded-[0.375rem] border" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{text.pinBoard}</span>
          {(['SW', 'KEY', 'LEDR', 'LEDG', 'HEX'] as Bank[]).map((b) => <Row key={b} bank={b} />)}
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" data-testid="gate-pin-auto" className="px-3 h-8 rounded-[0.25rem] border text-xs" style={{ borderColor: 'var(--border-subtle)' }} onClick={onAllAuto}>{text.pinAllAuto}</button>
          <button type="button" className="px-3 h-8 rounded-[0.25rem] border text-xs" style={{ borderColor: 'var(--border-subtle)' }} onClick={onClose}>{text.close}</button>
          <button type="button" data-testid="gate-pin-run" className="px-3 h-8 rounded-[0.25rem] text-xs text-white" style={{ backgroundColor: 'var(--accent-primary)' }} onClick={onRun}>{text.openDe2}</button>
        </div>
      </div>
    </div>
  );
}
