/**
 * Finds a finite-state machine in Verilog/SystemVerilog source and returns
 * its states and transitions, for the DE2 simulator's FSM diagram.
 *
 * This is a pattern reader, not a parser. It recognises the way FSMs are
 * written in coursework — a `case (state)` whose items assign the next state,
 * either directly (`state <= S1;`) or through a next-state variable
 * (`next = S1;` with `state <= next;` elsewhere) — with states named by
 * localparam/parameter/enum constants or written as literals. Conditions are
 * taken from the nearest enclosing `if`/`else` and are labels only.
 */

export interface FsmState {
  name: string;
  /** Numeric encoding when known (constant or literal). */
  value: number | null;
}

export interface FsmTransition {
  from: string;
  to: string;
  /** Guard text, '' when unconditional, 'else' for a bare else branch. */
  condition: string;
}

export interface FsmModel {
  /** The register that holds the current state (as named in the source). */
  stateVar: string;
  states: FsmState[];
  transitions: FsmTransition[];
  /** State assigned under a reset condition, if one was found. */
  initial: string | null;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, '');
}

/** Parse a Verilog number literal: 5, 2'd1, 2'b10, 4'hA, 'd3. */
export function parseLiteral(text: string): number | null {
  const t = text.trim().replace(/_/g, '');
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const m = /^(\d*)'(s?)([bdhoBDHO])([0-9a-fA-FxXzZ]+)$/.exec(t);
  if (!m) return null;
  const base = { b: 2, d: 10, h: 16, o: 8 }[m[3].toLowerCase() as 'b' | 'd' | 'h' | 'o'];
  const v = parseInt(m[4], base);
  return Number.isFinite(v) ? v : null;
}

