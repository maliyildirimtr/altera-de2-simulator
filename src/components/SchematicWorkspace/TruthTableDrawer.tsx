import React from 'react';

export interface TruthTableRow {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
}

interface TruthTableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  truthTableData: TruthTableRow[];
  activeRowIndex: number | null;
  onRowClick: (index: number) => void;
  isGenerating: boolean;
  totalBits: number;
}

export const TruthTableDrawer: React.FC<TruthTableDrawerProps> = ({
  isOpen,
  onClose,
  truthTableData,
  activeRowIndex,
  onRowClick,
  isGenerating,
  totalBits,
}) => {
  if (!isOpen) return null;

  const hasData = truthTableData.length > 0;
  const inputKeys = hasData ? Object.keys(truthTableData[0].inputs) : [];
  const outputKeys = hasData ? Object.keys(truthTableData[0].outputs) : [];

  return (
    <div
      data-testid="truth-table-drawer"
      style={{
        width: '320px',
        height: '100%',
        flexShrink: 0,
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.85rem',
        overflow: 'hidden',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1rem' }}>📊</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Truth Table</span>
          {hasData && (
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 6px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontWeight: 600,
              }}
            >
              {truthTableData.length} rows (2^{totalBits})
            </span>
          )}
        </div>
        <button
          data-testid="truth-table-close-btn"
          onClick={onClose}
          title="Close Truth Table"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '1.2rem',
            lineHeight: 1,
            padding: '2px 6px',
          }}
        >
          ×
        </button>
      </div>

      {/* Helper text */}
      <div
        style={{
          padding: '6px 14px',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          background: 'rgba(0,0,0,0.1)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        Click any row to apply the input combination to the live circuit.
      </div>

      {/* Content / Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isGenerating ? (
          <div
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>⏳</span>
            <span>Evaluating combinations in live circuit...</span>
          </div>
        ) : hasData ? (
          <table
            data-testid="truth-table-content"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'center',
              fontSize: '0.8rem',
            }}
          >
            <thead
              style={{
                background: 'var(--bg-primary)',
                position: 'sticky',
                top: 0,
                zIndex: 5,
                borderBottom: '2px solid var(--border-color)',
              }}
            >
              <tr>
                <th style={{ padding: '8px 4px', color: 'var(--text-secondary)', width: '32px' }}>
                  #
                </th>
                {inputKeys.map((key) => (
                  <th
                    key={key}
                    style={{
                      padding: '8px 4px',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    {key}
                  </th>
                ))}
                <th
                  style={{
                    borderLeft: '1px solid var(--border-color)',
                    borderRight: '1px solid var(--border-color)',
                    padding: '8px 2px',
                    color: 'var(--border-color)',
                    width: '12px',
                  }}
                >
                  |
                </th>
                {outputKeys.map((key) => (
                  <th
                    key={key}
                    style={{
                      padding: '8px 4px',
                      color: '#38bdf8',
                      fontWeight: 700,
                    }}
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {truthTableData.map((row, idx) => {
                const isActive = activeRowIndex === idx;
                return (
                  <tr
                    key={idx}
                    data-testid={`truth-table-row-${idx}`}
                    onClick={() => onRowClick(idx)}
                    style={{
                      cursor: 'pointer',
                      background: isActive
                        ? 'rgba(56, 189, 248, 0.18)'
                        : idx % 2 === 0
                        ? 'transparent'
                        : 'rgba(255,255,255,0.02)',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td
                      style={{
                        padding: '6px 4px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.7rem',
                      }}
                    >
                      {idx}
                    </td>
                    {inputKeys.map((key) => {
                      const val = row.inputs[key];
                      const isHigh = val === '1' || val.includes('1');
                      return (
                        <td
                          key={key}
                          data-testid={`truth-table-in-${key}-${idx}`}
                          data-logic-value={val}
                          style={{
                            padding: '6px 4px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: isHigh ? '#22c55e' : '#38bdf8',
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                    <td
                      style={{
                        borderLeft: '1px solid var(--border-color)',
                        borderRight: '1px solid var(--border-color)',
                      }}
                    />
                    {outputKeys.map((key) => {
                      const val = row.outputs[key];
                      const isHigh = val === '1' || val.includes('1');
                      return (
                        <td
                          key={key}
                          data-testid={`truth-table-out-${key}-${idx}`}
                          data-logic-value={val}
                          style={{
                            padding: '6px 4px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            color: isHigh ? '#22c55e' : '#38bdf8',
                          }}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            No inputs/outputs found to generate truth table.
          </div>
        )}
      </div>
    </div>
  );
};
