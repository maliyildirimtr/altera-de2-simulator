import { useNavigate } from 'react-router-dom';
import { Cpu, Zap, GitBranch, Terminal } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 w-full bg-[#0a0a0a] overflow-auto">
      {/* Hero Section */}
      <div className="relative w-full py-20 px-6 flex flex-col items-center justify-center min-h-[60vh] bg-gradient-to-b from-slate-900 to-[#0a0a0a] border-b border-slate-800">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium mb-8">
            <Zap size={14} />
            <span>%100 Tarayıcı Tabanlı Donanım Simülatörü</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Dijital Mantık & <br/>
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              FPGA Laboratuvarı
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
            Verilog ve VHDL projelerinizi kurulum gerektirmeden tarayıcınızda derleyin. 
            Altera DE2 donanımını saniyesinde simüle edin, devrelerinizi görselleştirin.
          </p>
          
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/de2-simulator')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-lg transition-all shadow-lg shadow-blue-600/30 hover:scale-105"
            >
              Simülatörü Başlat
            </button>
            <button 
              onClick={() => navigate('/projects')}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg font-semibold text-lg transition-all"
            >
              Örnekleri İncele
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto py-24 px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
            <Cpu size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Gerçekçi Kart Deneyimi</h3>
          <p className="text-slate-400 leading-relaxed">
            Fiziksel donanıma birebir uygun Altera DE2 arayüzü ile Switch'leri indirin, 
            LED'leri izleyin, 7-Segment ekranlarla anında etkileşime geçin.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-6">
            <Terminal size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Anlık Derleme Motoru</h3>
          <p className="text-slate-400 leading-relaxed">
            Sunucu gecikmesi olmadan %100 client-side çalışan Mini-Verilog Engine. 
            Assign ifadeleri ve always (posedge) bloklarını 0ms'de simüle eder.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-6">
            <GitBranch size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Sürükle-Bırak Pin Eşleme</h3>
          <p className="text-slate-400 leading-relaxed">
            Quartus (.qsf) veya Vivado (.xdc) pin haritalarınızı yükleyerek 
            orijinal projenizi tek tuşla sanal karta otomatik bağlayın.
          </p>
        </div>
      </div>
    </div>
  );
}
