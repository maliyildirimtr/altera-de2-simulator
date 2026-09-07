import { Board } from '../components/Board/Board';
import { FileUploader } from '../components/Uploader/FileUploader';
import { useBoardStore } from '../store/boardStore';

export default function DE2Simulator() {
  const { setUploaderOpen, engine, runSimulationCycle } = useBoardStore();

  return (
    <div className="flex-1 flex flex-col bg-[#111] relative h-full">
      <FileUploader />
      
      {/* Sub-header for Lab Controls */}
      <div className="w-full flex justify-between items-center bg-gray-900/50 p-4 border-b border-gray-800">
        <h2 className="text-gray-300 font-medium">Altera DE2 Simülasyon Ortamı</h2>
        <div className="flex gap-4">
          <button 
            onClick={() => setUploaderOpen(true)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition-colors border border-gray-700 text-white"
          >
            📁 Kod ve Pin Yükle
          </button>
          {engine && (
            <button 
              onClick={() => useBoardStore.getState().tickClock()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-sm transition-colors font-medium flex items-center gap-2"
            >
              ⏰ Clock Tick
            </button>
          )}
          <button 
            className={`px-4 py-2 rounded-md text-sm transition-colors text-white font-medium ${engine ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}
            onClick={() => { if (engine) runSimulationCycle(); }}
          >
            {engine ? '▶ Simülasyon Aktif' : '▶ Simülasyon Bekleniyor'}
          </button>
        </div>
      </div>

      {/* Main Board Container */}
      <main className="flex-1 w-full flex items-center justify-center p-8 overflow-auto">
        <div className="transform origin-center scale-[0.8] md:scale-[0.9] lg:scale-100 transition-transform">
          <Board />
        </div>
      </main>
    </div>
  );
};
