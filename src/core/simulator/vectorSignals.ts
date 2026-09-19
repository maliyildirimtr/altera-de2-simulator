/**
 * Bit-level access to the simulator's signal state.
 *
 * ── The problem this solves ───────────────────────────────────────────────
 * The engine stores a vector under its BARE name as a packed integer. A design
 * declaring
 *
 *     output [6:0] HEX0;
 *     assign HEX0 = 7'b1000000;
 *
 * produces `state['HEX0'] === 64`. It does NOT produce `state['HEX0[0]']`.
 *
 * Pin mappings, however, are per-pin: a .qsf assigns seven physical pins with
 * seven separate `-to HEX0[0]` … `-to HEX0[6]` lines, so the mapping layer asks
 * for `HEX0[0]` and friends. Reading those keys straight out of the state map
 * returns `undefined` for every bit of every vector in the design.
 *
 * That is invisible for an active-HIGH output — an LED that should be off is
 * off — but catastrophic for an active-LOW one. Coercing the missing value to
 * 0 lights a seven-segment segment, so every vector-driven HEX display reads
 * "8" regardless of what the design computed. Seven independent scalar outputs
 * mapped to the same pins work perfectly, because their names are in the state
 * map verbatim.
 *
 * ── The contract ─────────────────────────────────────────────────────────
 * `readSignal` resolves a possibly bit-indexed name from either representation
 * and returns `undefined` — never 0 — when the signal genuinely is not in the
 * state. Callers decide what an unknown signal means for their own hardware,
 * which is the only way active-low outputs can be handled honestly.
 *
 * Nothing here knows about the DE2, LEDs or displays. It is bit arithmetic over
 * a name and a state map, and it applies to any HDL vector.
 */

export interface BitRef {
  /** The vector's name, without the index. */
  base: string;
  /** Which bit, counted from the LSB, as Verilog numbers `[n:0]`. */
  bit: number;
}

/**
 * Splits `"PORT[3]"` into its base and bit, or returns null for a plain name.
 *
 * Only a single-bit select is recognised. A range select (`PORT[7:4]`) is
 * deliberately NOT treated as a bit reference: it is a different thing, and
 * silently reading it as one bit would be worse than not resolving it.
 */
export function parseBitRef(name: string): BitRef | null {
  const match = /^(.+?)\s*\[\s*(\d+)\s*\]$/.exec(name.trim());
  if (!match) return null;
  const base = match[1].trim();
  if (!base) return null;
  return { base, bit: Number(match[2]) };
}

/** Extracts one bit from a packed value, or undefined if it is not a number. */
function bitOf(packed: number | undefined, bit: number): number | undefined {
  if (packed === undefined || !Number.isFinite(packed)) return undefined;
  // `>>>` on a truncated value, so a negative or fractional packed value
  // cannot produce a fractional or NaN bit.
  if (bit < 0 || bit > 31) return undefined;
  return (Math.trunc(packed) >>> bit) & 1;
}

/**
 * Reads a signal that may be a scalar, a flattened vector bit or a bit of a
 * packed vector.
 *
 * Resolution order, most specific first:
 *
 *   1. the exact name, so a design that really does declare `HEX0[0]`, or a
 *      graph evaluator that flattened it, wins outright;
 *   2. the underscore spelling `BASE_BIT`, which is how the bundled DE2
 *      examples declare segments (`HEX0_0`), so a .qsf written with brackets
 *      still finds a module written with underscores;
 *   3. the packed vector `BASE`, with the bit extracted.
 *
 * Returns undefined when the signal is absent. Callers must NOT default that
 * to 0 for an active-low output.
 */
export function readSignal(
  state: Record<string, number> | undefined,
  name: string,
): number | undefined {
  if (!state) return undefined;

  const direct = state[name];
  if (direct !== undefined) return direct;

  const ref = parseBitRef(name);
  if (!ref) return undefined;

  const flattened = state[`${ref.base}_${ref.bit}`];
  if (flattened !== undefined) return flattened;

  return bitOf(state[ref.base], ref.bit);
}

/**
 * Reads `width` consecutive bits of `base`, LSB first, so index 0 of the
 * result is `base[0]`. Entries are undefined where the bit is unresolvable.
 */
export function readVector(
  state: Record<string, number> | undefined,
  base: string,
  width: number,
): Array<number | undefined> {
  return Array.from({ length: Math.max(0, width) }, (_, bit) =>
    readSignal(state, `${base}[${bit}]`),
  );
}

/**
 * Writes a signal into an input map, packing it into the bare vector name when
 * the design declares the vector rather than the individual bit.
 *
 * This is the mirror image of `readSignal` and matters for the same reason: a
 * design declaring `input [17:0] SW` has one engine input called `SW`, so
 * setting `inputs['SW[0]']` drives nothing at all and every switch reads 0.
 *
 * `declared` is the set of names the engine actually accepts. When a vector is
 * packed, the first write for that vector seeds itself from `seed` so bits no
 * pin mapping covers keep their previous value — without that, mapping only
 * KEY0 would drive KEY1..KEY3 to 0, which for an active-low input means
 * "held down".
 */
export function writeSignal(
  inputs: Record<string, number>,
  declared: ReadonlySet<string> | undefined,
  name: string,
  value: number,
  seed?: Record<string, number>,
): void {
  // An exactly-declared name is unambiguous; nothing to resolve.
  if (!declared || declared.has(name)) {
    inputs[name] = value;
    return;
  }

  const ref = parseBitRef(name);
  if (!ref) {
    inputs[name] = value;
    return;
  }

  const underscore = `${ref.base}_${ref.bit}`;
  if (declared.has(underscore)) {
    inputs[underscore] = value;
    return;
  }

  if (declared.has(ref.base) && ref.bit >= 0 && ref.bit <= 31) {
    const current = inputs[ref.base] ?? Math.trunc(seed?.[ref.base] ?? 0);
    const mask = 1 << ref.bit;
    inputs[ref.base] = value ? current | mask : current & ~mask;
    return;
  }

  // Not a name the engine knows in any spelling. Keep the historical
  // behaviour rather than dropping it: a design may pick it up by another
  // route, and silently discarding a mapped pin would be its own bug.
  inputs[name] = value;
}
