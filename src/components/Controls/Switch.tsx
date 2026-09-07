import React from 'react';
import { useBoardStore } from '../../store/boardStore';

interface SwitchProps {
  index: number;
  label: string;
}

export const Switch: React.FC<SwitchProps> = ({ index, label }) => {
  const value = useBoardStore((state) => state.switches[index]);
  const toggleSwitch = useBoardStore((state) => state.toggleSwitch);

  const isOn = value === 1;

  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        className="switch-base relative w-6 h-12 rounded-sm cursor-pointer flex flex-col justify-between p-0.5"
        onClick={() => toggleSwitch(index)}
      >
        <div 
          className={`switch-toggle absolute left-0 right-0 h-[50%] rounded-sm transition-all duration-150 ease-in-out ${isOn ? 'top-0' : 'top-[50%]'}`}
        />
      </div>
      <span className="silkscreen text-[9px] mt-1">{label}</span>
    </div>
  );
};
