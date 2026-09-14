import React, { useState } from 'react';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';

export const LogicLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const legendItems = [
    { label: 'LOGIC 1', color: '#22c55e', desc: 'High (Vcc / Active)' },
    { label: 'LOGIC 0', color: '#52789c', desc: 'Low (Gnd / Inactive)' },
    { label: 'UNKNOWN X', color: '#f59e0b', desc: 'Undefined / Conflict' },
    { label: 'HIGH-Z Z', color: '#a855f7', desc: 'Tri-state / Float' },
  ];

  return (
    <div
      data-testid="schematic-logic-legend"
      style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        zIndex: 10,
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '6px',
        padding: isExpanded ? '8px 12px' : '4px 8px',
        fontSize: '0.75rem',
        boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.15))',
        userSelect: 'none',
        transition: 'all 0.15s ease',
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 cursor-pointer text-left bg-transparent border-none p-0"
        style={{
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}
      >
        <Zap size={12} className="text-[var(--text-muted)]" />
        <span className="text-[11px] font-sans">Logic Colors</span>
        <span className="inline-flex items-center text-[var(--text-muted)]">
          {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </span>
      </button>

      {isExpanded ? (
        <div className="mt-2 flex flex-col gap-1.5 font-sans">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  backgroundColor: item.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  minWidth: '64px',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                }}
              >
                {item.label}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1 font-mono text-[11px]">
          <div className="flex items-center gap-1">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
              }}
            />
            <span style={{ color: '#22c55e', fontWeight: 700 }}>1</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#52789c',
              }}
            />
            <span style={{ color: '#52789c', fontWeight: 700 }}>0</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
              }}
            />
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>X</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#a855f7',
              }}
            />
            <span style={{ color: '#a855f7', fontWeight: 700 }}>Z</span>
          </div>
        </div>
      )}
    </div>
  );
};
