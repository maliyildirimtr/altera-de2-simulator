import { useNavigate } from 'react-router-dom';
import { Cpu, Play } from 'lucide-react';
import { useBoardStore } from '../store/boardStore';

interface Project {
  id: string;
  title: string;
  description: string;
  code: string;
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'half_adder',
    title: 'Half Adder (Yarım Toplayıcı)',
    description: 'İki adet 1 bitlik sayıyı toplayarak Toplam (S) ve Elde (C) çıkışı üreten temel kombinezonsal mantık devresi.',
    code: `module half_adder (
    input A, B,
    output C, S
);
    assign S = A ^ B;
    assign C = A & B;
endmodule`
  },
  {
    id: 'full_adder',
    title: 'Full Adder (Tam Toplayıcı)',
    description: 'Üç biti (A, B ve önceki elden gelen Cin) toplayan, modern CPU ALU birimlerinin temel taşı olan toplayıcı devre.',
    code: `module full_adder (
    input A, B, Cin,
    output Cout, S
);
    assign S = A ^ B ^ Cin;
    assign Cout = (A & B) | (Cin & (A ^ B));
endmodule`
  },
  {
    id: 'd_flip_flop',
    title: 'D Flip-Flop (Ardışıl)',
    description: 'Saat (clock) sinyalinin yükselen kenarında veri girişini (D) çıkışa (Q) aktaran temel hafıza elemanı.',
    code: `module d_flip_flop (
    input clk, D,
    output Q
);
    reg Q;
    always @(posedge clk) begin
        Q = D;
    end
endmodule`
  }
];

export default function Projects() {
  const navigate = useNavigate();
  const setHdlCode = useBoardStore((state) => state.setHdlCode);

  const handleOpenProject = (code: string) => {
    setHdlCode(code);
    navigate('/de2-simulator');
  };

  return (
    <div className="flex-1 w-full bg-[#111] p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Örnek Proje Galerisi</h1>
          <p className="text-gray-400">
            Hazır donanım mimarilerini inceleyin ve tek tıkla DE2 simülatöründe çalıştırın.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SAMPLE_PROJECTS.map((project) => (
            <div key={project.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Cpu size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">{project.title}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  {project.description}
                </p>
                <div className="bg-[#0a0a0a] rounded-lg p-4 border border-gray-800">
                  <pre className="text-emerald-400 text-xs overflow-x-auto font-mono">
                    {project.code}
                  </pre>
                </div>
              </div>
              <div className="p-4 bg-gray-900/50 border-t border-gray-800 flex justify-end">
                <button 
                  onClick={() => handleOpenProject(project.code)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Play size={16} />
                  <span>DE2 Kartında Aç</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
