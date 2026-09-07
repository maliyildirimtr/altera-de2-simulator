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
          className={`flex items-center gap-1 py-1 px-2 cursor-pointer text-sm
            ${isActive ? 'bg-[#37373d] text-white' : 'text-gray-300 hover:bg-[#2a2d3e]'}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => onScopeSelect(scope)}
        >
          {hasChildren ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(p => ({ ...p, [fullPath]: !p[fullPath] }));
              }}
              className="text-gray-500 hover:text-white"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="w-3.5" />
          )}
          <Cpu size={14} className={isActive ? 'text-blue-400' : 'text-gray-500'} />
          <span className="truncate">{scope.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {Object.values(scope.children).map(child => renderScope(child, depth + 1, fullPath))}
          </div>
        )}
      </div>
    );
  };

  return <div className="py-2">{renderScope(tree)}</div>;
}
