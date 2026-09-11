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

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <Router>
      <div className="h-screen w-screen bg-[#111] text-white flex flex-col overflow-hidden font-sans">
        <Navbar isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        {/* Full-height route container so schematic can use all remaining vertical space */}
        <div className="flex-1 flex flex-col overflow-hidden w-full relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/de2-simulator" element={<DE2Simulator />} />
            <Route path="/examples" element={<Projects />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/schematic" element={<SchematicPage isDarkMode={isDarkMode} />} />
            <Route path="/waveform" element={<WaveformSimulator />} />
            <Route path="/digital-logic" element={<DigitalLogicHub />} />
            <Route path="/fpga" element={<FpgaHub />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
