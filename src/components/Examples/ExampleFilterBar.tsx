import React from 'react';
import { Search } from 'lucide-react';
import type { ExampleCategory } from '../../examples/types';

export type ExampleFilterKey = ExampleCategory | 'all' | 'de2';

interface ExampleFilterBarProps {
  selectedCategory: ExampleFilterKey;
  onSelectCategory: (cat: ExampleFilterKey) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categoryCounts: Record<string, number>;
}

const CATEGORIES: { id: ExampleFilterKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'combinational', label: 'Combinational' },
  { id: 'sequential', label: 'Sequential' },
  { id: 'arithmetic', label: 'Arithmetic' },
  { id: 'routing', label: 'Routing' },
  { id: 'de2', label: 'DE2' },
];

export const ExampleFilterBar: React.FC<ExampleFilterBarProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  categoryCounts,
}) => {
  return (
    <div
      data-testid="example-filter-bar"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '28px',
      }}
    >
      {/* Category Pills */}
      <div
        data-testid="example-category-filters"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] ?? 0;

          return (
            <button
              key={cat.id}
              data-testid={`filter-category-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isSelected
                  ? 'var(--accent-subtle)'
                  : 'var(--bg-panel)',
                color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: isSelected
                  ? '1px solid var(--accent-border)'
                  : '1px solid var(--border-subtle)',
              }}
            >
              <span>{cat.label}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  backgroundColor: isSelected
                    ? 'var(--accent-subtle)'
                    : 'var(--bg-surface)',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div
        style={{
          position: 'relative',
          minWidth: '240px',
          maxWidth: '320px',
          flex: '1 1 220px',
        }}
      >
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          data-testid="example-search-input"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by title, module, or topic..."
          style={{
            width: '100%',
            padding: '6px 10px 6px 32px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            outline: 'none',
            transition: 'border-color 0.15s ease',
          }}
        />
      </div>
    </div>
  );
};
