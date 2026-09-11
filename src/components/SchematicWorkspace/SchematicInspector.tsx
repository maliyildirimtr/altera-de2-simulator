import React from 'react';

export interface SelectedItemInfo {
  id: string;
  name: string;
  type: string;
  isLink?: boolean;
  logicValue?: string;
  bits?: number;
  connections?: any;
  givenName?: string;
  source?: string;
  target?: string;
}

interface SchematicInspectorProps {
  selectedItem: SelectedItemInfo | null;
  circuitData: any;
  topModule?: string;
  synthesisStatus?: 'no_source' | 'synthesizing' | 'ready' | 'error' | 'modified';
  onSetInputValue?: (inputId: string, value: string) => void;
  onClose?: () => void;
}

// Educational static hints per Point 8
const STATIC_COMPONENT_HINTS: Record<string, string> = {
  AND: 'Output is 1 only when all inputs are 1.',
  $_AND_: 'Output is 1 only when all inputs are 1.',
  OR: 'Output is 1 when at least one input is 1.',
  $_OR_: 'Output is 1 when at least one input is 1.',
  NOT: 'Output is the logical inversion of the input.',
  $_NOT_: 'Output is the logical inversion of the input.',
  XOR: 'Output is 1 when inputs are different.',
  $_XOR_: 'Output is 1 when inputs are different.',
  NAND: 'Output is 0 only when all inputs are 1.',
  $_NAND_: 'Output is 0 only when all inputs are 1.',
  NOR: 'Output is 0 when at least one input is 1.',
  $_NOR_: 'Output is 0 when at least one input is 1.',
  XNOR: 'Output is 1 when inputs are equal.',
  $_XNOR_: 'Output is 1 when inputs are equal.',
  MUX: 'Select chooses which input reaches the output.',
  $_MUX_: 'Select chooses which input reaches the output.',
  DFF: 'Stores/samples D according to the clock edge.',
  $_DFF_P_: 'Positive-edge triggered D flip-flop.',
  $_DFF_N_: 'Negative-edge triggered D flip-flop.',
  Input: 'Toggle or drive logic values into the circuit.',
  Output: 'Monitors and displays the driven output logic state.',
};

