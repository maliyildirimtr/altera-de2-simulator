import React, { useEffect, useRef, useState } from 'react';
import { Vector3vl } from '3vl';

interface CircuitViewerProps {
  circuitData: any;
  simplify?: boolean;
}

export const CircuitViewer: React.FC<CircuitViewerProps> = ({ circuitData, simplify = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<any>(null);

  // Performanslı pan/zoom için React state yerine ref kullanıyoruz
  const transformState = useRef({ tx: 0, ty: 0, scale: 1 });

  const updateTransform = () => {
    if (wrapperRef.current) {
      const { tx, ty, scale } = transformState.current;
      wrapperRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }
  };

  useEffect(() => {
    if (!circuitData || !containerRef.current) return;

    let circuitInstance: any = null;

    import('digitaljs').then((digitaljsModule) => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';

      const Circuit = digitaljsModule.Circuit || (digitaljsModule as any).default?.Circuit || (window as any).digitaljs?.Circuit;
      const transform = digitaljsModule.transform || (digitaljsModule as any).default?.transform || (window as any).digitaljs?.transform;
      const cells = digitaljsModule.cells || (digitaljsModule as any).default?.cells || (window as any).digitaljs?.cells;

      // Input tuşlarının (buton) siyah-beyaz yerine Output'lar gibi yeşil-kırmızı yanması için override
      if (cells && cells.InputView) {
        const inputAttrs = cells.InputView.prototype.attrs;
        if (inputAttrs && inputAttrs.button) {
          inputAttrs.button.high.btnface.fill = '#03c03c'; // Yeşil
          inputAttrs.button.low.btnface.fill = '#fc7c68';  // Kırmızı
        }
      }
      
      if (Circuit) {
        let finalData = circuitData;
        try {
          // DigitalJS'in kendi dönüşüm motorunu kullanarak VS Code'daki gibi tertemiz 
          // (örn. pmux ve eq kapılarının tek bir binary mux'a dönüştürüldüğü) bir şematik elde et.
          if (simplify && transform && typeof transform.transformCircuit === 'function') {
            finalData = transform.transformCircuit(circuitData);
          }
        } catch (e) {
          console.warn("DigitalJS transform error:", e);
        }

        circuitInstance = new Circuit(finalData);
        circuitRef.current = circuitInstance;

        // Üst kısma "given_name" (kod içindeki orjinal adı) yazdırmak için hücrelere müdahale et
        if (circuitInstance.graph) {
          circuitInstance.graph.getCells().forEach((cell: any) => {
            if (cell.isLink()) return;
            
            const givenName = cell.get('given_name');
            if (givenName) {
              const currentMarkup = cell.markup || cell.get('markup');
              if (Array.isArray(currentMarkup)) {
                // JointJS hücresine ekstra bir metin (text) etiketi ekliyoruz
                const newMarkup = [...currentMarkup, {
                  tagName: 'text',
                  selector: 'topLabel',
                  className: 'top-label'
                }];
                cell.set('markup', newMarkup);
                
                cell.attr('topLabel', {
                  text: givenName,
                  refX: '50%',
                  refY: 0,
                  refDy: -15, 
                  textAnchor: 'middle',
                  fontSize: '9pt',
                  fill: '#0055ff', // Belirgin olması için mavi
                  fontWeight: 'bold'
                });
              }
            }
          });
        }

        const paper = circuitInstance.displayOn(containerRef.current);
        paperRef.current = paper;

        if (paper && typeof paper.setDimensions === 'function') {
          paper.setDimensions('100%', '100%');
        }

        // Başlangıç transform ayarlarını sıfırla
        transformState.current = { tx: 0, ty: 0, scale: 1 };
        updateTransform();

        // Kaydırma (Pan) Mantığı - JointJS yerine Wrapper DIV üzerinde yapıyoruz!
        let isDragging = false;
        let startClientX = 0;
        let startClientY = 0;
        let startTx = 0;
        let startTy = 0;

        paper.on('blank:pointerdown', (evt: any) => {
          isDragging = true;
          startClientX = evt.clientX;
          startClientY = evt.clientY;
          startTx = transformState.current.tx;
          startTy = transformState.current.ty;
          if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing';
        });

        const handleMouseMove = (evt: MouseEvent) => {
          if (isDragging) {
            const dx = evt.clientX - startClientX;
            const dy = evt.clientY - startClientY;
            transformState.current.tx = startTx + dx;
            transformState.current.ty = startTy + dy;
            updateTransform();
          }
        };

        const handleMouseUp = () => {
          isDragging = false;
          if (wrapperRef.current) wrapperRef.current.style.cursor = 'grab';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // Chrome'da odaklanma (focus) kaynaklı scroll sıçramalarını önle
        const preventScroll = () => {
          if (wrapperRef.current) {
            wrapperRef.current.scrollTop = 0;
            wrapperRef.current.scrollLeft = 0;
          }
          if (wrapperRef.current?.parentElement) {
            wrapperRef.current.parentElement.scrollTop = 0;
            wrapperRef.current.parentElement.scrollLeft = 0;
          }
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        };
        
        window.addEventListener('scroll', preventScroll, true);

        // Fare Tekerleği ile Zoom (CSS üzerinden)
        const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          const currentS = transformState.current.scale;
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          transformState.current.scale = Math.min(Math.max(currentS * delta, 0.2), 5);
          updateTransform();
        };
        
        const wrapper = wrapperRef.current;
        if (wrapper) {
          wrapper.addEventListener('wheel', handleWheel, { passive: false });
        }

        // Temizleme fonksiyonu
        (containerRef.current as any)._cleanup = () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('scroll', preventScroll, true);
          if (wrapper) wrapper.removeEventListener('wheel', handleWheel);
        };

        circuitInstance.start();
      }
    }).catch((err) => {
      console.error('DigitalJS render hatası:', err);
    });

    return () => {
      if (containerRef.current && (containerRef.current as any)._cleanup) {
        (containerRef.current as any)._cleanup();
      }
      if (circuitInstance && typeof circuitInstance.shutdown === 'function') {
        circuitInstance.shutdown();
      }
    };
  }, [circuitData]);

  const handleZoomIn = () => {
    transformState.current.scale = Math.min(transformState.current.scale * 1.2, 5);
    updateTransform();
  };

  const handleZoomOut = () => {
    transformState.current.scale = Math.max(transformState.current.scale * 0.8, 0.2);
    updateTransform();
  };

  const handleReset = () => {
    transformState.current = { tx: 0, ty: 0, scale: 1 };
    updateTransform();
  };

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  };

  const [isTruthTableOpen, setIsTruthTableOpen] = useState(false);
  const [truthTableData, setTruthTableData] = useState<{ inputs: Record<string, string>, outputs: Record<string, string> }[]>([]);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const circuitRef = useRef<any>(null);

  const generateTruthTable = async () => {
    if (!circuitData || !circuitData.devices) {
      alert("Devre verisi bulunamadı.");
      return;
    }
    if (!circuitRef.current) {
      alert("Devre henüz tam yüklenmedi, lütfen biraz bekleyip tekrar deneyin.");
      return;
    }
    
    setIsGenerating(true);
    setIsTruthTableOpen(true);

    const inputs: { id: string, label: string, bits: number }[] = [];
    const outputs: { id: string, label: string, bits: number }[] = [];

    // Girdi ve çıktıları topla
    for (const [id, dev] of Object.entries<any>(circuitData.devices)) {
      if (dev.type === 'Input') {
        inputs.push({ id, label: dev.label || id, bits: dev.bits || 1 });
      } else if (dev.type === 'Output') {
        outputs.push({ id, label: dev.label || id, bits: dev.bits || 1 });
      }
    }

    const totalBits = inputs.reduce((sum, input) => sum + input.bits, 0);
    
    if (totalBits > 5) {
      alert('Doğruluk tablosu maksimum 5 bit giriş destekler.');
      setIsGenerating(false);
      return;
    }

    const combinationsCount = Math.pow(2, totalBits);
    const tableData: { inputs: Record<string, string>, outputs: Record<string, string> }[] = [];
    
    // DigitalJS devre grafiğini al (Paper üzerinden veya circuitInstance üzerinden)
    const graph = paperRef.current?.model || circuitRef.current?.graph;
    
    if (!graph) {
      alert("Devre modeli bulunamadı!");
      setIsGenerating(false);
      return;
    }

    try {
      const wasRunning = circuitRef.current.running;
      // Devrenin arka planda simüle edilebilmesi için motorun çalışıyor olması şart.
      // Eğer durdurulmuşsa geçici olarak başlatıyoruz.
      if (!wasRunning && typeof circuitRef.current.start === 'function') {
        circuitRef.current.start();
      }

      // Her kombinasyonu simüle et
      for (let i = 0; i < combinationsCount; i++) {
        const binaryString = i.toString(2).padStart(totalBits, '0');
        let currentBitIndex = 0;
        const currentInputs: Record<string, string> = {};

        // Girişleri uygula
        for (const input of inputs) {
          const bitVal = binaryString.substring(currentBitIndex, currentBitIndex + input.bits);
          currentInputs[input.label] = bitVal;
          
          try {
            const vec = Vector3vl.fromBin(bitVal);
            if (typeof circuitRef.current.setInput === 'function') {
              circuitRef.current.setInput(input.id, vec);
            }
          } catch (e) {
             console.warn("Input set error", e);
          }
          currentBitIndex += input.bits;
        }

        // Senkron olarak devrenin oturmasını bekle
        await new Promise(resolve => setTimeout(resolve, 20));

        // Çıkışları oku
        const currentOutputs: Record<string, string> = {};
        for (const output of outputs) {
          let outVal = '-';
          try {
            if (typeof circuitRef.current.getOutput === 'function') {
              const sig = circuitRef.current.getOutput(output.id);
              if (sig && typeof sig.toBin === 'function') {
                outVal = sig.toBin();
              } else if (typeof sig === 'number') {
                outVal = sig.toString(2).padStart(output.bits, '0');
              } else if (Array.isArray(sig)) {
                outVal = sig.map((b: any) => b === 1 || b === '1' ? '1' : (b === 0 || b === '0' ? '0' : 'x')).reverse().join('');
              } else if (typeof sig === 'string') {
                outVal = sig;
              } else {
                outVal = String(sig);
              }
            } else {
              // Fallback
              const cell = circuitRef.current?.graph?.getCell(output.id);
              if (cell) {
                const inSigs = cell.get('inputSignals');
                outVal = inSigs && typeof inSigs.in?.toBin === 'function' ? inSigs.in.toBin() : 'x';
              }
            }
          } catch (e) {
            console.warn("Output get error", e);
            outVal = 'x';
          }
          currentOutputs[output.label] = outVal;
        }

        tableData.push({ inputs: currentInputs, outputs: currentOutputs });
      }

      setTruthTableData(tableData);
      
      // Motor başlarken durdurulmuş haldeyse, tablo oluşturma bitince tekrar durdur.
      if (!wasRunning && typeof circuitRef.current.stop === 'function') {
        circuitRef.current.stop();
      }
    } catch (err) {
      console.error("Tablo oluşturulurken hata oluştu:", err);
      alert("Tablo oluşturulurken hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRowClick = (rowIndex: number) => {
    setActiveRowIndex(rowIndex);
    const row = truthTableData[rowIndex];
    if (!circuitRef.current || !row) return;

    for (const [id, dev] of Object.entries<any>(circuitData.devices)) {
      if (dev.type === 'Input') {
        const label = dev.label || id;
        const val = row.inputs[label];
        if (val !== undefined) {
          try {
             if (typeof circuitRef.current.setInput === 'function') {
               const vec = Vector3vl.fromBin(val);
               circuitRef.current.setInput(id, vec);
             }
          } catch(e) {
             console.warn("Row click input set error", e);
          }
        }
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {circuitData && (
        <div style={{
          position: 'absolute', top: '15px', right: '15px', zIndex: 10,
          display: 'flex', gap: '8px', background: 'var(--bg-secondary)', 
          padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <button onClick={generateTruthTable} style={{...btnStyle, background: 'var(--accent-color)', color: '#fff', border: 'none'}}>
            📊 Doğruluk Tablosu
          </button>
          <div style={{ width: '1px', backgroundColor: 'var(--border-color)', margin: '0 5px' }}></div>
          <button onClick={handleZoomIn} style={btnStyle}>➕ Zoom In</button>
          <button onClick={handleZoomOut} style={btnStyle}>➖ Zoom Out</button>
          <button onClick={handleReset} style={btnStyle}>🔄 Sıfırla</button>
        </div>
      )}

      {/* Truth Table Modal */}
      {isTruthTableOpen && (
        <div style={{
          position: 'absolute', top: '70px', right: '15px', zIndex: 20,
          width: '350px', maxHeight: '80%', overflowY: 'auto',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊</span> Doğruluk Tablosu
            </h3>
            <button onClick={() => setIsTruthTableOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
          </div>
          
          {isGenerating ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              ⏳ Tablo oluşturuluyor...
            </div>
          ) : truthTableData.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.9rem' }}>
              <thead style={{ background: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
                <tr>
                  {Object.keys(truthTableData[0].inputs).map(k => (
                    <th key={k} style={{ padding: '10px 5px', color: 'var(--text-secondary)' }}>{k}</th>
                  ))}
                  <th style={{ borderLeft: '1px solid var(--border-color)', padding: '10px 5px', color: '#60a5fa' }}>|</th>
                  {Object.keys(truthTableData[0].outputs).map(k => (
                    <th key={k} style={{ padding: '10px 5px', color: '#60a5fa' }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {truthTableData.map((row, i) => (
                  <tr 
                    key={i} 
                    onClick={() => handleRowClick(i)}
                    style={{ 
                      cursor: 'pointer', 
                      background: activeRowIndex === i ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s'
                    }}
                  >
                    {Object.values(row.inputs).map((val, idx) => (
                      <td key={idx} style={{ padding: '10px 5px', color: val.includes('1') ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>{val}</td>
                    ))}
                    <td style={{ borderLeft: '1px solid var(--border-color)' }}></td>
                    {Object.values(row.outputs).map((val, idx) => (
                      <td key={idx} style={{ padding: '10px 5px', color: val.includes('1') ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Giriş/Çıkış bulunamadı.
            </div>
          )}
        </div>
      )}

      <div 
        ref={wrapperRef} 
        style={{ width: '100%', height: '100%', transformOrigin: '0 0', cursor: 'grab', transition: 'none' }}
      >
        <div 
          ref={containerRef} 
          style={{ width: '100%', height: '100%', background: 'transparent' }} 
        />
      </div>
    </div>
  );
};

export default CircuitViewer;
