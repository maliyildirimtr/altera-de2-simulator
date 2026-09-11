import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Zap, Cpu, Activity, GitGraph, BookOpen, Sun, Moon, Menu, X, Layers, Grid } from 'lucide-react';
import { PLATFORM_NAME } from '../../lib/platform';

interface NavbarProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

const TOOL_LINKS = [
  { to: '/de2-simulator', label: 'DE2 Simulator', icon: Cpu },
  { to: '/waveform',      label: 'Waveform',      icon: Activity },
  { to: '/schematic',     label: 'Schematic',      icon: GitGraph },
  { to: '/examples',      label: 'Examples',       icon: BookOpen },
] as const;

const EXPLORE_LINKS = [
  { to: '/digital-logic', label: 'Digital Logic', icon: Layers },
  { to: '/fpga',          label: 'FPGA',          icon: Grid },
] as const;

export const Navbar: React.FC<NavbarProps> = ({ isDarkMode, setIsDarkMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'text-blue-200 bg-blue-500/12 border border-blue-400/25'
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/6',
    ].join(' ');

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-white/5',
      isActive ? 'text-blue-300 bg-blue-500/10' : 'text-slate-300 hover:text-white hover:bg-white/5',
    ].join(' ');

  return (
    <>
      {/* ── Main bar ── */}
      <nav
        className="landing-navbar w-full h-16 flex items-center justify-between px-6 z-40 sticky top-0 shrink-0"
        style={{
          background: 'var(--landing-navy)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group mr-8"
          aria-label={`${PLATFORM_NAME} — go to home`}
        >
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shadow-md shadow-blue-700/40 transition-opacity group-hover:opacity-85">
            <Zap size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm text-white tracking-wide hidden sm:block" style={{ fontWeight: 600 }}>
            {PLATFORM_NAME}
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6 flex-1">
          <div className="flex items-center gap-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">Tools</div>
            {TOOL_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={desktopLinkClass}>
                {label}
              </NavLink>
            ))}
          </div>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">Explore</div>
            {EXPLORE_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={desktopLinkClass}>
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          {/* Theme toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed top-16 left-0 right-0 z-30 flex flex-col h-[calc(100vh-64px)] overflow-y-auto"
          style={{ background: 'var(--landing-navy)' }}
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="px-4 py-2 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tools</div>
          {TOOL_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
          <div className="px-4 py-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-t border-white/5 pt-4">Explore</div>
          {EXPLORE_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </>
  );
};
