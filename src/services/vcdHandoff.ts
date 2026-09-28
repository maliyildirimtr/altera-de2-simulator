/**
 * Hands a VCD from one tool to the Waveform tool (e.g. the DE2 logic
 * analyzer's capture). sessionStorage so it survives the route change but
 * never outlives the tab.
 */
const KEY = 'logiclab_vcd_handoff_v1';

export interface VcdHandoff {
  name: string;
  content: string;
}

export function setPendingVcd(handoff: VcdHandoff): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(handoff));
    return true;
  } catch {
    return false;
  }
}

export function consumePendingVcd(): VcdHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as VcdHandoff;
    return typeof parsed?.content === 'string' ? parsed : null;
  } catch {
    return null;
  }
}
