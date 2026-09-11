const HANDOFF_STORAGE_KEY = 'eda_pending_example_handoff';

export type TargetTool = 'schematic' | 'waveform' | 'de2';
export type WorkspaceOrigin = 'default' | 'example' | 'user';

export interface PendingHandoff {
  exampleId: string;
  targetTool: TargetTool;
}

export interface WorkspaceState {
  origin: WorkspaceOrigin;
  dirty: boolean;
}

/**
 * Stores transient handoff token in sessionStorage.
 */
export function setPendingHandoff(exampleId: string, targetTool: TargetTool): void {
  try {
    sessionStorage.setItem(
      HANDOFF_STORAGE_KEY,
      JSON.stringify({ exampleId, targetTool })
    );
  } catch (err) {
    console.warn('[exampleHandoff] set error:', err);
  }
}

/**
 * Retrieves the pending handoff payload without consuming it.
 */
export function peekPendingHandoff(): PendingHandoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Consumes the pending handoff payload once and removes it from sessionStorage.
 */
export function consumePendingHandoff(tool: TargetTool): PendingHandoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    const data: PendingHandoff = JSON.parse(raw);
    if (data.targetTool === tool) {
      sessionStorage.removeItem(HANDOFF_STORAGE_KEY);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clears any pending handoff.
 */
export function clearPendingHandoff(): void {
  try {
    sessionStorage.removeItem(HANDOFF_STORAGE_KEY);
  } catch (_) {}
}

/**
 * Retrieves the strict origin/dirty state for a given tool.
 * Fresh sessions will default to origin='default', dirty=false.
 */
export function getWorkspaceState(tool: TargetTool): WorkspaceState {
  try {
    const origin = (sessionStorage.getItem(`eda_workspace_state_${tool}_origin`) as WorkspaceOrigin) || 'default';
    const dirty = sessionStorage.getItem(`eda_workspace_state_${tool}_dirty`) === 'true';
    return { origin, dirty };
  } catch {
    return { origin: 'default', dirty: false };
  }
}

/**
 * Mark the workspace as cleanly originating from an Example.
 * Must only be called AFTER successful load.
 */
export function markWorkspaceOrigin(tool: TargetTool, origin: WorkspaceOrigin): void {
  try {
    sessionStorage.setItem(`eda_workspace_state_${tool}_origin`, origin);
    sessionStorage.setItem(`eda_workspace_state_${tool}_dirty`, 'false');
  } catch (_) {}
}

/**
 * Mark the workspace as containing imported/custom user work that would be lost.
 * Automatically marks dirty=true.
 */
export function markWorkspaceUser(tool: TargetTool): void {
  try {
    sessionStorage.setItem(`eda_workspace_state_${tool}_origin`, 'user');
    sessionStorage.setItem(`eda_workspace_state_${tool}_dirty`, 'true');
  } catch (_) {}
}

/**
 * Mark the current workspace as dirty due to meaningful project mutations.
 */
export function markWorkspaceDirty(tool: TargetTool): void {
  try {
    sessionStorage.setItem(`eda_workspace_state_${tool}_dirty`, 'true');
  } catch (_) {}
}

/**
 * Checks if the target tool has meaningful user work that would be lost.
 * ONLY returns true if dirty === true OR origin === 'user'
 * (which enforces that user origin implies dirty state).
 */
export function checkTargetToolHasUnsavedWork(tool: TargetTool): boolean {
  try {
    const { origin, dirty } = getWorkspaceState(tool);
    return dirty === true || origin === 'user';
  } catch {
    return false;
  }
}