function collectConstants(src: string): Map<string, number> {
  const constants = new Map<string, number>();
  // localparam / parameter lists: localparam [1:0] A = 0, B = 2'd1;
  const paramRe = /\b(?:localparam|parameter)\b([^;]*);/g;
  let m: RegExpExecArray | null;
  while ((m = paramRe.exec(src)) !== null) {
    const body = m[1].replace(/^\s*(?:int|integer|logic|bit|reg)?\s*(?:\[[^\]]*\])?/, '');
    for (const part of body.split(',')) {
      const pm = /^\s*(\w+)\s*=\s*([\w']+)\s*$/.exec(part);
      if (pm) {
        const v = parseLiteral(pm[2]) ?? constants.get(pm[2]) ?? null;
        if (v !== null) constants.set(pm[1], v);
      }
    }
  }
  // enum { A, B = 5, C }
  const enumRe = /\benum\b[^{]*\{([^}]*)\}/g;
  while ((m = enumRe.exec(src)) !== null) {
    let next = 0;
    for (const part of m[1].split(',')) {
      const em = /^\s*(\w+)\s*(?:=\s*([\w']+))?\s*$/.exec(part);
      if (!em) continue;
      const v = em[2] !== undefined ? parseLiteral(em[2]) ?? next : next;
      constants.set(em[1], v);
      next = v + 1;
    }
  }
  return constants;
}

interface CaseBlock {
  variable: string;
  body: string;
}

function findCaseBlocks(src: string): CaseBlock[] {
  const blocks: CaseBlock[] = [];
  const re = /\bcase[zx]?\s*\(\s*(\w+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const start = re.lastIndex;
    const tokens = /\b(case[zx]?|endcase)\b/g;
    tokens.lastIndex = start;
    let depth = 1;
    let t: RegExpExecArray | null;
    let end = src.length;
    while ((t = tokens.exec(src)) !== null) {
      depth += t[1] === 'endcase' ? -1 : 1;
      if (depth === 0) { end = t.index; break; }
    }
    blocks.push({ variable: m[1], body: src.slice(start, end) });
  }
  return blocks;
}

interface CaseItem {
  labels: string[];
  body: string;
}

/** Split a case body into items at depth-0 `label:` positions. */
function splitItems(body: string): CaseItem[] {
  const items: CaseItem[] = [];
  let depth = 0;
  let paren = 0;
  let i = 0;
  let current: CaseItem | null = null;
  let boundary = true; // at the start of a statement
  const labelRe = /^\s*((?:[\w']+|default)(?:\s*,\s*[\w']+)*)\s*:(?!=)/;
  while (i < body.length) {
    if (boundary && depth === 0 && paren === 0) {
      const lm = labelRe.exec(body.slice(i));
      if (lm && !/^\s*(?:begin|end|if|else)\b/.test(lm[1])) {
        current = { labels: lm[1].split(',').map((s) => s.trim()), body: '' };
        items.push(current);
        i += lm[0].length;
        boundary = false;
        continue;
      }
    }
    const rest = body.slice(i);
    const word = /^\b(begin|end|case[zx]?|endcase)\b/.exec(rest);
    if (word) {
      if (word[1] === 'begin' || word[1].startsWith('case') && word[1] !== 'endcase') depth++;
      else depth--;
      if (current) current.body += word[0];
      i += word[0].length;
      boundary = word[1] === 'end' || word[1] === 'endcase' ? depth === 0 : false;
      continue;
    }
    const ch = body[i];
    if (ch === '(') paren++;
    if (ch === ')') paren--;
    if (current) current.body += ch;
    if (ch === ';' && paren === 0) boundary = depth === 0;
    else if (!/\s/.test(ch)) boundary = false;
    i++;
  }
  return items;
}

function conditionBefore(body: string, pos: number): string {
  const before = body.slice(0, pos);
  const re = /\b(else\s+if|if)\s*\(|\belse\b/g;
  let last: { kind: string; index: number; end: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) last = { kind: m[1] ?? 'else', index: m.index, end: re.lastIndex };
  if (!last) return '';
  if (last.kind === 'else') return 'else';
  // Read the balanced condition.
  let depth = 1;
  let j = last.end;
  while (j < before.length && depth > 0) {
    if (before[j] === '(') depth++;
    else if (before[j] === ')') depth--;
    j++;
  }
  // An `if` whose statement already ended before this assignment does not guard it.
  const between = before.slice(j);
  if (/;/.test(between) && !/\bbegin\b/.test(between)) return '';
  return before.slice(last.end, j - 1).replace(/\s+/g, ' ').trim();
}

export function extractFsm(source: string): FsmModel | null {
  const src = stripComments(source);
  const constants = collectConstants(src);
  const valueOf = (name: string): number | null => constants.get(name) ?? parseLiteral(name);

  let best: FsmModel | null = null;
  for (const block of findCaseBlocks(src)) {
    const v = block.variable;
    // Next-state variables: `v <= next;` / `v = next;` outside this case.
    const targets = new Set<string>([v]);
    const nextRe = new RegExp(`\\b${v}\\s*<?=\\s*(\\w+)\\s*;`, 'g');
    let nm: RegExpExecArray | null;
    while ((nm = nextRe.exec(src)) !== null) {
      if (valueOf(nm[1]) === null) targets.add(nm[1]);
    }

    const states = new Map<string, FsmState>();
    const addState = (name: string) => {
      if (!states.has(name)) states.set(name, { name, value: valueOf(name) });
    };
    const transitions: FsmTransition[] = [];
    for (const item of splitItems(block.body)) {
      const froms = item.labels.filter((l) => l !== 'default');
      if (froms.length === 0) continue;
      froms.forEach(addState);
      const asg = /\b(\w+)\s*<?=\s*([\w']+)\s*;/g;
      let am: RegExpExecArray | null;
      while ((am = asg.exec(item.body)) !== null) {
        if (!targets.has(am[1])) continue;
        const to = am[2];
        if (valueOf(to) === null && !constants.has(to)) continue; // not a state value
        addState(to);
        const condition = conditionBefore(item.body, am.index);
        for (const from of froms) {
          if (!transitions.some((t) => t.from === from && t.to === to && t.condition === condition)) {
            transitions.push({ from, to, condition });
          }
        }
      }
    }
    // Only name-or-value states that are real case labels or targets.
    if (states.size < 2 || transitions.length === 0) continue;

    const resetRe = new RegExp(`if\\s*\\(\\s*!?\\s*~?\\s*\\w*(?:rst|reset|clr)\\w*\\s*\\)\\s*(?:begin\\s*)?[^;]*?\\b${v}\\s*<?=\\s*([\\w']+)\\s*;`, 'i');
    const rm = resetRe.exec(src);
    const initial = rm && states.has(rm[1]) ? rm[1] : null;

    const model: FsmModel = { stateVar: v, states: [...states.values()], transitions, initial };
    if (!best || model.transitions.length > best.transitions.length) best = model;
  }
  return best;
}
