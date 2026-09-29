/**
 * Serverless classroom mode.
 *
 * A teacher builds an assignment (a set of exercises) and shares it as a
 * link; nothing is uploaded — the assignment travels inside the URL. Students
 * work on the Exercises page as usual and download a small result file, which
 * the teacher loads into the Classroom page to see the whole class.
 *
 * The result file carries a SHA-256 checksum of its own contents. It detects
 * accidental edits and corrupted files; it is not a security measure against a
 * determined student, and the UI says so.
 */

import { compileVerilog } from '../core/simulator/verilogEngine';
import type { CustomTaskSpec } from '../exercises/exercises';

export interface Assignment {
  v: 1;
  /** Random id, ties result files to this assignment. */
  id: string;
  title: string;
  teacher: string;
  /** ISO date (yyyy-mm-dd) or ''. */
  due: string;
  exercises: string[];
  /** The teacher's own tasks (ids c_0, c_1 … in `exercises`). */
  custom?: CustomTaskSpec[];
}

export interface ExerciseStat {
  solved: boolean;
  attempts: number;
  /** Best score so far: rows (or cycles) that matched, of `total`. */
  bestPassed: number;
  total: number;
}

export interface StudentResult {
  v: 1;
  kind: 'logiclab-result';
  assignmentId: string;
  assignmentTitle: string;
  student: string;
  submittedAt: string;
  results: Record<string, ExerciseStat>;
  checksum: string;
  /** Titles of the teacher's own tasks, for the class table (not covered by the checksum). */
  titles?: Record<string, string>;
}

export const ASSIGN_PARAM = 'assign';
const ACTIVE_KEY = 'logiclab_assignment_v1';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function newAssignmentId(): string {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function encodeAssignment(a: Assignment): string {
  return toBase64Url(JSON.stringify(a));
}

export function decodeAssignment(encoded: string, knownExercises: (id: string) => boolean): Assignment | null {
  try {
    const a = JSON.parse(fromBase64Url(encoded)) as Assignment;
    if (a?.v !== 1 || typeof a.id !== 'string' || !Array.isArray(a.exercises)) return null;
    // Teacher tasks: keep the ones whose reference solution compiles.
    const custom = (Array.isArray(a.custom) ? a.custom : []).slice(0, 12).map((t) => ({
      title: String(t?.title ?? '').slice(0, 120),
      prompt: String(t?.prompt ?? '').slice(0, 2000),
      hint: String(t?.hint ?? '').slice(0, 1000),
      reference: String(t?.reference ?? '').slice(0, 8000),
    }));
    const valid = custom.map((t) => {
      try {
        const e = compileVerilog(t.reference);
        return e.inputs.length > 0 && e.outputs.length > 0;
      } catch {
        return false;
      }
    });
    const isCustom = (id: string) => /^c_\d+$/.test(id) && valid[Number(id.slice(2))] === true;
    const exercises = a.exercises.filter((id) => typeof id === 'string' && (knownExercises(id) || isCustom(id)));
    if (exercises.length === 0) return null;
    return {
      v: 1,
      id: a.id.slice(0, 32),
      title: String(a.title ?? '').slice(0, 120),
      teacher: String(a.teacher ?? '').slice(0, 80),
      due: /^\d{4}-\d{2}-\d{2}$/.test(a.due ?? '') ? a.due : '',
      exercises,
      ...(custom.length ? { custom } : {}),
    };
  } catch {
    return null;
  }
}

export function assignmentUrl(a: Assignment): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/exercises?${ASSIGN_PARAM}=${encodeAssignment(a)}`;
}

/* ── The student's active assignment (this browser) ── */

export interface ActiveAssignment {
  assignment: Assignment;
  student: string;
}

export function loadActiveAssignment(): ActiveAssignment | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as ActiveAssignment) : null;
  } catch {
    return null;
  }
}

export function saveActiveAssignment(active: ActiveAssignment | null): void {
  try {
    if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* storage unavailable */
  }
}

/* ── Result files ── */

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function canonical(r: Omit<StudentResult, 'checksum'>): string {
  const results = Object.keys(r.results).sort().map((k) => [k, r.results[k]]);
  return JSON.stringify([r.v, r.kind, r.assignmentId, r.assignmentTitle, r.student, r.submittedAt, results]);
}

export async function buildResult(
  active: ActiveAssignment,
  stats: Record<string, ExerciseStat>,
): Promise<StudentResult> {
  const results: Record<string, ExerciseStat> = {};
  for (const id of active.assignment.exercises) {
    results[id] = stats[id] ?? { solved: false, attempts: 0, bestPassed: 0, total: 0 };
  }
  const body = {
    v: 1 as const,
    kind: 'logiclab-result' as const,
    assignmentId: active.assignment.id,
    assignmentTitle: active.assignment.title,
    student: active.student,
    submittedAt: new Date().toISOString(),
    results,
  };
  const titles: Record<string, string> = {};
  (active.assignment.custom ?? []).forEach((t, i) => { titles[`c_${i}`] = t.title; });
  return { ...body, checksum: await sha256Hex(canonical(body)), ...(Object.keys(titles).length ? { titles } : {}) };
}

export async function parseResult(text: string): Promise<{ result: StudentResult; checksumOk: boolean } | null> {
  try {
    const r = JSON.parse(text) as StudentResult;
    if (r?.kind !== 'logiclab-result' || typeof r.results !== 'object') return null;
    const { checksum, titles: _titles, ...body } = r;
    void _titles;
    return { result: r, checksumOk: checksum === (await sha256Hex(canonical(body))) };
  } catch {
    return null;
  }
}

const TR_ASCII: Record<string, string> = { ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' };

export function safeFileName(text: string): string {
  const ascii = (text || '').replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_ASCII[ch]).normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return ascii.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'student';
}
