import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Monitor, Play, Square } from 'lucide-react';
import { useBoardStore, ps2, vga } from '../../store/boardStore';
import { PS2_HALF_OPTIONS, hexByte, ps2Cycles, ps2Enqueue, scanCodes, tapCodes } from '../../core/peripherals/ps2Keyboard';
import { vgaPreview } from '../../core/peripherals/vgaMonitor';
import { useT } from '../../i18n/toolText';

/** On-screen keys for touch screens (KeyboardEvent.code, label). */
const SOFT_KEYS: Array<[string, string]> = [
  ['Escape', 'Esc'], ['Enter', '⏎'], ['Space', '␣'], ['Backspace', '⌫'],
  ['ArrowLeft', '←'], ['ArrowUp', '↑'], ['ArrowDown', '↓'], ['ArrowRight', '→'],
];

/** KeyboardEvent.code for a typed character, for the "type text" box. */
function codeForChar(ch: string): string | null {
  if (/^[a-z]$/i.test(ch)) return `Key${ch.toUpperCase()}`;
  if (/^[0-9]$/.test(ch)) return `Digit${ch}`;
  const map: Record<string, string> = { ' ': 'Space', '\n': 'Enter', '-': 'Minus', '=': 'Equal', ',': 'Comma', '.': 'Period', '/': 'Slash', ';': 'Semicolon', "'": 'Quote', '[': 'BracketLeft', ']': 'BracketRight' };
  return map[ch] ?? null;
}

/**
 * The DE2's VGA and PS/2 connectors: a monitor that rebuilds the picture
 * from VGA_HS/VGA_VS/VGA_R/G/B, and a keyboard that sends real scan codes
 * on PS2_CLK/PS2_DAT. Both run on the same simulation as the board.
 */