export const SchematicInspector: React.FC<SchematicInspectorProps> = ({
  selectedItem,
  circuitData,
  topModule,
  synthesisStatus,
  onSetInputValue,
  onClose,
}) => {
  // Normalize component type for hint lookup
  const getHint = (type: string): string | null => {
    if (!type) return null;
    const cleanType = type.replace(/^\$_/, '').replace(/_$/, '');
    return (
      STATIC_COMPONENT_HINTS[type] ||
      STATIC_COMPONENT_HINTS[cleanType] ||
      STATIC_COMPONENT_HINTS[cleanType.toUpperCase()] ||
      null
    );
  };

  // Summarize overall circuit stats when nothing is selected
  const devices = circuitData?.devices || {};
  const deviceList = Object.entries<any>(devices);
  const inputs = deviceList.filter(([, dev]) => dev.type === 'Input');
  const outputs = deviceList.filter(([, dev]) => dev.type === 'Output');
  const gates = deviceList.filter(
    ([, dev]) => dev.type !== 'Input' && dev.type !== 'Output'
  );

  return (
    <aside
      data-testid="schematic-inspector"
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontSize: '0.85rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <span>🔍</span>
          <span>Inspector</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title="Close Inspector"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {selectedItem ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Item Identification */}
            <div
              style={{
                padding: '10px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                }}
              >
                {selectedItem.isLink ? 'Interconnect Wire' : 'Circuit Component'}
              </div>
              <div
                data-testid="inspector-selected-name"
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--text-primary)',
                  wordBreak: 'break-all',
                }}
              >
                {selectedItem.name || selectedItem.id}
              </div>
              <div
                data-testid="inspector-selected-type"
                style={{
                  color: '#38bdf8',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  marginTop: '2px',
                }}
              >
                Type: {selectedItem.type}
              </div>
            </div>

            {/* Live Logic Value */}
            {selectedItem.logicValue !== undefined && (
              <div
                style={{
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Current Logic Value:
                </span>
                <span
                  data-testid="inspector-logic-value"
                  data-logic-value={selectedItem.logicValue}
                  style={{
                    padding: '2px 10px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    background:
                      selectedItem.logicValue === '1'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : selectedItem.logicValue === '0'
                        ? 'rgba(56, 189, 248, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                    color:
                      selectedItem.logicValue === '1'
                        ? '#22c55e'
                        : selectedItem.logicValue === '0'
                        ? '#38bdf8'
                        : '#f59e0b',
                    border: `1px solid ${
                      selectedItem.logicValue === '1'
                        ? '#22c55e'
                        : selectedItem.logicValue === '0'
                        ? '#38bdf8'
                        : '#f59e0b'
                    }`,
                  }}
                >
                  {selectedItem.logicValue}
                </span>
              </div>
            )}

            {/* Input Toggle Controls if this is an Input element */}
            {selectedItem.type === 'Input' && onSetInputValue && (
              <div
                data-testid="inspector-input-forcing"
                style={{
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Force Input Bit:
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    data-testid="inspector-set-input-0"
                    onClick={() => onSetInputValue(selectedItem.id, '0')}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background:
                        selectedItem.logicValue === '0'
                          ? 'rgba(56, 189, 248, 0.3)'
                          : 'var(--bg-secondary)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      borderRadius: '4px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Force 0 (Low)
                  </button>
                  <button
                    data-testid="inspector-set-input-1"
                    onClick={() => onSetInputValue(selectedItem.id, '1')}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background:
                        selectedItem.logicValue === '1'
                          ? 'rgba(34, 197, 94, 0.3)'
                          : 'var(--bg-secondary)',
                      border: '1px solid #22c55e',
                      color: '#22c55e',
                      borderRadius: '4px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Force 1 (High)
                  </button>
                </div>
              </div>
            )}

            {/* Educational Component Hint */}
            {getHint(selectedItem.type) && (
              <div
                data-testid="inspector-educational-hint"
                style={{
                  padding: '10px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                }}
              >
                <div
                  style={{
                    color: '#38bdf8',
                    fontWeight: 600,
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>💡</span>
                  <span>Component Principle</span>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {getHint(selectedItem.type)}
                </div>
              </div>
            )}

            {/* Connectivity Info */}
            {selectedItem.isLink && (
              <div
                style={{
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Connectivity</div>
                {selectedItem.source && <div>From: {selectedItem.source}</div>}
                {selectedItem.target && <div>To: {selectedItem.target}</div>}
              </div>
            )}
          </div>
        ) : synthesisStatus === 'error' ? (
          /* Error State - Dedicated Unavailable Display (Point 6 & 11) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              data-testid="inspector-error-state"
              style={{
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>⚠️</div>
              <div
                data-testid="inspector-unavailable-title"
                style={{ fontWeight: 700, color: '#f87171', fontSize: '0.9rem' }}
              >
                SCHEMATIC UNAVAILABLE
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                The latest synthesis failed. Fix syntax errors in the HDL editor and synthesize again.
              </div>
            </div>
          </div>
        ) : !circuitData ? (
          /* No Schematic / Clean Empty State */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              data-testid="inspector-no-schematic-state"
              style={{
                padding: '16px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>📐</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                NO CURRENT SCHEMATIC
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                Synthesize your HDL design to generate and inspect the digital logic schematic.
              </div>
            </div>
          </div>
        ) : (
          /* Valid Circuit Overview (Point 5 copy corrected) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '10px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  marginBottom: '4px',
                }}
              >
                Synthesized Module
              </div>
              <div
                data-testid="inspector-top-module"
                style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}
              >
                {topModule || circuitData?._topModule || 'Top Module'}
              </div>
            </div>

            {/* Statistics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  padding: '8px 4px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
                  {inputs.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Inputs</div>
              </div>
              <div
                style={{
                  padding: '8px 4px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e' }}>
                  {outputs.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Outputs</div>
              </div>
              <div
                style={{
                  padding: '8px 4px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-color)' }}>
                  {gates.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Logic Gates</div>
              </div>
            </div>

            {/* Port Lists */}
            {inputs.length > 0 && (
              <div
                style={{
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  Circuit Inputs:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {inputs.map(([id, dev]) => (
                    <span
                      key={id}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {dev.label || id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {outputs.length > 0 && (
              <div
                style={{
                  padding: '10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '6px',
                  }}
                >
                  Circuit Outputs:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {outputs.map(([id, dev]) => (
                    <span
                      key={id}
                      style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        color: '#22c55e',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {dev.label || id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                textAlign: 'center',
                padding: '10px 0',
                fontStyle: 'italic',
              }}
            >
              Click any gate or port in the schematic diagram to inspect its properties and logic values.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
