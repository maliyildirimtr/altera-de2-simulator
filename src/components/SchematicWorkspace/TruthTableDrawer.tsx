import React from 'react';
import { Table2, Loader2, X } from 'lucide-react';

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
  width?: number;
  isMobile?: boolean;
}

export const TruthTableDrawer: React.FC<TruthTableDrawerProps> = ({
  isOpen,
  onClose,
  truthTableData,
  activeRowIndex,
  onRowClick,
  isGenerating,
  totalBits,
  width = 340,
  isMobile = false,
}) => {
  if (!isOpen) return null;

  const hasData = truthTableData.length > 0;
  const inputKeys = hasData ? Object.keys(truthTableData[0].inputs) : [];
  const outputKeys = hasData ? Object.keys(truthTableData[0].outputs) : [];

  const drawerStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '60vh',
        maxHeight: '60vh',
        backgroundColor: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-subtle)',
        boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.85rem',
        overflow: 'hidden',
        zIndex: 40,
      }
    : {
        width: `${width}px`,
        height: '100%',
        flexShrink: 0,
        backgroundColor: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.85rem',
        overflow: 'hidden',
        zIndex: 10,
      };

  return (
    <div data-testid="truth-table-drawer" style={drawerStyle}>
      {/* Mobile Drawer Drag Handle Indicator */}
      {isMobile && (
        <div style={{ padding: '6px 0 2px', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: 'var(--border-strong)',
            }}
          />
        </div>
      )}

      {/* Drawer Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          backgroundColor: 'var(--bg-panel-header)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Table2 size={15} className="text-sky-400" />
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
            Truth Table
          </span>
          {hasData && (
            <span
              style={{
                fontSize: '0.7rem',
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
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Helper text */}
      <div
        style={{
          padding: '6px 12px',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        Click any row to apply input combinations to the circuit.
      </div>

      {/* Content / Table Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
        }}
      >
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
            <Loader2 size={20} className="animate-spin text-sky-400" />
            <span style={{ fontSize: '0.8rem' }}>Evaluating combinations in live circuit...</span>
          </div>
        ) : hasData ? (
          <table
            data-testid="truth-table-content"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'center',
              fontSize: '0.78rem',
            }}
          >
            <thead
              style={{
                background: 'var(--bg-panel)',
                position: 'sticky',
                top: 0,
                zIndex: 5,
                borderBottom: '2px solid var(--border-subtle)',
              }}
            >
              <tr>
                <th
                  style={{
                    padding: '6px 4px',
                    color: 'var(--text-muted)',
                    width: '32px',
                    fontWeight: 600,
                  }}
                >
                  #
                </th>
                {inputKeys.map((key) => (
                  <th
                    key={key}
                    title={key}
                    style={{
                      padding: '6px 4px',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      maxWidth: '75px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {key}
                  </th>
                ))}
                <th
                  style={{
                    borderLeft: '1px solid var(--border-subtle)',
                    borderRight: '1px solid var(--border-subtle)',
                    padding: '6px 2px',
                    color: 'var(--border-subtle)',
                    width: '10px',
                  }}
                >
                  |
                </th>
                {outputKeys.map((key) => (
                  <th
                    key={key}
                    title={key}
                    style={{
                      padding: '6px 4px',
                      color: '#38bdf8',
                      fontWeight: 700,
                      maxWidth: '75px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
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
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td
                      style={{
                        padding: '5px 4px',
                        color: 'var(--text-muted)',
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
                            padding: '5px 4px',
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
                        borderLeft: '1px solid var(--border-subtle)',
                        borderRight: '1px solid var(--border-subtle)',
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
                            padding: '5px 4px',
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
              fontSize: '0.8rem',
            }}
          >
            No inputs/outputs found to generate truth table.
          </div>
        )}
      </div>
    </div>
  );
};
