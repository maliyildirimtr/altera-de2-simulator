import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Layout/Navbar';
import { RouteLoading } from './components/Layout/RouteLoading';
import { PLATFORM_NAME } from './lib/platform';
import { migrateLegacyStorageKeys, THEME_STORAGE_KEY } from './lib/storageKeys';
import Home from './pages/Home';
import { I18nProvider, useI18n } from './i18n/I18nProvider';
import './index.css';

// Tool pages are split into their own chunks so the home page does not
// download Monaco, DigitalJS or the simulators.
const DE2Simulator = lazy(() => import('./pages/DE2Simulator'));
const Projects = lazy(() => import('./pages/Projects'));
const SchematicPage = lazy(() => import('./pages/SchematicPage'));
const WaveformSimulator = lazy(() => import('./pages/WaveformSimulator'));
const DigitalLogicHub = lazy(() => import('./pages/DigitalLogicHub'));
const FpgaHub = lazy(() => import('./pages/FpgaHub'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Exercises = lazy(() => import('./pages/Exercises'));
const Classroom = lazy(() => import('./pages/Classroom'));

migrateLegacyStorageKeys();

function DocumentTitle() {
  const { pathname } = useLocation();
  const { d, lang } = useI18n();
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': lang === 'tr' ? 'Sayısal Mantık Simülasyonu' : 'Digital Logic Simulation',
      '/de2-simulator': d.nav.de2,
      '/waveform': d.nav.waveform,
      '/schematic': d.nav.schematic,
      '/examples': d.nav.examples,
      '/projects': d.nav.examples,
      '/exercises': d.nav.exercises,
      '/classroom': d.nav.classroom,
      '/digital-logic': d.nav.digitalLogic,
      '/fpga': d.nav.fpga,
    };
    document.title = `${PLATFORM_NAME} — ${titles[pathname] ?? d.notFound.title}`;
  }, [pathname, d, lang]);
  return null;
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
    } catch {
      /* storage unavailable: fall back to the default */
    }
    return true; // Default dark
  });

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage unavailable: theme is still applied for this session */
    }
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <I18nProvider>
    <Router>
      <DocumentTitle />
      <div
        className="h-screen w-screen flex flex-col overflow-hidden font-sans"
        style={{
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-primary)',
        }}
      >
        <Navbar isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        {/* Full-height route container so schematic can use all remaining vertical space */}
        <div className="flex-1 flex flex-col overflow-hidden w-full relative">
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/de2-simulator" element={<DE2Simulator isDarkMode={isDarkMode} />} />
              <Route path="/examples" element={<Projects />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/schematic" element={<SchematicPage isDarkMode={isDarkMode} />} />
              <Route path="/waveform" element={<WaveformSimulator isDarkMode={isDarkMode} />} />
              <Route path="/digital-logic" element={<DigitalLogicHub />} />
              <Route path="/fpga" element={<FpgaHub />} />
              <Route path="/exercises" element={<Exercises isDarkMode={isDarkMode} />} />
              <Route path="/classroom" element={<Classroom />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
    </I18nProvider>
  );
}
