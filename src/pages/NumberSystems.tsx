import { useMemo, useState } from 'react';
import { Binary } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { fmt } from '../i18n/dictionary';
import {
  analyze,
  BASES,
  binary,
  divisionSteps,
  group,
  parseIn,
  positionalTerms,
  toBase,
  twosComplementSteps,
  WIDTHS,
  type Base,
} from '../logic/numbers';

const TEXT = {
  en: {
    eyebrow: 'Tools',
    title: 'Number systems',
    lead: 'Type a number in any base to see it in binary, octal, decimal and hexadecimal, as an unsigned and a signed (two\'s complement) value, with the working step by step. Click a bit to flip it.',
    value: 'Value',
    base: 'Base',
    width: 'Bits',
    baseNames: { 2: 'Binary (2)', 8: 'Octal (8)', 10: 'Decimal (10)', 16: 'Hexadecimal (16)' } as Record<Base, string>,
    errEmpty: 'Type a number.',
    errDigit: 'That is not a valid digit in base {base}.',
    overflow: '{value} does not fit in {width} bits (range {min} … {umax}); only the lowest {width} bits are shown.',
    results: 'In every base',
    bin: 'Binary',
    oct: 'Octal',
    hex: 'Hexadecimal',
    udec: 'Decimal (unsigned)',
    sdec: 'Decimal (signed, two\'s complement)',
    bits: 'Bits',
    msb: 'MSB = sign bit when signed',
    range: 'In {width} bits: unsigned 0 … {umax}, signed {min} … {max}.',
    steps: 'Working',
    stepDiv: 'Decimal → binary: divide by 2, keep the remainders, read them bottom to top',
    dividend: 'Number',
    quotient: '÷ 2',
    remainder: 'Remainder',
    readUp: 'Read upwards: {bits}',
    stepPos: 'Binary → decimal: add the place values of the 1 bits',
    stepHex: 'Binary ↔ hexadecimal: every 4 bits make one hex digit',
    stepTwos: 'Negative numbers in two\'s complement: write the magnitude, invert every bit, add 1',
    magnitude: 'Magnitude {m}',
    invert: 'Invert',
    addOne: 'Add 1',
    signedNote: 'The leading 1 means negative: {bits} = −{m} as a signed number.',
  },
  tr: {
    eyebrow: 'Araçlar',
    title: 'Sayı sistemleri',
    lead: 'Herhangi bir tabanda sayı yaz; ikilik, sekizlik, onluk ve onaltılık karşılıklarını, işaretsiz ve işaretli (ikiye tümleyen) değerini ve çözümün adımlarını gör. Bir bite tıklayınca değeri değişir.',
    value: 'Değer',
    base: 'Taban',
    width: 'Bit',
    baseNames: { 2: 'İkilik (2)', 8: 'Sekizlik (8)', 10: 'Onluk (10)', 16: 'Onaltılık (16)' } as Record<Base, string>,
    errEmpty: 'Bir sayı yaz.',
    errDigit: '{base} tabanında geçerli bir rakam değil.',
    overflow: '{value}, {width} bite sığmaz (aralık {min} … {umax}); yalnızca en düşük {width} bit gösteriliyor.',
    results: 'Tüm tabanlarda',
    bin: 'İkilik',
    oct: 'Sekizlik',
    hex: 'Onaltılık',
    udec: 'Onluk (işaretsiz)',
    sdec: 'Onluk (işaretli, ikiye tümleyen)',
    bits: 'Bitler',
    msb: 'İşaretli sayıda en soldaki bit işaret bitidir',
    range: '{width} bitte: işaretsiz 0 … {umax}, işaretli {min} … {max}.',
    steps: 'Çözüm',
    stepDiv: 'Onluk → ikilik: 2\'ye böl, kalanları yaz, aşağıdan yukarı oku',
    dividend: 'Sayı',
    quotient: '÷ 2',
    remainder: 'Kalan',
    readUp: 'Aşağıdan yukarı: {bits}',
    stepPos: 'İkilik → onluk: 1 olan bitlerin basamak değerlerini topla',
    stepHex: 'İkilik ↔ onaltılık: her 4 bit bir onaltılık rakamdır',
    stepTwos: 'Negatif sayı (ikiye tümleyen): büyüklüğü yaz, bütün bitleri ters çevir, 1 ekle',
    magnitude: 'Büyüklük {m}',
    invert: 'Ters çevir',
    addOne: '1 ekle',
    signedNote: 'En soldaki 1 negatif demektir: {bits} işaretli sayı olarak −{m}.',
  },
};

