import { Link } from 'react-router-dom';
import { Layers, ArrowRight, Zap, Calculator, Clock } from 'lucide-react';
import { EXAMPLES_LIST } from '../examples/registry';
import type { ExampleCategory } from '../examples/types';

interface ConceptSectionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  category: ExampleCategory;
}

function ConceptSection({ title, description, icon: Icon, category }: ConceptSectionProps) {
  const examples = EXAMPLES_LIST.filter(ex => ex.category === category);

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Icon size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
      </div>
      <p className="text-slate-400 mb-6 max-w-3xl">{description}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {examples.map(ex => (
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
    </div>
  );
}

export default function DigitalLogicHub() {
  return (
    <div className="flex-1 w-full bg-[#070b14] text-slate-200 overflow-y-auto font-sans p-6 lg:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 border-b border-slate-800/80 pb-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers size={18} />
            </div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400">
              Engineering Area
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 tracking-tight mb-4">
            Digital Logic
          </h1>
          <p className="text-lg text-slate-400 max-w-3xl">
            Explore the fundamental building blocks of digital systems. Learn how simple logic gates combine to form complex arithmetic circuits, memory elements, and state machines.
          </p>
        </div>

        <ConceptSection
          title="Combinational Logic"
          description="Circuits where the output is a pure function of the present input only. These form the basic decision-making blocks in digital design."
          icon={Zap}
          category="combinational"
        />

        <ConceptSection
          title="Arithmetic Circuits"
          description="Specialized combinational circuits designed to perform mathematical operations like addition and subtraction on binary numbers."
          icon={Calculator}
          category="arithmetic"
        />

        <ConceptSection
          title="Sequential Logic"
          description="Circuits with memory, where the output depends on both present inputs and past history (state), driven by a clock signal."
          icon={Clock}
          category="sequential"
        />
      </div>
    </div>
  );
}
