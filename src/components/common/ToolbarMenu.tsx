import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** Class for an item inside a ToolbarMenu (buttons passed as children use it). */
export const MENU_ITEM_CLASS =
  'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[4px] text-left text-[12.5px] font-medium transition-colors hover:bg-[var(--accent-subtle)] disabled:opacity-40 disabled:cursor-not-allowed';
export const MENU_ITEM_STYLE = { color: 'var(--text-primary)', backgroundColor: 'transparent', border: 0 } as const;

/**
 * A toolbar button that opens a small dropdown of secondary actions, so the
 * toolbar keeps only the actions used most. Closes on outside click, Escape
 * or after an item is chosen.
 */
export function ToolbarMenu({ label, icon, children, testId, className }: { label: string; icon: ReactNode; children: ReactNode; testId?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-testid={testId}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={label}
        className={className ?? 'flex items-center gap-1.5 px-2.5 h-[30px] rounded-[4px] border font-medium transition-colors text-xs'}
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)', backgroundColor: open ? 'var(--accent-subtle)' : 'var(--bg-surface)' }}
      >
        {icon}
        <span className="hidden xl:inline">{label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7 }} />
      </button>
      {open && (
        <div
          role="menu"
          // Let the item's own click handler run first, then close.
          onClick={() => setTimeout(() => setOpen(false), 0)}
          className="absolute right-0 top-full mt-1 z-50 min-w-[210px] p-1 rounded-[6px] border shadow-lg flex flex-col"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
