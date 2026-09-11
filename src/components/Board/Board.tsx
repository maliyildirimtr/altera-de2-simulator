import React from 'react';
import { Switch } from '../Controls/Switch';
import { Button } from '../Controls/Button';
import { Led } from '../Indicators/Led';
import { HexDisplay } from '../Indicators/HexDisplay';

export const Board: React.FC = () => {
  return (
    <div data-testid="de2-board" className="pcb-board relative w-[1200px] h-[750px] shrink-0 overflow-hidden shadow-2xl">

      {/* PCB horizontal trace bus lines — authentic DE2 routing layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={{ opacity: 0.18 }}>
        {[80, 140, 200, 430, 500, 560, 620, 680].map(y => (
          <div key={y} className="absolute left-0 right-0 h-px" style={{ top: y, background: 'linear-gradient(90deg, transparent 2%, #60a0e0 10%, #60a0e0 90%, transparent 98%)' }} />
        ))}
        {/* Vertical trace columns */}
        {[440, 600, 800, 1000, 1080].map(x => (
          <div key={x} className="absolute top-0 bottom-0 w-px" style={{ left: x, background: 'linear-gradient(180deg, transparent 2%, #60a0e0 10%, #60a0e0 90%, transparent 98%)' }} />
        ))}
      </div>

      {/* 4 Corner Mounting Screws (M3 brass) */}
      <div className="screw absolute top-4 left-4 z-20" />
      <div className="screw absolute top-4 right-4 z-20" />
      <div className="screw absolute bottom-4 left-4 z-20" />
      <div className="screw absolute bottom-4 right-4 z-20" />

      {/* Additional mid-board mounting holes */}
      <div className="screw absolute top-4 left-[50%] z-20" style={{ transform: 'translateX(-50%)' }} />
      <div className="screw absolute bottom-4 left-[38%] z-20" />

      {/* PCB via markers (decorative) */}
      {[[60, 90], [440, 90], [800, 90], [1100, 90], [60, 660], [440, 660]].map(([x, y], i) => (
        <div key={i} className="absolute z-5 pointer-events-none" style={{ left: x, top: y }}>
          <div style={{
            width: 10, height: 10,
            borderRadius: '50%',
            border: '1.5px solid rgba(120,180,240,0.5)',
            background: 'radial-gradient(circle, rgba(80,140,200,0.4) 0%, transparent 70%)'
          }} />
        </div>
      ))}

      {/* Top Edge Connectors (GPIO / Expansion) */}
      <div className="absolute top-0 left-[8%] right-[8%] h-14 flex gap-3 items-start pointer-events-none z-10">
        {/* GPIO Header 0 */}
        <div className="flex flex-col items-center gap-0.5 mt-1">
          <div className="w-20 h-8 bg-gray-300 border-b-2 border-gray-500 shadow-md" style={{ background: 'linear-gradient(to bottom, #d0d0d0, #a0a0a0)' }} />
          <span className="silkscreen-ref" style={{ fontSize: 7 }}>GPIO-0</span>
        </div>
        {/* GPIO Header 1 */}
        <div className="flex flex-col items-center gap-0.5 mt-1">
          <div className="w-20 h-8 bg-gray-300 border-b-2 border-gray-500 shadow-md" style={{ background: 'linear-gradient(to bottom, #d0d0d0, #a0a0a0)' }} />
          <span className="silkscreen-ref" style={{ fontSize: 7 }}>GPIO-1</span>
        </div>
        {/* Audio / Video connectors */}
        <div className="w-8 h-8 rounded-full bg-pink-500 mt-2 shadow-md border border-pink-300" title="Audio IN" />
        <div className="w-8 h-8 rounded-full bg-blue-500 mt-2 shadow-md border border-blue-300" title="VGA" />
        <div className="w-8 h-8 rounded-full bg-green-500 mt-2 shadow-md border border-green-300" title="Audio OUT" />
        {/* Right side: USB, RS232, Power */}
        <div className="ml-auto flex items-start gap-3 mt-1">
          <div className="flex flex-col items-center">
            <div className="w-16 h-10 shadow-lg border border-gray-700" style={{ background: 'linear-gradient(to bottom, #1a1a1a, #0a0a0a)', borderRadius: 2 }} />
            <span className="silkscreen-ref mt-0.5" style={{ fontSize: 7 }}>USB</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-14 h-8 shadow-md border border-gray-500 mt-1" style={{ background: 'linear-gradient(to bottom, #c0c0c0, #909090)' }} />
            <span className="silkscreen-ref mt-0.5" style={{ fontSize: 7 }}>RS232</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-10 shadow-lg border border-gray-700" style={{ background: 'linear-gradient(to bottom, #1a1a1a, #0a0a0a)', borderRadius: 2 }} />
            <span className="silkscreen-ref mt-0.5" style={{ fontSize: 7 }}>POWER</span>
          </div>
        </div>
      </div>

      {/* 16x2 LCD Screen */}
      <div className="absolute left-[60px] top-[290px] z-10">
        <div className="w-[360px] h-[120px] lcd-screen rounded-sm flex items-center justify-center p-3 relative">
          <div className="w-full h-full lcd-backlight border border-black flex items-center justify-center shadow-inner">
            <span className="font-mono text-black text-3xl font-bold opacity-80">16x2 LCD</span>
          </div>
          {/* LCD Mount holes */}
          <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-yellow-600" />
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-600" />
          <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-yellow-600" />
          <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-yellow-600" />
        </div>
        <div className="text-center mt-1">
          <span className="silkscreen-ref" style={{ fontSize: 8 }}>LCD MODULE — J1</span>
        </div>
      </div>

      {/* Center Silkscreen Branding — Altera DE2 */}
      <div className="absolute left-[460px] top-[130px] flex flex-col items-center z-10">
        {/* Altera logo text */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-8 rounded-sm" style={{ background: 'linear-gradient(to bottom, #4a90d9, #2060a0)' }} />
          <h1 className="silkscreen text-4xl font-black italic tracking-widest text-white">ALTERA</h1>
          <div className="w-2 h-8 rounded-sm" style={{ background: 'linear-gradient(to bottom, #4a90d9, #2060a0)' }} />
        </div>
        <h2 className="silkscreen text-xs tracking-[0.3em] text-blue-200 mb-1">UNIVERSITY PROGRAM</h2>
        {/* Cyclone II chip family label */}
        <div className="px-3 py-0.5 rounded" style={{ background: 'rgba(30,90,160,0.4)', border: '1px solid rgba(100,160,220,0.4)' }}>
          <span className="silkscreen text-xs text-blue-100 tracking-widest">Cyclone® II</span>
        </div>

        {/* Large DE2 model number */}
        <div className="mt-8 relative">
          <h1 className="silkscreen text-[80px] font-black text-white leading-none tracking-tight"
            style={{ textShadow: '0 0 30px rgba(100,160,255,0.3), 0 4px 8px rgba(0,0,0,0.8)' }}>
            DE2
          </h1>
          {/* Board serial / part # */}
          <span className="absolute -bottom-4 right-0 silkscreen-ref text-[9px] tracking-widest">P0028</span>
        </div>

        {/* RoHS compliance mark */}
        <div className="mt-8 flex items-center gap-2">
          <div className="px-2 py-0.5 border border-blue-400/30 rounded">
            <span className="silkscreen-ref text-[8px]">RoHS</span>
          </div>
          <div className="px-2 py-0.5 border border-blue-400/30 rounded">
            <span className="silkscreen-ref text-[8px]">CE</span>
          </div>
        </div>
      </div>

      {/* SDRAM / SRAM chip area */}
      <div className="absolute left-[460px] top-[380px] z-10 flex gap-4">
        {/* SDRAM */}
        <div className="flex flex-col items-center">
          <div className="w-[100px] h-[60px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)', border: '1px solid #2a2a2a', borderRadius: 2, boxShadow: '0 3px 8px rgba(0,0,0,0.7)' }}>
            <div>
              <div className="silkscreen text-[9px] text-center text-gray-300">SDRAM</div>
              <div className="silkscreen-ref text-[7px] text-center mt-0.5">8Mx16bit</div>
            </div>
          </div>
          <span className="silkscreen-ref mt-1" style={{ fontSize: 7 }}>U6 — SDRAM</span>
        </div>
        {/* SRAM */}
        <div className="flex flex-col items-center">
          <div className="w-[80px] h-[50px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)', border: '1px solid #2a2a2a', borderRadius: 2, boxShadow: '0 3px 8px rgba(0,0,0,0.7)' }}>
            <div>
              <div className="silkscreen text-[9px] text-center text-gray-300">SRAM</div>
              <div className="silkscreen-ref text-[7px] text-center mt-0.5">512Kx8</div>
            </div>
          </div>
          <span className="silkscreen-ref mt-1" style={{ fontSize: 7 }}>U7 — SRAM</span>
        </div>
      </div>

      {/* FPGA Chip — Altera Cyclone II EP2C35F672C6 */}
      <div className="absolute left-[800px] top-[230px] z-10">
        <div className="w-[180px] h-[180px] fpga-chip flex items-center justify-center flex-col relative">
          <span className="silkscreen text-[13px] text-gray-300 z-10">ALTERA</span>
          <span className="silkscreen text-[17px] font-black text-white my-1 z-10">Cyclone II</span>
          <span className="silkscreen text-[10px] text-blue-200 z-10">EP2C35F672C6</span>
          <span className="silkscreen-ref text-[8px] mt-1 z-10">240K LE</span>
          {/* Pin 1 marker */}
          <div className="absolute top-3 left-3 w-3 h-3 rounded-full z-10" style={{ background: '#c8961a' }} />
        </div>
        <div className="text-center mt-1">
          <span className="silkscreen-ref text-[8px]">U1 — FPGA</span>
        </div>
      </div>

      {/* Clock oscillator */}
      <div className="absolute left-[800px] top-[450px] z-10">
        <div className="flex flex-col items-center">
          <div className="w-[60px] h-[30px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0d060, #a07010)', border: '1px solid #806010', borderRadius: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
            <span className="silkscreen text-[9px] font-black text-black">50MHz</span>
          </div>
          <span className="silkscreen-ref mt-1 text-[7px]">Y1 — CLOCK</span>
        </div>
      </div>

      {/* 7-Segment Displays */}
      <div className="absolute left-[60px] top-[460px] flex gap-6 items-start z-10">
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1.5">
            <HexDisplay index={7} label="HEX7" />
            <HexDisplay index={6} label="HEX6" />
          </div>
          <span className="silkscreen-ref text-[7px]">HEX6–7</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1.5">
            <HexDisplay index={5} label="HEX5" />
            <HexDisplay index={4} label="HEX4" />
          </div>
          <span className="silkscreen-ref text-[7px]">HEX4–5</span>
        </div>

        {/* LEDG8 centered between displays */}
        <div className="flex flex-col items-center mt-3">
          <Led index={8} type="green" label="LEDG8" />
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1.5">
            <HexDisplay index={3} label="HEX3" />
            <HexDisplay index={2} label="HEX2" />
            <HexDisplay index={1} label="HEX1" />
            <HexDisplay index={0} label="HEX0" />
          </div>
          <span className="silkscreen-ref text-[7px]">HEX0–3</span>
        </div>
      </div>

      {/* ── 18 Switches & Red LEDs ── */}
      <div className="absolute" style={{ bottom: 14, left: 36, right: 'auto' }}>
        <span className="silkscreen-ref text-[7px] absolute -top-4 left-0">SW[17..0] / LEDR[17..0]</span>
      </div>
      {Array.from({ length: 18 }).map((_, i) => {
        const index = 17 - i;
        return (
          <div
            key={`sw-slot-${index}`}
            className="absolute flex flex-col justify-between items-center"
            style={{ left: 40 + (17 - index) * 40, bottom: 25, width: 36, height: 110 }}
          >
            <Led index={index} type="red" label={`LEDR${index}`} />
            <Switch index={index} label={`SW${index}`} />
          </div>
        );
      })}

      {/* ── 8 Green LEDs (LEDG7–LEDG0) + 4 KEY Buttons ── */}
      {Array.from({ length: 8 }).map((_, i) => {
        const index = 7 - i;
        const hasKey = index % 2 === 0;
        const keyIndex = index / 2;

        return (
          <div
            key={`ledg-slot-${index}`}
            className="absolute flex flex-col justify-between items-center"
            style={{ right: 52 + index * 48, bottom: 25, width: 48, height: 110 }}
          >
            <Led index={index} type="green" label={`LEDG${index}`} />
            {hasKey ? (
              <Button index={keyIndex} label={`KEY${keyIndex}`} />
            ) : (
              <div className="w-10 h-10" />
            )}
          </div>
        );
      })}

      {/* KEY / LEDG reference label */}
      <div className="absolute z-10 pointer-events-none" style={{ bottom: 142, right: 52 }}>
        <span className="silkscreen-ref text-[7px]">LEDG[7..0] / KEY[3..0]</span>
      </div>

    </div>
  );
};
