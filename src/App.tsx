import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Layout/Navbar';
import { RouteLoading } from './components/Layout/RouteLoading';
import { PLATFORM_NAME } from './lib/platform';
import { migrateLegacyStorageKeys, THEME_STORAGE_KEY } from './lib/storageKeys';
import Home from './pages/Home';
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

migrateLegacyStorageKeys();

const PAGE_TITLES: Record<string, string> = {
  '/': 'Digital Logic Simulation',
  '/de2-simulator': 'DE2 Simulator',
  '/waveform': 'Waveform',
  '/schematic': 'Schematic',
  '/examples': 'Examples',
  '/projects': 'Examples',
  '/digital-logic': 'Digital Logic',
  '/fpga': 'FPGA',
};

function DocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = PAGE_TITLES[pathname] ?? 'Page not found';
    document.title = `${PLATFORM_NAME} — ${page}`;
  }, [pathname]);
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </Router>
  );
}
