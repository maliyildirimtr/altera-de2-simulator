/**
 * Short quizzes with generated questions: number systems, Boolean algebra
 * and Karnaugh maps. Every question is made from a seeded random generator,
 * so a quiz can be repeated exactly, and every answer is computed — never
 * typed in by hand — with the same helpers the tools use.
 */
import { evalAst, minimize, parseExpression, sopText, tableOf, type Implicant } from '../logic/boolean';

export type L = { en: string; tr: string };
export type Topic = 'numbers' | 'boolean' | 'kmap';
export const TOPICS: Topic[] = ['numbers', 'boolean', 'kmap'];

export interface Question {
  topic: Topic;
  text: L;
  /** Monospace detail shown under the text (a number, an expression, a table). */
  detail?: string;
  kind: 'input' | 'choice';
  options?: string[];
  /** The correct answer: the option text, or the canonical typed answer. */
  answer: string;
  /** How a typed answer is compared. */
  format?: 'dec' | 'bin' | 'hex' | 'bit';
  explain: L;
}

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const t = (en: string, tr: string): L => ({ en, tr });
const bin = (v: number, w: number) => v.toString(2).padStart(w, '0');
const group4 = (s: string) => s.replace(/\B(?=(\d{4})+(?!\d))/g, ' ');

/** Compares a typed answer with the expected one, forgiving spaces, prefixes and leading zeros. */
export function checkAnswer(q: Question, typed: string): boolean {
  if (q.kind === 'choice') return typed === q.answer;
  const x = typed.trim().toLowerCase().replace(/[\s_]/g, '');
  const want = q.answer.toLowerCase().replace(/[\s_]/g, '');
  if (!x) return false;
  switch (q.format) {
    case 'bin': {
      const v = x.replace(/^0b/, '');
      return /^[01]+$/.test(v) && parseInt(v, 2) === parseInt(want, 2) && v.length <= Math.max(want.length, 16);
    }
    case 'hex': {
      const v = x.replace(/^0x/, '').replace(/h$/, '');
      return /^[0-9a-f]+$/.test(v) && parseInt(v, 16) === parseInt(want, 16);
    }
    case 'dec':
      return /^[+-]?\d+$/.test(x) && Number(x) === Number(want);
    default:
      return x === want;
  }
}

/* ── Number systems ─────────────────────────────────────────────────── */

