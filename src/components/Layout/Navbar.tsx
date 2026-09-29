import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Cpu, Activity, GitGraph, BookOpen, Sun, Moon, Menu, X, Layers, Grid, GraduationCap, Users, Shapes, BookOpenCheck, ChevronDown, Grid3x3, Binary, Workflow, CircleHelp, type LucideIcon } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { PLATFORM_NAME } from '../../lib/platform';

interface NavbarProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

type ItemKey = 'de2' | 'waveform' | 'schematic' | 'gates' | 'fsm' | 'kmap' | 'numbers' | 'lessons' | 'exercises' | 'quiz' | 'examples' | 'digitalLogic' | 'fpga' | 'classroom';
type GroupId = 'simulate' | 'design' | 'learn';
type SectionId = 'practice' | 'reference' | 'teach';
interface NavItem { to: string; key: ItemKey; icon: LucideIcon }
interface NavSection { title?: SectionId; items: NavItem[] }
interface NavGroup { id: GroupId; sections: NavSection[]; columns?: 2 }

/**
 * The whole site in three groups, by what the user wants to do: run code,
 * build a circuit by drawing, or learn. Every page appears exactly once, and
 * desktop and mobile menus are built from this one list.
 */
const GROUPS: NavGroup[] = [
  {
    id: 'simulate',
    sections: [{ items: [
      { to: '/de2-simulator', key: 'de2', icon: Cpu },
      { to: '/waveform', key: 'waveform', icon: Activity },
      { to: '/schematic', key: 'schematic', icon: GitGraph },
    ] }],
  },
  {
    id: 'design',
    sections: [{ items: [
      { to: '/gates', key: 'gates', icon: Shapes },
      { to: '/fsm', key: 'fsm', icon: Workflow },
      { to: '/kmap', key: 'kmap', icon: Grid3x3 },
      { to: '/numbers', key: 'numbers', icon: Binary },
    ] }],
  },
  {
    id: 'learn',
    columns: 2,
    sections: [
      { title: 'practice', items: [
        { to: '/lessons', key: 'lessons', icon: BookOpenCheck },
        { to: '/exercises', key: 'exercises', icon: GraduationCap },
        { to: '/quiz', key: 'quiz', icon: CircleHelp },
        { to: '/examples', key: 'examples', icon: BookOpen },
      ] },
      { title: 'reference', items: [
        { to: '/digital-logic', key: 'digitalLogic', icon: Layers },
        { to: '/fpga', key: 'fpga', icon: Grid },
      ] },
      { title: 'teach', items: [
        { to: '/classroom', key: 'classroom', icon: Users },
      ] },
    ],
  },
];

const groupItems = (g: NavGroup) => g.sections.flatMap((s) => s.items);
/** `/projects` is the old name of the examples page. */
const isAt = (pathname: string, to: string) => pathname === to || (to === '/examples' && pathname === '/projects');

