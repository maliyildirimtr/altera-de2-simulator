import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Cpu, Activity, GitGraph, BookOpen, Sun, Moon, Menu, X, Layers, Grid, GraduationCap, Users, Shapes, BookOpenCheck, ChevronDown, Grid3x3, Binary, Workflow, CircleHelp } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { PLATFORM_NAME } from '../../lib/platform';

interface NavbarProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

const TOOL_LINKS = [
  { to: '/de2-simulator', key: 'de2', icon: Cpu },
  { to: '/waveform',      key: 'waveform', icon: Activity },
  { to: '/schematic',     key: 'schematic', icon: GitGraph },
  { to: '/gates',         key: 'gates', icon: Shapes },
  { to: '/fsm',           key: 'fsm', icon: Workflow },
  { to: '/examples',      key: 'examples', icon: BookOpen },
] as const;

const EXPLORE_LINKS = [
  { to: '/lessons',       key: 'lessons', icon: BookOpenCheck },
  { to: '/exercises',     key: 'exercises', icon: GraduationCap },
  { to: '/kmap',          key: 'kmap', icon: Grid3x3 },
  { to: '/numbers',       key: 'numbers', icon: Binary },
  { to: '/quiz',          key: 'quiz', icon: CircleHelp },
  { to: '/classroom',     key: 'classroom', icon: Users },
  { to: '/digital-logic', key: 'digitalLogic', icon: Layers },
  { to: '/fpga',          key: 'fpga', icon: Grid },
] as const;

export const Navbar: React.FC<NavbarProps> = ({ isDarkMode, setIsDarkMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { d, lang, setLang } = useI18n();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [moreOpen]);

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-1.5 px-2.5 py-1 rounded-[0.25rem] text-[0.7812rem] font-medium transition-colors select-none whitespace-nowrap',
      isActive
        ? 'text-[var(--accent-primary)] bg-[var(--accent-subtle)] border border-[var(--accent-border)] font-semibold'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent',
    ].join(' ');

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] font-medium transition-colors border-b border-[var(--border-subtle)] select-none',
      isActive
        ? 'text-[var(--accent-primary)] bg-[var(--accent-subtle)] font-semibold'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
    ].join(' ');

  return (
    <>
      {/* ── Main bar ── */}
      <nav
        className="w-full h-[3.25rem] flex items-center justify-between px-4 sm:px-6 z-40 sticky top-0 shrink-0 select-none transition-colors border-b border-[var(--border-subtle)]"
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
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 transition-opacity group-hover:opacity-90">
            <img
              src="/brand/logiclab-mark-96.png"
              alt={`${PLATFORM_NAME} logo`}
              className="w-full h-full object-contain"
              width={32}
              height={32}
            />
          </div>
          <span
            className="text-[0.875rem] tracking-tight hidden sm:block font-semibold"
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
              className="text-[0.625rem] font-bold uppercase tracking-wider mr-2 select-none"
              style={{ color: 'var(--text-muted)' }}
            >
              {d.nav.tools}
            </span>
            {TOOL_LINKS.map(({ to, key }) => (
              <NavLink key={to} to={to} className={desktopLinkClass}>
                {d.nav[key]}
              </NavLink>
            ))}
          </div>
          <div className="w-px h-4 shrink-0" style={{ backgroundColor: 'var(--border-subtle)' }} />
          <div className="flex items-center gap-1">
            <span
              className="text-[0.625rem] font-bold uppercase tracking-wider mr-2 select-none"
              style={{ color: 'var(--text-muted)' }}
            >
              {d.nav.explore}
            </span>
            {EXPLORE_LINKS.slice(0, 3).map(({ to, key }) => (
              <NavLink key={to} to={to} className={desktopLinkClass}>
                {d.nav[key]}
              </NavLink>
            ))}
            {/* The rest of Explore sits in a small menu so the bar stays on one line. */}
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                data-testid="nav-more"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((o) => !o)}
                className={desktopLinkClass({ isActive: EXPLORE_LINKS.slice(3).some((l) => pathname === l.to) })}
              >
                {d.nav.more}
                <ChevronDown size={12} />
              </button>
              {moreOpen && (
                <div role="menu" className="absolute right-0 top-full mt-1.5 min-w-[11.875rem] rounded-[0.375rem] border py-1 z-50 shadow-lg" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  {EXPLORE_LINKS.slice(3).map(({ to, key, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 text-[0.7812rem] whitespace-nowrap hover:bg-[var(--bg-hover)] ${isActive ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`
                      }
                    >
                      <Icon size={14} />
                      {d.nav[key]}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 ml-auto lg:ml-0 xl:ml-auto shrink-0">
          {/* Language toggle */}
          <button
            data-testid="lang-toggle"
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            className="h-7 px-1.5 flex items-center justify-center rounded-[0.25rem] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer text-[0.6875rem] font-semibold"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-panel)' }}
            title={`${d.nav.language}: ${d.langName}`}
            aria-label={`${d.nav.language}: ${d.langName}. ${lang === 'tr' ? 'Switch to English' : 'Türkçeye geç'}`}
          >
            {lang === 'tr' ? 'TR' : 'EN'}
          </button>

          {/* Theme toggle */}
          <button
            data-testid="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-7 h-7 flex items-center justify-center rounded-[0.25rem] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-panel)',
            }}
            title={isDarkMode ? d.nav.switchToLight : d.nav.switchToDark}
            aria-label={isDarkMode ? d.nav.switchToLight : d.nav.switchToDark}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-[0.25rem] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-panel)',
            }}
            aria-label={mobileOpen ? d.nav.closeMenu : d.nav.openMenu}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed top-[3.25rem] left-0 right-0 z-30 flex flex-col h-[calc(100vh-52px)] overflow-y-auto border-b border-[var(--border-subtle)]"
          style={{
            backgroundColor: 'var(--bg-surface)',
          }}
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div
            className="px-4 py-2 mt-2 text-[0.625rem] font-bold uppercase tracking-wider select-none"
            style={{ color: 'var(--text-muted)' }}
          >
            {d.nav.tools}
          </div>
          {TOOL_LINKS.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={15} className="shrink-0 text-[var(--text-secondary)]" />
              {d.nav[key]}
            </NavLink>
          ))}
          <div
            className="px-4 py-2 mt-3 text-[0.625rem] font-bold uppercase tracking-wider border-t pt-3 select-none"
            style={{
              color: 'var(--text-muted)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {d.nav.explore}
          </div>
          {EXPLORE_LINKS.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={mobileLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={15} className="shrink-0 text-[var(--text-secondary)]" />
              {d.nav[key]}
            </NavLink>
          ))}
        </div>
      )}
    </>
  );
};