function numberQuestion(r: () => number): Question {
  const pick = Math.floor(r() * 7);
  const n8 = 1 + Math.floor(r() * 254);
  switch (pick) {
    case 0:
      return { topic: 'numbers', kind: 'input', format: 'bin', text: t('Write this decimal number in binary.', 'Bu onluk sayıyı ikilik tabanda yaz.'), detail: String(n8), answer: n8.toString(2), explain: t(`Repeated division by 2: ${n8} = ${group4(bin(n8, 8))}₂.`, `2'ye tekrar tekrar bölerek: ${n8} = ${group4(bin(n8, 8))}₂.`) };
    case 1:
      return { topic: 'numbers', kind: 'input', format: 'dec', text: t('What is this binary number in decimal?', 'Bu ikilik sayı onluk tabanda kaçtır?'), detail: `${group4(bin(n8, 8))}₂`, answer: String(n8), explain: t(`Add the weights of the 1 bits: ${positional(n8)} = ${n8}.`, `1 olan bitlerin ağırlıklarını topla: ${positional(n8)} = ${n8}.`) };
    case 2:
      return { topic: 'numbers', kind: 'input', format: 'hex', text: t('Write this binary number in hexadecimal.', 'Bu ikilik sayıyı onaltılık tabanda yaz.'), detail: `${group4(bin(n8, 8))}₂`, answer: n8.toString(16).toUpperCase(), explain: t('Each group of four bits is one hex digit.', 'Her dört bitlik grup bir onaltılık basamaktır.') };
    case 3: {
      const h = 16 + Math.floor(r() * 240);
      return { topic: 'numbers', kind: 'input', format: 'bin', text: t('Write this hexadecimal number in binary.', 'Bu onaltılık sayıyı ikilik tabanda yaz.'), detail: `0x${h.toString(16).toUpperCase()}`, answer: bin(h, 8), explain: t(`${h.toString(16).toUpperCase()}₁₆ = ${group4(bin(h, 8))}₂ (one hex digit = four bits).`, `${h.toString(16).toUpperCase()}₁₆ = ${group4(bin(h, 8))}₂ (bir onaltılık basamak = dört bit).`) };
    }
    case 4: {
      const k = 1 + Math.floor(r() * 100);
      const code = (256 - k) & 0xff;
      return { topic: 'numbers', kind: 'input', format: 'bin', text: t(`Write −${k} in 8-bit two's complement.`, `−${k} sayısını 8 bitlik ikiye tümleyen olarak yaz.`), detail: `−${k}`, answer: bin(code, 8), explain: t(`${k} = ${group4(bin(k, 8))}; invert: ${group4(bin(~k & 0xff, 8))}; add 1: ${group4(bin(code, 8))}.`, `${k} = ${group4(bin(k, 8))}; ters çevir: ${group4(bin(~k & 0xff, 8))}; 1 ekle: ${group4(bin(code, 8))}.`) };
    }
    case 5: {
      const code = 128 + Math.floor(r() * 128);
      const v = code - 256;
      return { topic: 'numbers', kind: 'input', format: 'dec', text: t("This is an 8-bit two's complement number. What is its value?", 'Bu 8 bitlik ikiye tümleyen bir sayıdır. Değeri kaçtır?'), detail: group4(bin(code, 8)), answer: String(v), explain: t(`The top bit is 1, so it is negative: ${code} − 256 = ${v}.`, `En üst bit 1, yani negatif: ${code} − 256 = ${v}.`) };
    }
    default: {
      const g = Math.floor(r() * 16);
      const gray = g ^ (g >> 1);
      return { topic: 'numbers', kind: 'input', format: 'bin', text: t('Write the 4-bit Gray code of this number.', 'Bu sayının 4 bitlik Gray kodunu yaz.'), detail: String(g), answer: bin(gray, 4), explain: t(`Gray = n XOR (n >> 1) = ${bin(g, 4)} ^ ${bin(g >> 1, 4)} = ${bin(gray, 4)}.`, `Gray = n XOR (n >> 1) = ${bin(g, 4)} ^ ${bin(g >> 1, 4)} = ${bin(gray, 4)}.`) };
    }
  }
}

function positional(v: number): string {
  const parts: number[] = [];
  for (let i = 7; i >= 0; i--) if ((v >> i) & 1) parts.push(1 << i);
  return parts.join(' + ');
}

/* ── Boolean algebra ────────────────────────────────────────────────── */

function randomExpr(r: () => number, vars: string[], depth: number): string {
  const v = () => {
    const name = vars[Math.floor(r() * vars.length)];
    return r() < 0.35 ? `${name}'` : name;
  };
  if (depth <= 0) return v();
  const op = r();
  const a = randomExpr(r, vars, depth - 1);
  const b = randomExpr(r, vars, depth - 1);
  const wrap = (s: string) => (s.length > 2 ? `(${s})` : s);
  if (op < 0.45) return `${wrap(a)}·${wrap(b)}`;
  if (op < 0.85) return `${a} + ${b}`;
  return `${wrap(a)} ⊕ ${wrap(b)}`;
}

