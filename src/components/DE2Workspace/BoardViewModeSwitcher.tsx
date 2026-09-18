import React from 'react';
import type { BoardViewMode } from '../../board/boardViewMode';
import { BOARD_VIEW_MODES } from '../../board/boardViewMode';

interface BoardViewModeSwitcherProps {
  mode: BoardViewMode;
  onSelect: (mode: BoardViewMode) => void;
}

/**
 * Board renderer selector: 2D / 2.5D / 3D.
 *
 * 3D is rendered as a disabled option rather than hidden, so the eventual
 * renderer is discoverable without pretending it exists. Selection is a pure
 * view preference and never touches simulation state.
 */
export const BoardViewModeSwitcher: React.FC<BoardViewModeSwitcherProps> = ({ mode, onSelect }) => (
  <div
    data-testid="de2-board-view-switcher"
    data-active-mode={mode}
    className="canvas-controls flex items-center gap-0.5 rounded-[4px] border p-0.5 select-none"
    style={{
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-subtle)',
      boxShadow: 'var(--shadow-sm)',
    }}
    role="group"
    aria-label="Board view mode"
  >
    {BOARD_VIEW_MODES.map((option) => {
      const isActive = option.mode === mode && option.enabled;
      return (
        <button
          key={option.mode}
          type="button"
          data-testid={`de2-board-view-${option.mode}`}
          data-active={isActive ? 'true' : 'false'}
          onClick={() => option.enabled && onSelect(option.mode)}
          disabled={!option.enabled}
          aria-pressed={isActive}
          aria-disabled={!option.enabled}
          title={option.description}
          className="flex items-center gap-1 px-2 h-[24px] rounded-[3px] text-[11px] font-semibold transition-colors disabled:cursor-not-allowed"
          style={{
            backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
            color: !option.enabled
              ? 'var(--text-disabled)'
              : isActive
                ? 'var(--accent-primary)'
                : 'var(--text-secondary)',
            border: `1px solid ${isActive ? 'var(--accent-border)' : 'transparent'}`,
            opacity: option.enabled ? 1 : 0.55,
          }}
        >
          <span>{option.label}</span>
          {option.badge && (
            <span
              className="text-[9px] font-medium px-1 rounded-[2px]"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-muted)',
              }}
            >
              {option.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
