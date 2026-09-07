import React from 'react';
import { useBoardStore } from '../../store/boardStore';

interface HexDisplayProps {
  index: number;
  label: string;
}

export const HexDisplay: React.FC<HexDisplayProps> = ({ index, label }) => {
  const segments = useBoardStore((state) => state.hex[index]);

  const getSegmentColor = (segIndex: number) => {
    return segments[segIndex] === 0 
      ? 'bg-[#ff3333] shadow-[0_0_12px_rgba(255,0,0,0.9),inset_0_0_4px_rgba(255,255,255,0.4)] z-10' 
      : 'bg-[#3a0505] opacity-40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="hex-frame relative w-[44px] h-[60px] rounded-sm flex items-center justify-center shadow-inner">
        <div className="relative w-[40px] h-[56px] bg-[#111] rounded-[1px]">
          {/* Segment 0 (Top) */}
          <div className={`absolute top-[2px] left-[8px] w-[24px] h-[8px] ${getSegmentColor(0)}`} style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)' }} />
          {/* Segment 1 (Top Right) */}
          <div className={`absolute top-[8px] right-[2px] w-[8px] h-[20px] ${getSegmentColor(1)}`} style={{ clipPath: 'polygon(50% 0, 100% 15%, 100% 85%, 50% 100%, 0 85%, 0 15%)' }} />
          {/* Segment 2 (Bottom Right) */}
          <div className={`absolute bottom-[8px] right-[2px] w-[8px] h-[20px] ${getSegmentColor(2)}`} style={{ clipPath: 'polygon(50% 0, 100% 15%, 100% 85%, 50% 100%, 0 85%, 0 15%)' }} />
          {/* Segment 3 (Bottom) */}
          <div className={`absolute bottom-[2px] left-[8px] w-[24px] h-[8px] ${getSegmentColor(3)}`} style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)' }} />
          {/* Segment 4 (Bottom Left) */}
          <div className={`absolute bottom-[8px] left-[2px] w-[8px] h-[20px] ${getSegmentColor(4)}`} style={{ clipPath: 'polygon(50% 0, 100% 15%, 100% 85%, 50% 100%, 0 85%, 0 15%)' }} />
          {/* Segment 5 (Top Left) */}
          <div className={`absolute top-[8px] left-[2px] w-[8px] h-[20px] ${getSegmentColor(5)}`} style={{ clipPath: 'polygon(50% 0, 100% 15%, 100% 85%, 50% 100%, 0 85%, 0 15%)' }} />
          {/* Segment 6 (Middle) */}
          <div className={`absolute top-[24px] left-[8px] w-[24px] h-[8px] ${getSegmentColor(6)}`} style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 85% 100%, 15% 100%, 0 50%)' }} />
        </div>
      </div>
      <span className="silkscreen text-[10px]">{label}</span>
    </div>
  );
};
