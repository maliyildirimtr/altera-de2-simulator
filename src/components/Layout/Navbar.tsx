import React from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, Home, Cpu, GitGraph, BookOpen, Sun, Moon, Activity } from 'lucide-react';

interface NavbarProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isDarkMode, setIsDarkMode }) => {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium text-sm ${
      isActive 
        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <nav className="w-full h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-40 sticky top-0 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Zap size={18} className="text-white" />
        </div>
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-wide">
          Virtual FPGA Lab
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <NavLink to="/" className={navLinkClass}>
          <Home size={16} />
          <span>Ana Sayfa</span>
        </NavLink>
        <NavLink to="/de2-simulator" className={navLinkClass}>
          <Cpu size={16} />
          <span>DE2 Lab</span>
        </NavLink>
        <NavLink to="/waveform" className={navLinkClass}>
          <Activity size={16} />
          <span>ModelSim</span>
        </NavLink>
        <NavLink to="/schematic" className={navLinkClass}>
          <GitGraph size={16} />
          <span>Şematize</span>
        </NavLink>
        <NavLink to="/projects" className={navLinkClass}>
          <BookOpen size={16} />
          <span>Projeler</span>
        </NavLink>
        
        <div className="w-px h-6 bg-slate-700 mx-2"></div>

        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isDarkMode ? 'Açık Tema' : 'Koyu Tema'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  );
};
