import { useState } from 'react';
import type { VCDScope } from '../../services/vcdParser';
import { ChevronRight, ChevronDown, Cpu } from 'lucide-react';

export interface InstanceTreeProps {
  tree?: VCDScope | null; // Make tree optional to fix TS2741
  activeScope: VCDScope | null;
  onScopeSelect: (scope: VCDScope) => void;
}

export function InstanceTree({ tree, activeScope, onScopeSelect }: InstanceTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Root: true });

  if (!tree) return null;


  const renderScope = (scope: VCDScope, depth = 0, path = '') => {
    const fullPath = path ? `${path}.${scope.name}` : scope.name;
    const hasChildren = Object.keys(scope.children).length > 0;
    const isExpanded = expanded[fullPath] ?? (depth === 0); // root starts expanded
    const isActive = activeScope === scope; // reference equality — safest

    return (
      <div key={fullPath} className="select-none">
        <div
          className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer text-xs font-mono transition-colors ${
            isActive
              ? 'bg-[var(--accent-subtle)] text-[var(--text-primary)] font-semibold rounded-[3px]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] rounded-[3px]'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => onScopeSelect(scope)}
        >
          {hasChildren ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(p => ({ ...p, [fullPath]: !p[fullPath] }));
              }}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors"
            >
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          ) : (
            <span className="w-3" />
          )}
          <Cpu size={13} className={isActive ? 'text-[var(--accent-primary)] shrink-0' : 'text-[var(--text-muted)] shrink-0'} />
          <span className="truncate">{scope.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-[var(--border-subtle)]/40 ml-3">
            {Object.values(scope.children).map(child => renderScope(child, depth + 1, fullPath))}
          </div>
        )}
      </div>
    );
  };

  return <div className="py-1">{renderScope(tree)}</div>;
}
