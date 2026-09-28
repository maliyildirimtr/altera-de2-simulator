import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitGraph } from 'lucide-react';
import { encodeSharePayload, SHARE_PARAM, type SharedFile } from '../../services/shareLink';

import { useT } from '../../i18n/toolText';
interface OpenInSchematicButtonProps {
  getFiles: () => SharedFile[];
  className?: string;
  labelClassName?: string;
  /** Replaces the default bordered look (e.g. inside a menu). */
  style?: React.CSSProperties;
  label?: string;
  onError?: (message: string) => void;
}

/** Sends the current HDL to the Schematic tool (through the share-link path). */
export function OpenInSchematicButton({ getFiles, className, labelClassName = 'hidden xl:inline', label = 'Schematic', onError, style }: OpenInSchematicButtonProps) {
  const t = useT();
  const navigate = useNavigate();
  const handleClick = async () => {
    const files = getFiles().filter((f) => f.content.trim() !== '');
    if (files.length === 0) {
      onError?.('Nothing to synthesize yet: add some HDL first.');
      return;
    }
    const encoded = await encodeSharePayload({ v: 1, tool: 'schematic', files });
    navigate(`/schematic?${SHARE_PARAM}=${encoded}`);
  };
  return (
    <button
      type="button"
      data-testid="open-in-schematic-btn"
      onClick={handleClick}
      title={t("Open this HDL in the Schematic tool")}
      aria-label={t("Open in Schematic")}
      className={className ?? 'flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-medium border transition-colors shadow-xs'}
      style={style ?? { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
    >
      <GitGraph size={13} />
      <span className={labelClassName}>{t(label)}</span>
    </button>
  );
}
