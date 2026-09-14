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
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.82rem',
        overflow: 'hidden',
        zIndex: 40,
      }
    : {
        width: `${width}px`,
        height: '100%',
        flexShrink: 0,
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.82rem',
        overflow: 'hidden',
        zIndex: 10,
      };

  // Restrained logic value coloring adhering to DigitalJS logic semantics
  const getLogicColor = (val: string) => {
    if (val === '1' || val.includes('1')) return '#16a34a'; // restrained success green
    if (val === '0' || val.includes('0')) return 'var(--text-secondary)'; // neutral / subdued
    if (val.toUpperCase().includes('X')) return '#f59e0b'; // amber
    if (val.toUpperCase().includes('Z')) return '#a855f7'; // purple
    return 'var(--text-primary)';
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
        className="h-9 px-3 flex items-center justify-between shrink-0 select-none"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-panel-header)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Table2 size={13} className="text-blue-500 shrink-0" />
          <span
            className="text-[11px] font-bold uppercase tracking-wider truncate"
            style={{ color: 'var(--text-muted)' }}
          >
            Truth Table
          </span>
          {hasData && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 border font-medium"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
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
          className="p-1 rounded-[4px] hover:bg-[var(--bg-hover)] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={14} />
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
            <Loader2 size={18} className="animate-spin text-blue-500" />
            <span style={{ fontSize: '0.78rem' }}>Evaluating combinations in live circuit...</span>
          </div>
        ) : hasData ? (
          <table
            data-testid="truth-table-content"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'center',
              fontSize: '0.76rem',
            }}
          >
            <thead
              style={{
                background: 'var(--bg-panel-header)',
                position: 'sticky',
                top: 0,
                zIndex: 5,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {/* Group category header */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: '0.68rem' }}>
                <th style={{ padding: '3px 4px', color: 'var(--text-muted)' }} />
                <th
                  colSpan={inputKeys.length}
                  style={{
                    padding: '3px 4px',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Inputs
                </th>
                <th style={{ width: '8px', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }} />
                <th
                  colSpan={outputKeys.length}
                  style={{
                    padding: '3px 4px',
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Outputs
                </th>
              </tr>
              {/* Variable names header */}
              <tr>
                <th
                  style={{
                    padding: '5px 4px',
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
                      padding: '5px 4px',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
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
                    padding: '5px 2px',
                    color: 'var(--border-subtle)',
                    width: '8px',
                  }}
                >
                  |
                </th>
                {outputKeys.map((key) => (
                  <th
                    key={key}
                    title={key}
                    style={{
                      padding: '5px 4px',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
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
                        ? 'var(--accent-subtle)'
                        : idx % 2 === 0
                        ? 'transparent'
                        : 'var(--bg-app)',
                      borderBottom: '1px solid var(--border-subtle)',
                      outline: isActive ? '1px solid var(--accent-border)' : 'none',
                      outlineOffset: '-1px',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    <td
                      style={{
                        padding: '4px 4px',
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      {idx}
                    </td>
                    {inputKeys.map((key) => {
                      const val = row.inputs[key];
                      return (
                        <td
                          key={key}
                          data-testid={`truth-table-in-${key}-${idx}`}
                          data-logic-value={val}
                          style={{
                            padding: '4px 4px',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            color: getLogicColor(val),
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
                      return (
                        <td
                          key={key}
                          data-testid={`truth-table-out-${key}-${idx}`}
                          data-logic-value={val}
                          style={{
                            padding: '4px 4px',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            color: getLogicColor(val),
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
              fontSize: '0.78rem',
            }}
          >
            No inputs/outputs found to generate truth table.
          </div>
        )}
      </div>
    </div>
  );
};
