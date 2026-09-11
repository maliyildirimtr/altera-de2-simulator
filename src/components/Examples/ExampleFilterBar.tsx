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
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: isSelected
                  ? 'rgba(56, 189, 248, 0.15)'
                  : 'rgba(255, 255, 255, 0.04)',
                color: isSelected ? '#38bdf8' : 'var(--text-secondary)',
                border: isSelected
                  ? '1px solid rgba(56, 189, 248, 0.35)'
                  : '1px solid var(--border-color)',
              }}
            >
              <span>{cat.label}</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  backgroundColor: isSelected
                    ? 'rgba(56, 189, 248, 0.25)'
                    : 'rgba(255, 255, 255, 0.08)',
                  color: isSelected ? '#38bdf8' : 'var(--text-secondary)',
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
          minWidth: '260px',
          maxWidth: '340px',
          flex: '1 1 240px',
        }}
      >
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '12px',
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
          placeholder="Search by title, concept, or opcode..."
          style={{
            width: '100%',
            padding: '8px 12px 8px 36px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
            transition: 'border-color 0.15s ease',
          }}
        />
      </div>
    </div>
  );
};
