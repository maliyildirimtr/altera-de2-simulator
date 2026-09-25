import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Cpu, Activity, GitGraph, BookOpen, Sun, Moon, Menu, X, Layers, Grid } from 'lucide-react';
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
      'flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[12.5px] font-medium transition-colors select-none',
      isActive
        ? 'text-[var(--accent-primary)] bg-[var(--accent-subtle)] border border-[var(--accent-border)] font-semibold'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent',
    ].join(' ');

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors border-b border-[var(--border-subtle)] select-none',
      isActive
        ? 'text-[var(--accent-primary)] bg-[var(--accent-subtle)] font-semibold'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
    ].join(' ');

  return (
    <>
      {/* ── Main bar ── */}
      <nav
        className="w-full h-[52px] flex items-center justify-between px-4 sm:px-6 z-40 sticky top-0 shrink-0 select-none transition-colors border-b border-[var(--border-subtle)]"
        style={{
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group mr-6 sm:mr-8 shrink-0"
          aria-label={`${PLATFORM_NAME} — go to home`}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[6px] bg-[#070B14] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden shrink-0 shadow-xs transition-opacity group-hover:opacity-90">
            <img
              src="/brand/logiclab-mark.png"
              alt={`${PLATFORM_NAME} logo`}
              className="w-full h-full object-contain"
              width={32}
              height={32}
            />
          </div>
          <span
            className="text-[14px] tracking-tight hidden sm:block font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {PLATFORM_NAME}
          </span>
        </Link>

        {/* Desktop nav — centred in the bar from xl up, where there is room
            on both sides; below that it follows the brand. */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-5 flex-1 xl:flex-none xl:absolute xl:left-1/2 xl:-translate-x-1/2">
          <div className="flex items-center gap-1">
            <span
              className="text-[10px] font-bold uppercase tracking-wider mr-2 select-none"
              style={{ color: 'var(--text-muted)' }}
            >
              Tools
            </span>
            {TOOL_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={desktopLinkClass}>
                {label}
              </NavLink>
            ))}
          </div>
          <div className="w-px h-4 shrink-0" style={{ backgroundColor: 'var(--border-subtle)' }} />
          <div className="flex items-center gap-1">
            <span
              className="text-[10px] font-bold uppercase tracking-wider mr-2 select-none"
              style={{ color: 'var(--text-muted)' }}
            >
              Explore
            </span>
            {EXPLORE_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={desktopLinkClass}>
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 ml-auto lg:ml-0 xl:ml-auto shrink-0">
          {/* Theme toggle */}
          <button
            data-testid="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-panel)',
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-[4px] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-panel)',
            }}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed top-[52px] left-0 right-0 z-30 flex flex-col h-[calc(100vh-52px)] overflow-y-auto border-b border-[var(--border-subtle)]"
          style={{
            backgroundColor: 'var(--bg-surface)',
          }}
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div
            className="px-4 py-2 mt-2 text-[10px] font-bold uppercase tracking-wider select-none"
            style={{ color: 'var(--text-muted)' }}
          >
            Tools
          </div>
          {TOOL_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={15} className="shrink-0 text-[var(--text-secondary)]" />
              {label}
            </NavLink>
          ))}
          <div
            className="px-4 py-2 mt-3 text-[10px] font-bold uppercase tracking-wider border-t pt-3 select-none"
            style={{
              color: 'var(--text-muted)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            Explore
          </div>
          {EXPLORE_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={15} className="shrink-0 text-[var(--text-secondary)]" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </>
  );
};
