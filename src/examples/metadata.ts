import type { ExampleCategory, ExampleDifficulty, LearningExample } from './types';

/**
 * Example metadata that can be edited from the local dev editor
 * (#/dev/examples) without touching registry.ts by hand.
 *
 * - `overrides` changes the text fields of a bundled example.
 * - `added` declares a new example whose files live in src/examples/source.
 *
 * The file is plain JSON (src/examples/metadata.json) so the dev server can
 * rewrite it safely; everything read from it is validated here, and an
 * invalid entry is skipped rather than breaking the gallery.
 */
export const EDITABLE_FIELDS = ['title', 'description', 'difficulty', 'category', 'topics', 'learningObjectives'] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type ExampleOverride = Partial<Pick<LearningExample, EditableField>>;

export interface AddedExample {
  id: string;
  title: string;
  description: string;
  difficulty: ExampleDifficulty;
  category: ExampleCategory;
  topics: string[];
  learningObjectives: string[];
  /** File name in src/examples/source, e.g. "my_design.sv". */
  sourceFile: string;
  topModule: string;
  testbenchFile?: string;
  /** DE2 wrapper file; may be the same file as sourceFile. */
  de2File?: string;
  de2TopModule?: string;
}

export interface ExampleMetadata {
  overrides: Record<string, ExampleOverride>;
  added: AddedExample[];
}

export const CATEGORIES: ExampleCategory[] = ['combinational', 'sequential', 'arithmetic', 'routing', 'fpga'];
export const DIFFICULTIES: ExampleDifficulty[] = ['beginner', 'intermediate'];
export const ID_RE = /^[a-z][a-z0-9_]{1,47}$/;
export const FILE_RE = /^[A-Za-z0-9_-]+\.(sv|v)$/;
export const MODULE_RE = /^[A-Za-z_][A-Za-z0-9_$]*$/;

const isStr = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 20 && v.every((s) => isStr(s, 300));

function cleanOverride(raw: unknown): ExampleOverride | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: ExampleOverride = {};
  if (isStr(r.title, 120)) out.title = r.title.trim();
  if (isStr(r.description)) out.description = r.description.trim();
  if (DIFFICULTIES.includes(r.difficulty as ExampleDifficulty)) out.difficulty = r.difficulty as ExampleDifficulty;
  if (CATEGORIES.includes(r.category as ExampleCategory)) out.category = r.category as ExampleCategory;
  if (isStrList(r.topics)) out.topics = r.topics.map((s) => s.trim());
  if (isStrList(r.learningObjectives)) out.learningObjectives = r.learningObjectives.map((s) => s.trim());
  return Object.keys(out).length ? out : null;
}

/** Returns the reasons an added example is invalid (empty when valid). */
export function addedExampleErrors(a: Partial<AddedExample>, knownIds: Set<string> = new Set()): string[] {
  const errs: string[] = [];
  if (!a.id || !ID_RE.test(a.id)) errs.push('id: lowercase letters, digits and _ (2–48 chars)');
  else if (knownIds.has(a.id)) errs.push(`id: "${a.id}" is already used`);
  if (!isStr(a.title, 120)) errs.push('title is required');
  if (!isStr(a.description)) errs.push('description is required');
  if (!DIFFICULTIES.includes(a.difficulty as ExampleDifficulty)) errs.push('difficulty');
  if (!CATEGORIES.includes(a.category as ExampleCategory)) errs.push('category');
  if (a.topics !== undefined && !isStrList(a.topics)) errs.push('topics');
  if (a.learningObjectives !== undefined && !isStrList(a.learningObjectives)) errs.push('learningObjectives');
  if (!a.sourceFile || !FILE_RE.test(a.sourceFile)) errs.push('sourceFile');
  if (!a.topModule || !MODULE_RE.test(a.topModule)) errs.push('topModule');
  if (a.testbenchFile && !FILE_RE.test(a.testbenchFile)) errs.push('testbenchFile');
  if (a.de2File && !FILE_RE.test(a.de2File)) errs.push('de2File');
  if (a.de2File && (!a.de2TopModule || !MODULE_RE.test(a.de2TopModule))) errs.push('de2TopModule');
  return errs;
}

/** Validates untrusted JSON into ExampleMetadata, dropping bad entries. */
export function normalizeMetadata(raw: unknown): ExampleMetadata {
  const out: ExampleMetadata = { overrides: {}, added: [] };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as { overrides?: unknown; added?: unknown };
  if (r.overrides && typeof r.overrides === 'object') {
    for (const [id, o] of Object.entries(r.overrides as Record<string, unknown>)) {
      const c = ID_RE.test(id) ? cleanOverride(o) : null;
      if (c) out.overrides[id] = c;
    }
  }
  if (Array.isArray(r.added)) {
    const seen = new Set<string>();
    for (const a of r.added as Partial<AddedExample>[]) {
      if (!a || typeof a !== 'object' || addedExampleErrors(a, seen).length) continue;
      seen.add(a.id!);
      out.added.push({
        id: a.id!,
        title: a.title!.trim(),
        description: a.description!.trim(),
        difficulty: a.difficulty!,
        category: a.category!,
        topics: isStrList(a.topics) ? a.topics : [],
        learningObjectives: isStrList(a.learningObjectives) ? a.learningObjectives : [],
        sourceFile: a.sourceFile!,
        topModule: a.topModule!,
        ...(a.testbenchFile ? { testbenchFile: a.testbenchFile } : {}),
        ...(a.de2File ? { de2File: a.de2File, de2TopModule: a.de2TopModule } : {}),
      });
    }
  }
  return out;
}

/**
 * Applies metadata to the bundled example list. `files` maps a file name in
 * src/examples/source to its text; an added example whose files are missing
 * is skipped.
 */
export function applyMetadata(base: LearningExample[], meta: ExampleMetadata, files: Record<string, string>): LearningExample[] {
  const list = base.map((ex) => {
    const o = meta.overrides[ex.id];
    return o ? { ...ex, ...o } : ex;
  });
  const ids = new Set(list.map((e) => e.id));
  for (const a of meta.added) {
    if (ids.has(a.id)) continue;
    const src = files[a.sourceFile];
    if (src === undefined) continue;
    const tb = a.testbenchFile ? files[a.testbenchFile] : undefined;
    const de2 = a.de2File ? files[a.de2File] : undefined;
    list.push({
      id: a.id,
      title: a.title,
      description: a.description,
      difficulty: a.difficulty,
      category: a.category,
      topics: a.topics,
      learningObjectives: a.learningObjectives,
      topModule: a.topModule,
      source: { filename: a.sourceFile, language: 'systemverilog', code: src },
      ...(tb !== undefined ? { testbench: { filename: a.testbenchFile!, language: 'systemverilog' as const, code: tb } } : {}),
      ...(de2 !== undefined ? { de2: { supported: true, filename: a.de2File!, source: de2, topModule: a.de2TopModule ?? a.topModule } } : {}),
      tools: { schematic: true, waveform: tb !== undefined, de2: de2 !== undefined },
    });
    ids.add(a.id);
  }
  return list;
}

/** The fields of `edited` that differ from `base` (for storing an override). */
export function diffOverride(base: LearningExample, edited: ExampleOverride): ExampleOverride | null {
  const out: ExampleOverride = {};
  for (const k of EDITABLE_FIELDS) {
    const v = edited[k];
    if (v === undefined) continue;
    if (JSON.stringify(v) !== JSON.stringify(base[k])) (out as Record<string, unknown>)[k] = v;
  }
  return Object.keys(out).length ? out : null;
}
