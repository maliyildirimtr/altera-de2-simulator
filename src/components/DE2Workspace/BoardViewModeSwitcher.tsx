import React from 'react';
import type { BoardViewMode } from '../../board/boardViewMode';
import { BOARD_VIEW_MODES } from '../../board/boardViewMode';

import { useT } from '../../i18n/toolText';
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
export const BoardViewModeSwitcher: React.FC<BoardViewModeSwitcherProps> = ({ mode, onSelect }) => {
  const t = useT();
  return (
  <div
    data-testid="de2-board-view-switcher"
    data-active-mode={mode}
    className="canvas-controls flex items-center gap-0.5 rounded-[0.25rem] border p-0.5 select-none"
    style={{
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-subtle)',
      boxShadow: 'var(--shadow-sm)',
    }}
    role="group"
    aria-label={t("Board view mode")}
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
          title={t(option.description)}
          className="flex items-center gap-1 px-2 h-[1.5rem] rounded-[0.1875rem] text-[0.6875rem] font-semibold transition-colors disabled:cursor-not-allowed"
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
              className="text-[0.5625rem] font-medium px-1 rounded-[0.125rem]"
              style={{
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-muted)',
              }}
            >
              {t(option.badge)}
            </span>
          )}
        </button>
      );
    })}
  </div>
  );
};
