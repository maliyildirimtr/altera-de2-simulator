import { Parser } from './expression/parser';
import { createSafeState, evaluateExpr } from './expression/evaluator';

/**
 * Named constants (`localparam` / `parameter`) for the Verilog engine.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * The engine had no notion of a named constant. An identifier it did not know
 * resolved to 0, so
 *
 *     localparam int LAST_STEP = 62;
 *     if (step < LAST_STEP) step <= step + 1;
 *
 * silently became `if (step < 0)` — never true, so the counter never advanced
 * and the design sat dead with no compile error to explain it. That is how the
 * bundled LCD example ended up holding LCD_EN high forever and never writing a
 * single character.
 *
 * ── How it is resolved ────────────────────────────────────────────────────
 * NOT by text substitution. Rewriting `LAST_STEP` into `62` across a module
 * body with a regex would eventually corrupt a longer identifier that happens
 * to contain a constant's name, and there is no reliable way to know whether a
 * match is a whole token without doing the tokenisation properly — at which
 * point one may as well use the parser that already exists.
 *
 * So instead: declarations are COLLECTED here, each right-hand side is parsed
 * with the engine's own expression `Parser` and evaluated with its own
 * `evaluateExpr`, and the results are handed to the evaluator as a base layer
 * of the state. Identifier resolution then finds them by the same path it
 * finds a wire, and no expression text is ever rewritten. A constant cannot
 * affect a comment, a string, or a name it merely appears inside.
 *
 * Because the values are ordinary numbers in the state, every context works
 * without special handling: comparisons (`step < LAST_STEP`), arithmetic
 * (`WIDTH - 1`), case items (`LIMIT:`), bit widths in expressions, and so on.
 *
 * ── Failure is loud ───────────────────────────────────────────────────────
 * A declaration whose value cannot be resolved at compile time is a hard
 * error, not a 0. Silently defaulting is what made the original bug so hard to
 * see, and a design that runs with the wrong constant is worse than one that
 * refuses to compile.
 */

/** Thrown for a declaration this layer cannot resolve. Carries the name. */
export class NamedConstantError extends Error {
  /** The constant that could not be resolved. */
  readonly constantName: string;

  constructor(message: string, constantName: string) {
    super(message);
    this.name = 'NamedConstantError';
    // Assigned in the body rather than as a parameter property: this project
    // compiles with `erasableSyntaxOnly`, which forbids the shorthand.
    this.constantName = constantName;
  }
}

/**
 * Finds `localparam` / `parameter` declarations and returns each name with its
 * right-hand side as TEXT, unevaluated.
 *
 * Using a regex to *locate* declarations is safe in a way that using one to
 * substitute values is not: a false positive here produces a clear error from
 * the parser rather than silently corrupting an unrelated expression. Comments
 * are already stripped before this runs (`compileVerilog` removes them), so
 * neither `//` nor block comments can contribute a match.
 *
 * Accepted forms, with or without a type and with or without a width:
 *
 *     localparam LAST = 62;
 *     localparam int LAST = 62;
 *     localparam [6:0] LIMIT = 7'd62;
 *     localparam logic [7:0] MASK = 8'hFF;
 *     parameter DEPTH = 16;
 *     parameter int DEPTH = 16;
 *     localparam A = 1, B = A + 1;
 *
 * A parameter port list (`module m #(parameter W = 8) (...)`) is NOT handled
 * here: the module header regex in `compileVerilog` does not accept one, so
 * such a module never reaches this code. That is a separate, larger change.
 */
