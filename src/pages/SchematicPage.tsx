import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { synthesizeVerilog } from '../services/synthesizer';
import { CircuitViewer } from '../components/CircuitViewer';
import '../index.css';

export default function SchematicPage({ isDarkMode }: { isDarkMode: boolean }) {
  const [projectFiles, setProjectFiles] = useState<{name: string, content: string}[]>([{ name: 'main.sv', content: '' }]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);

  const [optimizeInYosys, setOptimizeInYosys] = useState(false);
  const [simplifyDiagram, setSimplifyDiagram] = useState(true);

  const [circuitData, setCircuitData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [editorWidth, setEditorWidth] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hoveredFileIndex, setHoveredFileIndex] = useState<number | null>(null);

  const startResizing = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = (e.clientX / window.innerWidth) * 100;
      newWidth = Math.max(20, Math.min(newWidth, 80)); // 20% ile 80% arası
      setEditorWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleSynthesize = async () => {
    const hasCode = projectFiles.some(file => file.content.trim() !== '');
    if (!hasCode) {
      setError('Lütfen sentezlenecek bir kod girin veya dosya yükleyin.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await synthesizeVerilog(projectFiles, { optimize: optimizeInYosys, simplify: simplifyDiagram });
      setCircuitData(data);
    } catch (err: any) {
      setError(err.message || 'Sentezleme hatası.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = [...projectFiles];
    let lastIndex = activeFileIndex;

    const readPromises = Array.from(files).map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          newFiles.push({ name: file.name, content: event.target?.result as string });
          lastIndex = newFiles.length - 1;
          resolve();
        };
        reader.readAsText(file);
      });
    });

    await Promise.all(readPromises);

    setProjectFiles(newFiles);
    setActiveFileIndex(lastIndex);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateNewFile = () => {
    const fileName = prompt('Dosya adını girin:', 'new_module.sv');
    if (fileName !== null) {
      const name = fileName.trim() || `module${projectFiles.length + 1}.sv`;
      const newFiles = [...projectFiles, { name, content: '' }];
      setProjectFiles(newFiles);
      setActiveFileIndex(newFiles.length - 1);
    }
  };

  const handleDeleteFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (projectFiles.length === 1) {
      alert('Projeden son dosyayı silemezsiniz.');
      return;
    }
    if (window.confirm(`'${projectFiles[index].name}' dosyasını silmek istediğinize emin misiniz?`)) {
      const newFiles = [...projectFiles];
      newFiles.splice(index, 1);
      setProjectFiles(newFiles);
      
      if (activeFileIndex === index) {
        setActiveFileIndex(Math.max(0, index - 1));
      } else if (activeFileIndex > index) {
        setActiveFileIndex(activeFileIndex - 1);
      }
    }
  };

  const updateActiveFileCode = (value: string | undefined) => {
    const newFiles = [...projectFiles];
    if (newFiles[activeFileIndex]) {
      newFiles[activeFileIndex].content = value || '';
      setProjectFiles(newFiles);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        <div style={{ width: isFileExplorerOpen ? '250px' : '40px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', transition: 'width 0.2s', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => setIsFileExplorerOpen(!isFileExplorerOpen)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.2rem', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>
                ☰
              </button>
              <span style={{ opacity: isFileExplorerOpen ? 1 : 0, transition: 'opacity 0.2s' }}>Project Navigator</span>
            </div>
            {isFileExplorerOpen && (
              <button onClick={handleCreateNewFile} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', padding: '2px 8px', fontSize: '0.9rem' }}>+</button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', display: isFileExplorerOpen ? 'block' : 'none' }}>
            {projectFiles.map((file, index) => (
              <div 
                key={index} 
                onClick={() => setActiveFileIndex(index)}
                onMouseEnter={() => setHoveredFileIndex(index)}
                onMouseLeave={() => setHoveredFileIndex(null)}
                style={{ 
                  padding: '8px 15px', 
                  cursor: 'pointer', 
                  backgroundColor: activeFileIndex === index ? 'var(--accent-color)' : 'transparent',
                  color: activeFileIndex === index ? '#fff' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span>📄</span> 
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                </div>
                {hoveredFileIndex === index && (
                  <button 
                    onClick={(e) => handleDeleteFile(e, index)}
                    title="Dosyayı Sil"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: activeFileIndex === index ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      padding: '0 5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.8
                    }}
                  >
                    -
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Sentez Ayarları (Synthesis Settings) */}
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '15px', display: isFileExplorerOpen ? 'flex' : 'none', flexDirection: 'column', gap: '10px' }}>
             <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>⚙️ Sentez Ayarları</span>
             
             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
               <input 
                 type="checkbox" 
                 checked={optimizeInYosys} 
                 onChange={(e) => {
                   setOptimizeInYosys(e.target.checked);
                   if (e.target.checked) setSimplifyDiagram(false);
                 }} 
                 style={{ cursor: 'pointer' }}
               />
               Yosys'te Optimize Et
             </label>

             <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
               <input 
                 type="checkbox" 
                 checked={simplifyDiagram} 
                 onChange={(e) => {
                   setSimplifyDiagram(e.target.checked);
                   if (e.target.checked) setOptimizeInYosys(false);
                 }} 
                 style={{ cursor: 'pointer' }}
               />
               Şematiği Basitleştir (RTL)
             </label>
          </div>
        </div>

        {/* Left Panel: Monaco Editor */}
        <div style={{ width: isEditorOpen ? `${editorWidth}%` : '0', display: isEditorOpen ? 'flex' : 'none', flexDirection: 'column', flexShrink: 0 }}>
          {error && <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderBottom: '1px solid #f87171', fontSize: '0.9rem' }}>{error}</div>}
          {/* Action Bar (Buttons) */}
          <div style={{ padding: '5px 15px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="file" accept=".v,.sv" multiple ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '4px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                📂 Yükle
              </button>
              <button onClick={handleSynthesize} disabled={loading} style={{ padding: '4px 12px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                {loading ? '⏳ Sentezleniyor...' : '⚙️ Sentezle'}
              </button>
            </div>
          </div>
          {/* File Name Bar */}
          <div style={{ padding: '4px 15px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Düzenlenen: <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>{projectFiles[activeFileIndex]?.name}</strong>
          </div>
          <Editor
            height="100%"
            language="systemverilog"
            theme={isDarkMode ? 'vs-dark' : 'vs-light'}
            value={projectFiles[activeFileIndex]?.content || ''}
            onChange={updateActiveFileCode}
            options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
          />
        </div>

        {/* Resizer Divider */}
        {isEditorOpen && (
          <div
            onMouseDown={startResizing}
            style={{
              width: '6px',
              cursor: 'col-resize',
              backgroundColor: isResizing ? 'var(--accent-color)' : 'var(--border-color)',
              transition: 'background-color 0.2s',
              zIndex: 50,
              flexShrink: 0
            }}
          />
        )}

        {/* Right Panel: DigitalJS Canvas */}
        <div className="dot-grid" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          
          {/* Floating Tab Button */}
          <button 
            onClick={() => setIsEditorOpen(!isEditorOpen)}
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              transform: 'translateY(-50%)',
              zIndex: 50,
              width: '24px',
              height: '48px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderLeft: 'none',
              borderRadius: '0 6px 6px 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)'
            }}
          >
            {isEditorOpen ? '◀' : '▶'}
          </button>

          {!circuitData && !loading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-secondary)' }}>
              Şematik önizleme için kodu sentezleyin.
            </div>
          )}
          {circuitData && !loading && !error && (
            <CircuitViewer circuitData={circuitData} simplify={simplifyDiagram} />
          )}
        </div>
      </div>
    </div>
  );
}