export default function NumberSystems() {
  const { lang } = useI18n();
  const t = TEXT[lang];
  const [text, setText] = useState('45');
  const [base, setBase] = useState<Base>(10);
  const [width, setWidth] = useState<number>(8);

  const parsed = useMemo(() => parseIn(text, base), [text, base]);
  const a = useMemo(() => analyze(parsed.value, width), [parsed.value, width]);
  const bin = binary(a.bits, width);

  const setFromBits = (bits: bigint) => {
    // Keep the chosen base; decimal shows the signed value when the typed value was negative.
    const v = base === 10 && parsed.value < 0n ? analyze(bits, width).signed : bits;
    setText(base === 2 ? binary(bits, width) : toBase(v, base));
  };
  const flip = (i: number) => setFromBits(a.bits ^ (1n << BigInt(i)));

  const card = 'rounded-[0.5rem] border p-4';
  const cardStyle = { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' };
  const field = 'h-9 px-2.5 rounded-[0.25rem] border text-[0.875rem]';
  const fieldStyle = { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' };
  const mono = 'font-mono tabular-nums';

  const rows: Array<{ key: string; label: string; value: string }> = [
    { key: 'bin', label: t.bin, value: group(bin, 4) },
    { key: 'oct', label: t.oct, value: toBase(a.bits, 8) },
    { key: 'udec', label: t.udec, value: a.unsigned.toString() },
    { key: 'sdec', label: t.sdec, value: a.signed.toString() },
    { key: 'hex', label: t.hex, value: toBase(a.bits, 16).padStart(Math.ceil(width / 4), '0') },
  ];

  const negative = a.signed < 0n;
  const magnitude = negative ? -a.signed : a.signed;
  const terms = positionalTerms(a.bits, width);
  const div = divisionSteps(a.unsigned);
  const twos = negative ? twosComplementSteps(magnitude, width) : null;

  return (
    <div data-testid="numbers-page" className="absolute inset-0 overflow-y-auto" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 flex flex-col gap-5">
        <header>
          <p className="text-[0.75rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.eyebrow}</p>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2"><Binary size={22} style={{ color: 'var(--accent-primary)' }} /> {t.title}</h1>
          <p className="text-[0.9375rem] mt-1.5" style={{ color: 'var(--text-secondary)' }}>{t.lead}</p>
        </header>

        <section className={`${card} flex flex-wrap items-end gap-3`} style={cardStyle}>
          <label className="flex flex-col gap-1 text-[0.75rem] font-semibold flex-1 min-w-[12rem]">
            {t.value}
            <input data-testid="num-input" value={text} onChange={(e) => setText(e.target.value)} className={`${field} ${mono}`} style={fieldStyle} spellCheck={false} />
          </label>
          <label className="flex flex-col gap-1 text-[0.75rem] font-semibold">
            {t.base}
            <select data-testid="num-base" value={base} onChange={(e) => {
              const nb = Number(e.target.value) as Base;
              if (!parsed.error) setText(nb === 2 ? binary(a.bits, width) : nb === 10 && parsed.value < 0n ? a.signed.toString() : toBase(nb === 10 ? a.unsigned : a.bits, nb));
              setBase(nb);
            }} className={field} style={fieldStyle}>
              {BASES.map((b) => <option key={b} value={b}>{t.baseNames[b]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[0.75rem] font-semibold">
            {t.width}
            <select data-testid="num-width" value={width} onChange={(e) => setWidth(Number(e.target.value))} className={field} style={fieldStyle}>
              {WIDTHS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
        </section>

        {parsed.error ? (
          <p data-testid="num-error" className="text-[0.875rem]" style={{ color: '#ef4444' }}>
            {parsed.error === 'empty' ? t.errEmpty : fmt(t.errDigit, { base })}
          </p>
        ) : (
          <>
            {a.overflow && (
              <p data-testid="num-overflow" className="text-[0.8125rem]" style={{ color: '#d97706' }}>
                {fmt(t.overflow, { value: text.trim(), width, min: a.min.toString(), umax: a.umax.toString() })}
              </p>
            )}

            <section className={card} style={cardStyle}>
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>{t.bits}</h2>
              <div data-testid="num-bits" className="flex flex-wrap gap-1.5">
                {Array.from({ length: width }, (_, k) => width - 1 - k).map((i) => {
                  const on = ((a.bits >> BigInt(i)) & 1n) === 1n;
                  return (
                    <button key={i} type="button" data-testid={`num-bit-${i}`} onClick={() => flip(i)} className={`flex flex-col items-center rounded-[0.25rem] border px-1.5 py-1 min-w-[2.25rem] ${i % 4 === 0 && i ? 'mr-2' : ''}`}
                      style={{ borderColor: on ? '#22c55e' : 'var(--border-subtle)', backgroundColor: on ? 'rgba(34,197,94,0.12)' : 'var(--bg-app)' }} title={`2^${i} = ${(1n << BigInt(i)).toString()}`}>
                      <span className={`${mono} text-[1.0625rem] font-bold`} style={{ color: on ? '#16a34a' : 'var(--text-secondary)' }}>{on ? 1 : 0}</span>
                      <span className={`${mono} text-[0.625rem]`} style={{ color: 'var(--text-muted)' }}>{i}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[0.75rem] mt-2" style={{ color: 'var(--text-muted)' }}>
                {fmt(t.range, { width, umax: a.umax.toString(), min: a.min.toString(), max: a.max.toString() })} {t.msb}.
              </p>
            </section>

            <section className={card} style={cardStyle}>
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{t.results}</h2>
              <dl className="grid sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-[0.9375rem]">
                {rows.map((r) => (
                  <div key={r.key} className="contents">
                    <dt style={{ color: 'var(--text-secondary)' }}>{r.label}</dt>
                    <dd data-testid={`num-${r.key}`} className={`${mono} font-semibold break-all`}>{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className={`${card} flex flex-col gap-5`} style={cardStyle}>
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.steps}</h2>

              <div>
                <h3 className="text-[0.875rem] font-semibold mb-1.5">{t.stepDiv}</h3>
                <table data-testid="num-div" className={`${mono} text-[0.8125rem] border-collapse`}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)' }}>
                      <th className="px-3 py-0.5 text-right font-normal">{t.dividend}</th>
                      <th className="px-3 py-0.5 text-right font-normal">{t.quotient}</th>
                      <th className="px-3 py-0.5 text-right font-normal">{t.remainder}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {div.map(([n, q, r], i) => (
                      <tr key={i}>
                        <td className="px-3 py-0.5 text-right">{n.toString()}</td>
                        <td className="px-3 py-0.5 text-right">{q.toString()}</td>
                        <td className="px-3 py-0.5 text-right font-bold" style={{ color: '#16a34a' }}>{r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={`${mono} text-[0.8125rem] mt-1`}>{fmt(t.readUp, { bits: toBase(a.unsigned, 2) })}</p>
              </div>

              <div>
                <h3 className="text-[0.875rem] font-semibold mb-1.5">{t.stepPos}</h3>
                <p data-testid="num-pos" className={`${mono} text-[0.8125rem] break-words`}>
                  {terms.length ? terms.map((x) => `2^${x.power}`).join(' + ') : '0'}
                  {terms.length > 0 && <> = {terms.map((x) => x.weight.toString()).join(' + ')} = <b>{a.unsigned.toString()}</b></>}
                </p>
              </div>

              <div>
                <h3 className="text-[0.875rem] font-semibold mb-1.5">{t.stepHex}</h3>
                <div data-testid="num-hexgroups" className="flex flex-wrap gap-2">
                  {group(bin, 4).split(' ').map((nib, i) => (
                    <div key={i} className="flex flex-col items-center rounded-[0.25rem] border px-2 py-1" style={{ borderColor: 'var(--border-subtle)' }}>
                      <span className={`${mono} text-[0.8125rem]`}>{nib}</span>
                      <span className={`${mono} text-[1rem] font-bold`} style={{ color: 'var(--accent-primary)' }}>{parseInt(nib, 2).toString(16).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {twos && (
                <div data-testid="num-twos">
                  <h3 className="text-[0.875rem] font-semibold mb-1.5">{t.stepTwos}</h3>
                  <table className={`${mono} text-[0.8125rem] border-collapse`}>
                    <tbody>
                      <tr><td className="pr-4 py-0.5" style={{ color: 'var(--text-secondary)' }}>{fmt(t.magnitude, { m: magnitude.toString() })}</td><td>{group(twos.plain, 4)}</td></tr>
                      <tr><td className="pr-4 py-0.5" style={{ color: 'var(--text-secondary)' }}>{t.invert}</td><td>{group(twos.inverted, 4)}</td></tr>
                      <tr><td className="pr-4 py-0.5" style={{ color: 'var(--text-secondary)' }}>{t.addOne}</td><td className="font-bold" style={{ color: '#16a34a' }}>{group(twos.result, 4)}</td></tr>
                    </tbody>
                  </table>
                  <p className="text-[0.8125rem] mt-1" style={{ color: 'var(--text-secondary)' }}>{fmt(t.signedNote, { bits: group(bin, 4), m: magnitude.toString() })}</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