export function collectNamedConstants(body: string): Record<string, string> {
  const found: Record<string, string> = {};

  // localparam / parameter, optional type keywords, optional packed width,
  // then everything up to the semicolon.
  const declRegex =
    /\b(?:localparam|parameter)\b[ \t]*(?:(?:int|integer|longint|shortint|byte|logic|bit|reg|wire|signed|unsigned)\b[ \t]*)*(?:\[[^\]]*\][ \t]*)?([^;]+);/g;

  for (let m = declRegex.exec(body); m; m = declRegex.exec(body)) {
    for (const decl of splitTopLevel(m[1])) {
      const eq = decl.indexOf('=');
      if (eq === -1) continue; // a declaration with no value is not a constant
      const name = decl.slice(0, eq).trim();
      const expr = decl.slice(eq + 1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(name)) continue;
      if (!expr) {
        throw new NamedConstantError(
          `Named constant '${name}' has no value. Write e.g. 'localparam ${name} = 8;'.`,
          name,
        );
      }
      found[name] = expr;
    }
  }

  return found;
}

/**
 * Splits a comma-separated declaration list, ignoring commas nested inside
 * brackets or braces so `localparam A = f(1,2), B = 3;` and concatenations
 * survive.
 */
function splitTopLevel(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i += 1) {
    const ch = list[i];
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    else if (ch === ',' && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Resolves a table of constant expressions to numbers.
 *
 * Constants may refer to other constants, so resolution is recursive with
 * cycle detection: `localparam A = B + 1; localparam B = A;` is rejected by
 * name rather than left to recurse or quietly become 0.
 *
 * Each right-hand side goes through the engine's own expression parser and
 * evaluator, so a constant expression supports exactly the syntax the rest of
 * the engine does — no second, divergent expression language.
 */
export function resolveNamedConstants(raw: Record<string, string>): Record<string, number> {
  const resolved: Record<string, number> = {};
  const inProgress = new Set<string>();

  const resolve = (name: string): number => {
    if (name in resolved) return resolved[name];

    if (inProgress.has(name)) {
      throw new NamedConstantError(
        `Named constant '${name}' is defined in terms of itself (circular ${[...inProgress, name].join(' -> ')}).`,
        name,
      );
    }
    inProgress.add(name);

    const text = raw[name];
    let value: number;
    try {
      const expr = new Parser(text).parseExpr();
      // Dependencies are resolved first, then handed to the evaluator as
      // state, so `localparam B = A + 1` sees A's real value.
      const deps = collectIdentifiers(text).filter((id) => id !== name && id in raw);
      const scope: Record<string, number> = {};
      for (const dep of deps) scope[dep] = resolve(dep);

      value = evaluateExpr(expr, {
        state: createSafeState(scope),
        nextState: Object.create(null),
      });
    } catch (err) {
      if (err instanceof NamedConstantError) throw err;
      throw new NamedConstantError(
        `Named constant '${name}' has a value this simulator cannot evaluate at compile time ('${text}'). ` +
          `Constant expressions must resolve to a number. Original error: ${(err as Error).message}`,
        name,
      );
    }

    if (!Number.isFinite(value)) {
      throw new NamedConstantError(
        `Named constant '${name}' did not resolve to a number ('${text}' produced ${String(value)}). ` +
          `A constant must be computable at compile time.`,
        name,
      );
    }

    inProgress.delete(name);
    resolved[name] = value;
    return value;
  };

  for (const name of Object.keys(raw)) resolve(name);
  return resolved;
}

/**
 * Identifiers appearing in an expression, used only to order dependency
 * resolution. Sized literals (`7'd62`) must not contribute their base letter,
 * so those are removed before scanning.
 */
function collectIdentifiers(expr: string): string[] {
  const withoutLiterals = expr.replace(/\b\d+'[bBoOdDhH][0-9a-fA-FxXzZ_]+/g, ' ');
  return [...withoutLiterals.matchAll(/[A-Za-z_][A-Za-z0-9_$]*/g)].map((m) => m[0]);
}

/**
 * Collects and resolves in one step, for a module body.
 *
 * Returns an empty table when the body declares no constants, so callers pay
 * nothing for designs that do not use them.
 */
export function buildConstantTable(body: string): Record<string, number> {
  const raw = collectNamedConstants(body);
  if (Object.keys(raw).length === 0) return {};
  return resolveNamedConstants(raw);
}
