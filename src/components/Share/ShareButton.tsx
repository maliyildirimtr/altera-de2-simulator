import type React from 'react';
import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { buildShareUrl, MAX_SHARE_URL_LENGTH, type SharePayload } from '../../services/shareLink';

import { useT } from '../../i18n/toolText';
interface ShareButtonProps {
  /** Returns the project to share, or null when there is nothing to share. */
  getPayload: () => SharePayload | null;
  className?: string;
  labelClassName?: string;
  /** Replaces the default bordered look (e.g. inside a menu). */
  style?: React.CSSProperties;
  onMessage?: (message: string, kind: 'info' | 'error') => void;
}

/** Copies a link that re-opens the current project in the same tool. */
export function ShareButton({ getPayload, className, labelClassName = 'hidden md:inline', onMessage, style }: ShareButtonProps) {
  const t = useT();
  const [state, setState] = useState<'idle' | 'copied'>('idle');

  const handleClick = async () => {
    const payload = getPayload();
    if (!payload || payload.files.every((f) => !f.content.trim())) {
      onMessage?.('Nothing to share yet: add some HDL first.', 'error');
      return;
    }
    try {
      const url = await buildShareUrl(payload);
      if (url.length > MAX_SHARE_URL_LENGTH) {
        onMessage?.('This project is too large to share as a link. Download the files instead.', 'error');
        return;
      }
      await navigator.clipboard.writeText(url);
      setState('copied');
      onMessage?.('Share link copied to the clipboard. Anyone with it can open a copy of this project.', 'info');
      window.setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      onMessage?.(`Could not create a share link: ${(err as Error)?.message ?? 'unknown error'}`, 'error');
    }
  };

  return (
    <button
      type="button"
      data-testid="share-link-btn"
      onClick={handleClick}
      title={t("Copy a link to this project")}
      aria-label={t("Copy share link")}
      className={
        className ??
        'flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-colors shadow-xs'
      }
      style={style ?? { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
    >
      {state === 'copied' ? <Check size={13} /> : <Link2 size={13} />}
      <span className={labelClassName}>{state === 'copied' ? t("Copied") : t("Share")}</span>
    </button>
  );
}