export const Navbar: React.FC<NavbarProps> = ({ isDarkMode, setIsDarkMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { d, lang, setLang } = useI18n();
  const { pathname } = useLocation();
  const [open, setOpen] = useState<GroupId | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const activeGroup = GROUPS.find((g) => groupItems(g).some((i) => isAt(pathname, i.to)))?.id ?? null;
  const activeItem = GROUPS.flatMap(groupItems).find((i) => isAt(pathname, i.to));

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-1.5 px-2.5 py-1 rounded-[0.25rem] text-[0.7812rem] font-medium transition-colors select-none whitespace-nowrap',
      isActive
        ? 'text-[var(--accent-primary)] bg-[var(--accent-subtle)] border border-[var(--accent-border)] font-semibold'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent',
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
        {/* Brand and desktop nav travel together: centred as one block from xl
            up, so the logo starts the menu instead of sitting at the far edge. */}
        <div className="flex items-center gap-6 min-w-0 xl:absolute xl:left-1/2 xl:-translate-x-1/2">
        <Link
          to="/"
          className="flex items-center gap-2.5 group shrink-0"
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

        {/* Desktop nav: the simulators as direct links, the rest in menus. */}
        <div ref={menuRef} className="hidden lg:flex items-center gap-1" role="menubar">
          {GROUPS.filter((g) => g.id === 'simulate').flatMap(groupItems).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} role="menuitem" data-testid={`nav-link-${item.key}`} title={d.nav.items[item.key].desc} className={desktopLinkClass}>
                <Icon size={14} className="shrink-0" />
                {d.nav.items[item.key].label}
              </NavLink>
            );
          })}
          <div className="w-px h-4 mx-2 shrink-0" style={{ backgroundColor: 'var(--border-subtle)' }} />
          {GROUPS.filter((g) => g.id !== 'simulate').map((g) => {
            const isOpen = open === g.id;
            const here = activeGroup === g.id;
            return (
              <div key={g.id} className="relative">
                <button
                  type="button"
                  role="menuitem"
                  data-testid={`nav-group-${g.id}`}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : g.id)}
                  onMouseEnter={() => open && open !== g.id && setOpen(g.id)}
                  className={desktopLinkClass({ isActive: here || isOpen })}
                >
                  {d.nav.groups[g.id]}
                  {here && activeItem && (
                    <span className="hidden xl:inline font-normal" style={{ color: 'var(--text-secondary)' }}>· {d.nav.items[activeItem.key].label}</span>
                  )}
                  <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div
                    role="menu"
                    data-testid={`nav-menu-${g.id}`}
                    className={`absolute top-full mt-2 rounded-[0.5rem] border p-2 z-50 shadow-lg ${g.columns === 2 ? 'w-[34rem] right-0 xl:left-1/2 xl:right-auto xl:-translate-x-1/2' : 'w-[20rem] left-0'}`}
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <p className="px-2.5 pt-1 pb-2 text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{d.nav.groupLeads[g.id]}</p>
                    <div className={g.columns === 2 ? 'grid grid-cols-2 gap-x-2' : ''}>
                      {(g.columns === 2 ? [[g.sections[0]], g.sections.slice(1)] : [g.sections]).map((col, ci) => (
                        <div key={ci} className="flex flex-col gap-1">
                          {col.map((sec, si) => (
                            <div key={si} className={si ? 'mt-2' : ''}>
                              {sec.title && (
                                <p className="px-2.5 pb-1 text-[0.625rem] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{d.nav.sections[sec.title]}</p>
                              )}
                              {sec.items.map((item) => <MenuLink key={item.to} item={item} active={isAt(pathname, item.to)} label={d.nav.items[item.key].label} desc={d.nav.items[item.key].desc} />)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
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
          {GROUPS.map((g, gi) => (
            <section key={g.id} className={gi ? 'border-t' : ''} style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="px-4 pt-3 pb-1.5 select-none">
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{d.nav.groups[g.id]}</p>
                <p className="text-[0.6875rem]" style={{ color: 'var(--text-muted)' }}>{d.nav.groupLeads[g.id]}</p>
              </div>
              {g.sections.map((sec, si) => (
                <div key={si} className="px-2 pb-2">
                  {sec.title && <p className="px-2.5 pt-1 pb-1 text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{d.nav.sections[sec.title]}</p>}
                  {sec.items.map((item) => <MenuLink key={item.to} item={item} active={isAt(pathname, item.to)} label={d.nav.items[item.key].label} desc={d.nav.items[item.key].desc} onClick={() => setMobileOpen(false)} />)}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
};

function MenuLink({ item, active, label, desc, onClick }: { item: NavItem; active: boolean; label: string; desc: string; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      role="menuitem"
      onClick={onClick}
      data-testid={`nav-link-${item.key}`}
      aria-current={active ? 'page' : undefined}
      className="flex items-start gap-2.5 px-2.5 py-2 rounded-[0.375rem] transition-colors hover:bg-[var(--bg-hover)]"
      style={active ? { backgroundColor: 'var(--accent-subtle)' } : undefined}
    >
      <span className="mt-0.5 w-7 h-7 shrink-0 flex items-center justify-center rounded-[0.375rem] border" style={{ borderColor: active ? 'var(--accent-border)' : 'var(--border-subtle)', color: active ? 'var(--accent-primary)' : 'var(--text-secondary)', backgroundColor: 'var(--bg-panel)' }}>
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.8125rem] font-semibold leading-tight" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{label}</span>
        <span className="block text-[0.7188rem] leading-snug mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</span>
      </span>
    </NavLink>
  );
}