function sameTable(a: number[], b: number[]) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function booleanQuestion(r: () => number): Question {
  const vars = ['a', 'b', 'c'];
  if (r() < 0.5) {
    // Evaluate an expression for given inputs.
    const e = randomExpr(r, vars, 2);
    const env = Object.fromEntries(vars.map((x) => [x, r() < 0.5 ? 1 : 0]));
    const ast = parseExpression(e);
    const y = evalAst(ast, env);
    const given = vars.map((x) => `${x} = ${env[x]}`).join(', ');
    return { topic: 'boolean', kind: 'choice', options: ['0', '1'], answer: String(y), text: t(`What is the value of the expression when ${given}?`, `${given} iken ifadenin değeri nedir?`), detail: `y = ${e}`, explain: t(`Substitute the values and work from the inside out: y = ${y}.`, `Değerleri yerine koy ve içten dışa hesapla: y = ${y}.`) };
  }
  // Which expression is equivalent? The correct one is the minimal SOP.
  let e = randomExpr(r, vars, 2);
  let table = tableOf(parseExpression(e), vars);
  for (let k = 0; k < 8 && (table.every((x) => x === 0) || table.every((x) => x === 1)); k++) {
    e = randomExpr(r, vars, 2);
    table = tableOf(parseExpression(e), vars);
  }
  const ones = table.flatMap((v, i) => (v ? [i] : []));
  const correct = sopText(minimize(3, ones, []), vars);
  const options = new Set<string>([correct]);
  for (let k = 0; k < 40 && options.size < 4; k++) {
    const flip = Math.floor(r() * 8);
    const other = ones.includes(flip) ? ones.filter((m) => m !== flip) : [...ones, flip];
    const d = sopText(minimize(3, other, []), vars);
    if (!sameTable(tableOf(parseExpression(d), vars), table)) options.add(d);
  }
  const shuffled = shuffle([...options], r);
  return { topic: 'boolean', kind: 'choice', options: shuffled, answer: correct, text: t('Which expression is equal to this one?', 'Hangi ifade buna eşittir?'), detail: `y = ${e}`, explain: t(`Its truth table has ones at minterms ${ones.join(', ')}; the minimal sum of products is ${correct}.`, `Doğruluk tablosunda 1'ler ${ones.join(', ')} mintermlerinde; en sade çarpımların toplamı ${correct}.`) };
}

function shuffle<T>(list: T[], r: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── Karnaugh maps ──────────────────────────────────────────────────── */

function kmapQuestion(r: () => number): Question {
  const n = r() < 0.5 ? 3 : 4;
  const vars = ['a', 'b', 'c', 'd'].slice(0, n);
  let ones: number[] = [];
  let cover: Implicant[] = [];
  for (let k = 0; k < 20; k++) {
    ones = Array.from({ length: 1 << n }, (_, m) => m).filter(() => r() < 0.45);
    if (ones.length > 1 && ones.length < (1 << n) - 1) {
      cover = minimize(n, ones, []);
      if (cover.length >= 2) break;
    }
  }
  const sum = `Σm(${ones.join(', ')})`;
  if (r() < 0.5) {
    const answer = String(cover.length);
    const opts = shuffle([...new Set([answer, String(cover.length + 1), String(Math.max(1, cover.length - 1)), String(cover.length + 2)])], r);
    return { topic: 'kmap', kind: 'choice', options: opts, answer, text: t('How many product terms does the minimal sum of products have?', 'En sade çarpımların toplamında kaç çarpım terimi vardır?'), detail: `f(${vars.join(',')}) = ${sum}`, explain: t(`The K-map groups give f = ${sopText(cover, vars)}.`, `K-haritası grupları f = ${sopText(cover, vars)} verir.`) };
  }
  const correct = sopText(cover, vars);
  const options = new Set<string>([correct]);
  const table = Array.from({ length: 1 << n }, (_, m) => (ones.includes(m) ? 1 : 0));
  for (let k = 0; k < 60 && options.size < 4; k++) {
    const flip = Math.floor(r() * (1 << n));
    const other = ones.includes(flip) ? ones.filter((m) => m !== flip) : [...ones, flip];
    const d = sopText(minimize(n, other, []), vars);
    if (d !== correct && !sameTable(tableOf(parseExpression(d), vars), table)) options.add(d);
  }
  return { topic: 'kmap', kind: 'choice', options: shuffle([...options], r), answer: correct, text: t('Which is the minimal sum of products?', 'En sade çarpımların toplamı hangisidir?'), detail: `f(${vars.join(',')}) = ${sum}`, explain: t(`Group the ones in the map as large as possible: f = ${correct}.`, `Haritadaki 1'leri olabildiğince büyük gruplarla topla: f = ${correct}.`) };
}

/** A quiz: `count` questions on the topics, reproducible from `seed`. */
export function makeQuiz(topics: Topic[], count: number, seed: number): Question[] {
  const r = rng(seed);
  const list = topics.length ? topics : TOPICS;
  return Array.from({ length: count }, (_, i) => {
    const topic = list[i % list.length];
    return topic === 'numbers' ? numberQuestion(r) : topic === 'boolean' ? booleanQuestion(r) : kmapQuestion(r);
  });
}

