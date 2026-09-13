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
        <div
          className="p-2 rounded-lg border"
          style={{
            backgroundColor: 'var(--accent-subtle)',
            borderColor: 'var(--accent-border)',
            color: 'var(--accent-primary)',
          }}
        >
          <Icon size={24} />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      <p className="mb-6 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {examples.map(ex => (
          <Link
            key={ex.id}
            to="/examples"
            className="block p-4 rounded-xl border transition-colors group"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <h3
              className="text-sm font-bold mb-2 group-hover:text-[var(--accent-primary)] transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              {ex.title}
            </h3>
            <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {ex.description}
            </p>
            <div
              className="mt-4 flex items-center text-xs font-semibold group-hover:translate-x-0.5 transition-transform"
              style={{ color: 'var(--accent-primary)' }}
            >
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
    <div
      className="flex-1 w-full overflow-y-auto font-sans p-6 lg:p-12"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div
          className="mb-12 border-b pb-10"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="p-1.5 rounded-md border"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent-primary)',
              }}
            >
              <Layers size={18} />
            </div>
            <span
              className="text-xs font-mono font-semibold uppercase tracking-wider"
              style={{ color: 'var(--accent-primary)' }}
            >
              Engineering Area
            </span>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Digital Logic
          </h1>
          <p
            className="text-lg max-w-3xl"
            style={{ color: 'var(--text-secondary)' }}
          >
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