export function VgaPs2Panel() {
  const t = useT();
  const engine = useBoardStore((s) => s.engine);
  const runFast = useBoardStore((s) => s.runFast);
  const compileState = useBoardStore((s) => s.compileState);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [progress, setProgress] = useState(0);
  const stopRef = useRef(false);
  const [sent, setSent] = useState<number[]>([]);
  const [half, setHalf] = useState(ps2.half);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const hasVga = !!engine && engine.outputs.some((o) => /^VGA_HS$/i.test(o)) && engine.outputs.some((o) => /^VGA_VS$/i.test(o));
  const hasPs2 = !!engine && engine.inputs.some((i) => /^PS2_CLK$/i.test(i));
  const ready = compileState === 'ready';

  const paint = useCallback(() => {
    const frame = vgaPreview(vga);
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!frame) {
      setInfo(vga.seen ? t('Waiting for a vertical sync pulse…') : '');
      return;
    }
    if (canvas.width !== frame.width || canvas.height !== frame.height) {
      canvas.width = frame.width;
      canvas.height = frame.height;
    }
    canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(frame.pixels), frame.width, frame.height), 0, 0);
    const crop = frame.crop === 'standard' ? t('standard 640×480 timing') : frame.crop === 'blank' ? t('visible area from VGA_BLANK') : t('whole signal incl. blanking');
    setInfo(`${frame.width}×${frame.height} · ${crop} · ${frame.lineCycles} ${t('cycles per line')}, ${frame.lines} ${t('lines')} · ${vga.frames} ${t('frames')}`);
  }, [t]);

  // Repaint while the board runs normally (the monitor samples every tick).
  useEffect(() => {
    let seen = -1;
    const id = window.setInterval(() => {
      if (vga.version !== seen) {
        seen = vga.version;
        paint();
      }
      setSent((s) => (s.length === ps2.sent.length && s[s.length - 1] === ps2.sent[ps2.sent.length - 1] ? s : [...ps2.sent]));
    }, 250);
    return () => window.clearInterval(id);
  }, [paint]);

  useEffect(() => () => { stopRef.current = true; }, []);

  const drawFrame = () => {
    if (!ready || drawing) return;
    stopRef.current = false;
    setDrawing(true);
    // From reset the first vertical sync ends a frame that did not start at a
    // sync pulse. With VGA_BLANK the visible area is still found in it;
    // without, the picture is only placed right from the second frame on.
    const blanks = engine?.outputs.some((o) => /^VGA_BLANK(_N)?$/i.test(o));
    const target = vga.frames + (vga.frames === 0 && !blanks ? 2 : 1);
    const budget = 4_000_000;
    let done = 0;
    let chunk = 20_000;
    const step = () => {
      if (stopRef.current || vga.frames >= target || done >= budget) {
        setDrawing(false);
        setProgress(0);
        paint();
        return;
      }
      const t0 = performance.now();
      runFast(chunk);
      done += chunk;
      const dt = performance.now() - t0;
      // Aim for ~50 ms of work per animation frame.
      chunk = Math.max(2_000, Math.min(200_000, Math.round(chunk * (50 / Math.max(1, dt)))));
      const expected = Math.max(1, (vga.frame?.lineCycles ?? 1600) * (vga.frame?.lines ?? 525));
      setProgress(Math.min(0.99, (vga.rows.length * (vga.frame?.lineCycles ?? 1600)) / expected));
      paint();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const send = (bytes: number[] | null) => {
    if (!bytes || !ready) return;
    ps2Enqueue(ps2, bytes);
    // Run just long enough for the bytes to go out, at once.
    runFast(ps2Cycles(ps2.queue.length + (ps2.frame ? 1 : 0), ps2.half));
    setSent([...ps2.sent]);
  };
  const onKey = (e: React.KeyboardEvent, release: boolean) => {
    const codes = scanCodes(e.code, release);
    if (!codes) return;
    e.preventDefault();
    if (!release && e.repeat) return;
    send(codes);
  };
  const typeText = () => {
    const bytes: number[] = [];
    for (const ch of text) {
      const code = codeForChar(ch);
      const tap = code ? tapCodes(code) : null;
      if (tap) bytes.push(...tap);
    }
    send(bytes);
    setText('');
  };

  const btn = 'flex items-center gap-1 px-2 min-h-7 rounded-[0.25rem] border text-[0.6875rem] disabled:opacity-40';
  const btnStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' };
  const field = 'px-1.5 min-h-7 rounded-[0.25rem] border text-[0.6875rem]';
  const fieldStyle = { borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-input)' };
  const muted = { color: 'var(--text-muted)' };

  return (
    <div data-testid="vga-ps2-panel" className="h-full overflow-auto p-2 grid gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] font-sans text-[0.75rem]">
      <section className="flex flex-col gap-2 min-w-0">
        <h3 className="flex items-center gap-1.5 font-semibold"><Monitor size={14} /> VGA</h3>
        {!hasVga ? (
          <p style={muted}>{t('The design has no VGA_HS / VGA_VS outputs. Try the DE2 VGA Test Pattern example.')}</p>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {!drawing ? (
                <button type="button" data-testid="vga-draw" className={btn} style={btnStyle} disabled={!ready} onClick={drawFrame}><Play size={12} /> {t('Draw frame')}</button>
              ) : (
                <button type="button" data-testid="vga-stop" className={btn} style={btnStyle} onClick={() => { stopRef.current = true; }}><Square size={12} /> {t('Stop')}</button>
              )}
              {drawing && (
                <span className="flex-1 min-w-[6rem] h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
                  <span className="block h-full" style={{ width: `${progress * 100}%`, backgroundColor: 'var(--accent-primary)' }} />
                </span>
              )}
            </div>
            <canvas ref={canvasRef} data-testid="vga-canvas" width={640} height={480} className="w-full max-w-[640px] rounded-[0.25rem] border" style={{ aspectRatio: '4 / 3', imageRendering: 'pixelated', backgroundColor: '#000', borderColor: 'var(--border-subtle)' }} />
            <p data-testid="vga-info" className="font-mono text-[0.6875rem]" style={muted}>{info || t('One 640×480 frame is 840 000 clock cycles; Draw frame runs them as fast as the browser allows.')}</p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 min-w-0">
        <h3 className="flex items-center gap-1.5 font-semibold"><Keyboard size={14} /> {t('PS/2 keyboard')}</h3>
        {!hasPs2 ? (
          <p style={muted}>{t('The design has no PS2_CLK / PS2_DAT inputs. Try the DE2 PS/2 Keyboard example.')}</p>
        ) : (
          <>
            <div
              data-testid="ps2-keyboard"
              tabIndex={0}
              role="textbox"
              aria-label={t('PS/2 keyboard: click and type')}
              onKeyDown={(e) => onKey(e, false)}
              onKeyUp={(e) => onKey(e, true)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="rounded-[0.375rem] border-2 border-dashed px-3 py-4 text-center cursor-text outline-none"
              style={{ borderColor: focused ? 'var(--accent-primary)' : 'var(--border-subtle)', backgroundColor: focused ? 'var(--accent-subtle)' : 'transparent' }}
            >
              {focused ? t('Typing goes to the board — make and break codes are sent') : t('Click here, then type')}
            </div>
            <div className="flex flex-wrap gap-1">
              {SOFT_KEYS.map(([code, label]) => (
                <button key={code} type="button" data-testid={`ps2-soft-${code}`} className={`${btn} min-w-8 justify-center font-mono`} style={btnStyle} disabled={!ready} onClick={() => send(tapCodes(code))}>{label}</button>
              ))}
            </div>
            <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); typeText(); }}>
              <input data-testid="ps2-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Type text to send')} className={`${field} flex-1 min-w-0`} style={fieldStyle} />
              <button type="submit" className={btn} style={btnStyle} disabled={!ready || !text}>{t('Send')}</button>
            </form>
            <label className="flex items-center gap-1.5" style={muted}>
              {t('PS2_CLK half period')}
              <select value={half} onChange={(e) => { const v = Number(e.target.value); ps2.half = v; setHalf(v); }} className={field} style={fieldStyle}>
                {PS2_HALF_OPTIONS.map((h) => <option key={h} value={h}>{h} {t('cycles')}</option>)}
              </select>
            </label>
            <div>
              <p style={muted}>{t('Bytes sent (newest last)')}</p>
              <p data-testid="ps2-sent" className="font-mono break-all">{sent.length ? sent.slice(-24).map(hexByte).join(' ') : '—'}</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
