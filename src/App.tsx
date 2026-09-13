import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Layout/Navbar';
import Home from './pages/Home';
import DE2Simulator from './pages/DE2Simulator';
import Projects from './pages/Projects';
import SchematicPage from './pages/SchematicPage';
import WaveformSimulator from './pages/WaveformSimulator';
import DigitalLogicHub from './pages/DigitalLogicHub';
import FpgaHub from './pages/FpgaHub';
import './index.css';

const THEME_STORAGE_KEY = 'engineering_lab_theme_v1';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
    } catch (_) {}
    return true; // Default dark
  });

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_) {}
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <Router>
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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/de2-simulator" element={<DE2Simulator isDarkMode={isDarkMode} />} />
            <Route path="/examples" element={<Projects />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/schematic" element={<SchematicPage isDarkMode={isDarkMode} />} />
            <Route path="/waveform" element={<WaveformSimulator isDarkMode={isDarkMode} />} />
            <Route path="/digital-logic" element={<DigitalLogicHub />} />
            <Route path="/fpga" element={<FpgaHub />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
