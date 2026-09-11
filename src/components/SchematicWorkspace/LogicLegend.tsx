import React, { useState } from 'react';

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
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: isExpanded ? '8px 12px' : '4px 8px',
        fontSize: '0.75rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        userSelect: 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: '0.85rem' }}>⚡</span>
        <span>Logic Colors</span>
        <span style={{ fontSize: '0.7rem' }}>{isExpanded ? '▼' : '▲'}</span>
      </div>

      {isExpanded ? (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {legendItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: item.color,
                  boxShadow: `0 0 6px ${item.color}80`,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', minWidth: '70px' }}>
                {item.label}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 4px #22c55e',
              }}
            />
            <span style={{ color: '#22c55e', fontWeight: 600 }}>1</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#52789c',
                boxShadow: '0 0 4px #52789c',
              }}
            />
            <span style={{ color: '#52789c', fontWeight: 600 }}>0</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
              }}
            />
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>X</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#a855f7',
              }}
            />
            <span style={{ color: '#a855f7', fontWeight: 600 }}>Z</span>
          </div>
        </div>
      )}
    </div>
  );
};
