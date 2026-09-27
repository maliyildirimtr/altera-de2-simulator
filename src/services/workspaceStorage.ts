/**
 * Workspace autosave.
 *
 * Each tool keeps its HDL project in localStorage so a refresh, a closed tab or
 * a trip to another route does not lose work. Only source text is stored —
 * never compiled engines, VCD dumps or synthesis output, which are cheap to
 * regenerate and can be large.
 *
 * The example-handoff dirty-state flags live in sessionStorage (see
 * exampleHandoff.ts). A snapshot records them so that restored user work is
 * still protected by the "replace your work?" dialog in a new session.
 */
import { useEffect, useRef } from 'react';
import type { TargetTool, WorkspaceOrigin } from './exampleHandoff';
import { getWorkspaceState } from './exampleHandoff';

const VERSION = 1;

export function workspaceStorageKey(tool: TargetTool): string {
  return `logiclab_${tool}_workspace_v${VERSION}`;
}

interface Snapshot<T> {
  v: number;
  savedAt: number;
  origin: WorkspaceOrigin;
  dirty: boolean;
  data: T;
}

/** Read a saved workspace, or null when there is none or it is unreadable. */
export function loadWorkspace<T>(tool: TargetTool): { data: T; origin: WorkspaceOrigin; dirty: boolean } | null {
  try {
    const raw = localStorage.getItem(workspaceStorageKey(tool));
    if (!raw) return null;
    const snap = JSON.parse(raw) as Snapshot<T>;
    if (!snap || snap.v !== VERSION || snap.data == null) return null;
    return { data: snap.data, origin: snap.origin ?? 'user', dirty: !!snap.dirty };
  } catch {
    return null;
  }
}

/**
 * Re-apply the saved dirty-state flags when this browser session has none yet
 * (a fresh tab). Within one session the live flags are always authoritative.
 */
export function restoreWorkspaceFlags(tool: TargetTool, origin: WorkspaceOrigin, dirty: boolean): void {
  try {
    if (sessionStorage.getItem(`eda_workspace_state_${tool}_origin`) !== null) return;
    sessionStorage.setItem(`eda_workspace_state_${tool}_origin`, origin);
    sessionStorage.setItem(`eda_workspace_state_${tool}_dirty`, dirty ? 'true' : 'false');
  } catch {
    /* storage unavailable: nothing to restore */
  }
}

export function clearWorkspace(tool: TargetTool): void {
  try {
    localStorage.removeItem(workspaceStorageKey(tool));
  } catch {
    /* ignore */
  }
}

/** Returns false when the browser refused the write (quota, private mode). */
export function saveWorkspace<T>(tool: TargetTool, data: T, isEmpty: boolean): boolean {
  try {
    if (isEmpty) {
      localStorage.removeItem(workspaceStorageKey(tool));
      return true;
    }
    const { origin, dirty } = getWorkspaceState(tool);
    const snap: Snapshot<T> = { v: VERSION, savedAt: Date.now(), origin, dirty, data };
    localStorage.setItem(workspaceStorageKey(tool), JSON.stringify(snap));
    return true;
  } catch {
    return false;
  }
}

/**
 * Debounced autosave. Pass a memoised `data` object: a save is scheduled only
 * when its identity changes. Flushes immediately when the page is hidden or unloaded.
 * If a save ever fails, the browser's "leave site?" prompt guards the unsaved
 * work instead.
 */
export function useWorkspaceAutosave<T>(tool: TargetTool, data: T, isEmpty: boolean, delayMs = 400): void {
  const latest = useRef({ data, isEmpty });
  latest.current = { data, isEmpty };
  const pending = useRef<number | null>(null);
  const failed = useRef(false);

  const flush = useRef(() => {
    if (pending.current !== null) {
      window.clearTimeout(pending.current);
      pending.current = null;
    }
    failed.current = !saveWorkspace(tool, latest.current.data, latest.current.isEmpty);
  });

  useEffect(() => {
    if (pending.current !== null) window.clearTimeout(pending.current);
    pending.current = window.setTimeout(flush.current, delayMs);
  }, [data, isEmpty, delayMs]);

  useEffect(() => {
    const doFlush = flush.current;
    const onHide = () => {
      if (document.visibilityState === 'hidden') doFlush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      doFlush();
      if (failed.current && !latest.current.isEmpty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      doFlush(); // leaving the route: save now
    };
  }, []);
}
