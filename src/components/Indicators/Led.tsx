import React from 'react';
import { useBoardStore } from '../../store/boardStore';

interface LedProps {
  index: number;
  type: 'red' | 'green';
  label: string;
}

export const Led: React.FC<LedProps> = ({ index, type, label }) => {
  const value = useBoardStore((state) => 
    type === 'red' ? state.ledR[index] : state.ledG[index]
  );

  const isOn = value === 1;
  const activeClass = type === 'red' ? 'led-red' : 'led-green';
  const inactiveClass = type === 'red' ? 'led-red-off' : 'led-green-off';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-3 h-5 rounded-[2px] transition-all duration-75 ${isOn ? activeClass : inactiveClass}`}
      />
      <span className="silkscreen text-[8px]">{label}</span>
    </div>
  );
};
