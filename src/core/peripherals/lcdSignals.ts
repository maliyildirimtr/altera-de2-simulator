import type { ParsedPort } from '../../utils/parser/pinParser';
import type { LcdBusSignals } from './lcdController';

/**
 * Bridges the compiled design's output signals to the LCD controller's bus.
 *
 * ── Why this is separate from the controller ──────────────────────────────
 * `lcdController.ts` knows about HD44780 commands and nothing else — no pin
 * mappings, no store, no port-name conventions. This module is the adapter:
 * it knows how this project names DE2 signals and how to find them in a
 * simulation state, and it hands the controller a plain byte and four levels.
 * Keeping the two apart is what lets the command decoder be unit-tested
 * against bus transactions rather than against a Verilog design.
 *
 * ── Signal names ─────────────────────────────────────────────────────────
 * Standard DE2 names, in both spellings the rest of this project accepts:
 *
 *   LCD_DATA[7:0]   or  LCD_DATA0..LCD_DATA7
 *   LCD_EN, LCD_RS, LCD_RW, LCD_ON, LCD_BLON
 *
 * Resolution follows the same two-step the rest of `runSimulationCycle` uses:
 * a pin mapping's `virtualComponent` wins, and a port whose own name is an LCD
 * signal is accepted directly. That second path is what makes the flattened
 * scalar style the bundled examples are written in (`output LCD_EN`) work with
 * no .qsf at all.
 */

/** Canonical LCD control signals, excluding the data bus. */
export const LCD_CONTROL_SIGNALS = ['LCD_EN', 'LCD_RS', 'LCD_RW', 'LCD_ON', 'LCD_BLON'] as const;

export type LcdControlSignal = (typeof LCD_CONTROL_SIGNALS)[number];

/**
 * Normalises one signal name to its canonical DE2 form, or null if it is not
 * an LCD signal. Accepts `LCD_DATA[3]`, `LCD_DATA3` and `lcd_data_3`.
 */
export function normaliseLcdSignal(name: string): string | null {
  const upper = name.toUpperCase();

  const data = upper.match(/^LCD_?DATA\D*(\d+)\]?$/);
  if (data) {
    const bit = Number(data[1]);
    return bit >= 0 && bit <= 7 ? `LCD_DATA[${bit}]` : null;
  }

  const control = upper.replace(/[^A-Z0-9_]/g, '');
  for (const signal of LCD_CONTROL_SIGNALS) {
    if (control === signal || control === signal.replace('_', '')) return signal;
  }
  return null;
}

/** True when any port in the design looks like an LCD signal. */
export function hasLcdInterface(
  pinMappings: readonly ParsedPort[],
  engineOutputs?: readonly string[],
): boolean {
  for (const mapping of pinMappings) {
    if (mapping.virtualComponent && normaliseLcdSignal(mapping.virtualComponent)) return true;
    if (normaliseLcdSignal(mapping.portName)) return true;
  }
  for (const name of engineOutputs ?? []) {
    if (normaliseLcdSignal(name)) return true;
  }
  return false;
}

/**
 * Reads the LCD bus out of a simulation state.
 *
 * Returns null when the design drives no LCD signals at all, which the caller
 * uses to leave the panel alone entirely. That is the difference between "this
 * design has a blank display" and "this design has no display" — the second
 * must not advance the controller, or an undriven bus would look like a stream
 * of enable edges writing zeros.
 */
export function collectLcdBus(
  simState: Record<string, number>,
  pinMappings: readonly ParsedPort[],
): LcdBusSignals | null {
  const values = new Map<string, number>();

  const record = (signal: string | null, value: number | undefined): void => {
    if (!signal || value === undefined) return;
    values.set(signal, value ? 1 : 0);
  };

  // Mapped ports first: the pin mapping is the user's explicit intent.
  for (const mapping of pinMappings) {
    const signal =
      (mapping.virtualComponent && normaliseLcdSignal(mapping.virtualComponent)) ||
      normaliseLcdSignal(mapping.portName);
    record(signal, simState[mapping.portName]);
  }

  // Then ports that are themselves named like DE2 signals.
  for (const [name, value] of Object.entries(simState)) {
    const signal = normaliseLcdSignal(name);
    if (signal && !values.has(signal)) record(signal, value);
  }

  if (values.size === 0) return null;

  let data = 0;
  for (let bit = 0; bit < 8; bit += 1) {
    if (values.get(`LCD_DATA[${bit}]`)) data |= 1 << bit;
  }

  return {
    data,
    en: values.get('LCD_EN') ?? 0,
    rs: values.get('LCD_RS') ?? 0,
    rw: values.get('LCD_RW') ?? 0,
    // LCD_ON and LCD_BLON default HIGH when the design does not drive them:
    // on the real board they are tied through pull-ups on most reference
    // designs, and a teaching example that only drives EN/RS/DATA should still
    // light its display rather than appear broken.
    on: values.has('LCD_ON') ? (values.get('LCD_ON') ?? 0) : 1,
    blon: values.has('LCD_BLON') ? (values.get('LCD_BLON') ?? 0) : 1,
  };
}
