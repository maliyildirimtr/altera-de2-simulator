import { Link } from 'react-router-dom';
import { Grid, ArrowRight, Cpu, Activity, GitGraph, Code, Layout, Play } from 'lucide-react';
import { EXAMPLES_LIST } from '../examples/registry';

export default function FpgaHub() {
  const de2Examples = EXAMPLES_LIST.filter(ex => ex.tools.de2);

  const workflowSteps = [
    { icon: Code, title: 'Write HDL', desc: 'Design your logic in SystemVerilog.' },
    { icon: Play, title: 'Simulate', desc: 'Run testbenches to verify functionality.' },
    { icon: Activity, title: 'Inspect Waveforms', desc: 'Analyze signal timing and state changes.' },
    { icon: GitGraph, title: 'Inspect Schematic', desc: 'View the synthesized gate-level logic.' },
    { icon: Layout, title: 'Map Inputs / Outputs', desc: 'Assign logical signals to board pins.' },
    { icon: Cpu, title: 'Test on DE2 Simulator', desc: 'Interact with the virtual board.' },
  ];

  return (
    <div className="flex-1 w-full bg-[#070b14] text-slate-200 overflow-y-auto font-sans p-6 lg:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 border-b border-slate-800/80 pb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Grid size={18} />
            </div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
              Engineering Area
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 tracking-tight mb-4">
            Field-Programmable Gate Arrays (FPGA)
          </h1>
          <p className="text-lg text-slate-400 max-w-3xl">
            Learn the end-to-end workflow for designing, verifying, and testing digital systems on a virtual FPGA platform. Experience the hardware design lifecycle entirely in your browser.
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">Learning Workflow</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 flex flex-col items-start relative z-10">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
                    <Icon size={20} />
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Step {index + 1}</div>
                  <h3 className="text-lg font-bold text-slate-200 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Board-Ready Examples</h2>
              <p className="text-slate-400 mt-1 text-sm">Examples pre-configured for the virtual DE2 board.</p>
            </div>
            <Link to="/de2-simulator" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors">
              <Cpu size={16} /> Open DE2 Simulator
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {de2Examples.map(ex => (
              <Link
                key={ex.id}
                to="/examples"
                className="block p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700 transition-colors group"
              >
                <h3 className="text-sm font-bold text-slate-200 mb-2 group-hover:text-indigo-300 transition-colors">
                  {ex.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {ex.description}
                </p>
                <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                  View Example <ArrowRight size={14} className="ml-1" />
                </div>
              </Link>
            ))}
          </div>
          
          <Link to="/de2-simulator" className="sm:hidden mt-6 flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors">
            <Cpu size={16} /> Open DE2 Simulator
          </Link>
        </div>
      </div>
    </div>
  );
}
