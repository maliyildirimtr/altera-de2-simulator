import React from 'react';
import { Boxes } from 'lucide-react';

/**
 * Placeholder for the future 3D renderer.
 *
 * The 3D board view is intentionally NOT implemented: no Three.js dependency
 * is pulled in and no fake 3D is drawn. The view selector keeps 3D disabled, so
 * this is only reached defensively (for example a hand-edited preference), and
 * it must never be able to break the workspace.
 */
export const DE2Board3DPlaceholder: React.FC = () => (
  <div
    data-testid="de2-board-3d-placeholder"
    data-board-view="3d"
    className="w-full h-full flex items-center justify-center p-8"
    role="note"
    aria-label="3D board view is not available yet"
  >
    <div
      className="max-w-[360px] flex flex-col items-center text-center gap-3 rounded-[6px] border px-6 py-7"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <Boxes size={26} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        3D board view
      </h2>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        Not available yet. The renderer architecture is in place — the 3D view will read the same
        DE2 layout and the same simulation state as the 2D and 2.5D views.
      </p>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Switch to 2D or 2.5D to continue working.
      </p>
    </div>
  </div>
);
