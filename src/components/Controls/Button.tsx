import React from 'react';
import { useBoardStore } from '../../store/boardStore';

interface ButtonProps {
  index: number;
  label: string;
}

export const Button: React.FC<ButtonProps> = ({ index, label }) => {
  const value = useBoardStore((state) => state.keys[index]);
  const setKey = useBoardStore((state) => state.setKey);

  // Active-low: 0 is pressed, 1 is unpressed
  const isPressed = value === 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className={`w-10 h-10 rounded-full btn-metallic outline-none select-none transition-all duration-75 ${isPressed ? 'btn-pressed' : ''}`}
        onMouseDown={() => setKey(index, true)}
        onMouseUp={() => setKey(index, false)}
        onMouseLeave={() => setKey(index, false)}
        onTouchStart={(e) => { e.preventDefault(); setKey(index, true); }}
        onTouchEnd={(e) => { e.preventDefault(); setKey(index, false); }}
      />
      <span className="silkscreen text-[10px] mt-1">{label}</span>
    </div>
  );
};
