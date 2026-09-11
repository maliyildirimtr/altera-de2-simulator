import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Vector3vl } from '3vl';
import type { SelectedItemInfo } from './SchematicInspector';
import { LogicLegend } from './LogicLegend';
import { TruthTableDrawer } from './TruthTableDrawer';
import type { TruthTableRow } from './TruthTableDrawer';

export interface SchematicViewportHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  resetView: () => void;
  setInput: (id: string, val: string) => void;
  openTruthTable: () => void;
  closeTruthTable: () => void;
  toggleTruthTable: () => void;
  isTruthTableOpen: boolean;
}

interface SchematicViewportProps {
  circuitData: any;
  simplify?: boolean;
  status: string;
  errorMessage?: string | null;
  onSelectItem: (item: SelectedItemInfo | null) => void;
  onOpenProblems?: () => void;
  onImportHDL?: () => void;
  onTruthTableChange?: (isOpen: boolean) => void;
  onAlert?: (msg: string) => void;
}

export const SchematicViewport = forwardRef<SchematicViewportHandle, SchematicViewportProps>(
  (
    {
      circuitData,
      simplify = true,
      status,
      errorMessage,
      onSelectItem,
      onOpenProblems,
      onImportHDL,
      onTruthTableChange,
      onAlert,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const paperRef = useRef<any>(null);
    const circuitRef = useRef<any>(null);
    const lastFittedCircuitRef = useRef<any>(null);

    // Pan / Zoom transform
    const transformState = useRef({ tx: 0, ty: 0, scale: 1 });

    const updateTransform = () => {
      if (wrapperRef.current) {
        const { tx, ty, scale } = transformState.current;
        wrapperRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      }
    };

    // Truth Table state
    const [isTruthTableOpen, setIsTruthTableOpen] = useState(false);
    const [truthTableData, setTruthTableData] = useState<TruthTableRow[]>([]);
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [totalInputBits, setTotalInputBits] = useState(0);

    // Semantic attribute synchronizer
    const syncSemanticAttributes = () => {
      if (!containerRef.current) return;
      const elements = containerRef.current.querySelectorAll('.joint-element');
      elements.forEach((el) => {
        const modelId = el.getAttribute('model-id');
        const dataType = el.getAttribute('data-type') || '';
        const cell = circuitRef.current?.graph?.getCell(modelId);

        // Find label
        const labelText =
          el.querySelector('text.label')?.textContent?.trim() ||
          cell?.get('given_name') ||
          (modelId ? circuitData?.devices?.[modelId]?.label : '') ||
          cell?.get('label') ||
          '';

        const cleanLabel = labelText.replace(/[^a-zA-Z0-9_]/g, '');

        if (modelId) el.setAttribute('data-cell-id', modelId);
        if (dataType) el.setAttribute('data-cell-type', dataType);
        if (cleanLabel) el.setAttribute('data-port-name', cleanLabel);

        if (dataType === 'Input' && cleanLabel) {
          el.setAttribute('data-testid', `schematic-input-${cleanLabel}`);
          let val = '0';
          const outSig = cell?.get('outputSignals');
          if (outSig && outSig.out) {
            val = typeof outSig.out.toBin === 'function' ? outSig.out.toBin() : String(outSig.out);
          } else {
            const btnface = el.querySelector('.btnface');
            if (
              btnface &&
              (btnface.getAttribute('fill') === 'black' ||
                btnface.getAttribute('fill') === '#03c03c' ||
                btnface.getAttribute('fill') === '#22c55e')
            ) {
              val = '1';
            }
          }
          el.setAttribute('data-logic-value', val);
        } else if (dataType === 'Output' && cleanLabel) {
          el.setAttribute('data-testid', `schematic-output-${cleanLabel}`);
          let val = '0';
          try {
            if (circuitRef.current && typeof circuitRef.current.getOutput === 'function') {
              const sig = circuitRef.current.getOutput(modelId);
              if (sig && typeof sig.toBin === 'function') {
                val = sig.toBin();
              } else if (typeof sig === 'number') {
                val = String(sig);
              } else if (Array.isArray(sig)) {
                val = sig.map((b: any) => (b === 1 || b === '1' ? '1' : '0')).reverse().join('');
              }
            }
          } catch (_) {}
          el.setAttribute('data-logic-value', val);
        } else if (cleanLabel || dataType) {
          el.setAttribute('data-testid', `schematic-gate-${cleanLabel || dataType}`);
        }
      });
    };

    // Auto-fit helper
    const fitToViewport = () => {
      if (!paperRef.current || !wrapperRef.current || !containerRef.current) return;
      try {
        const bbox = paperRef.current.getContentBBox
          ? paperRef.current.getContentBBox()
          : paperRef.current.svg?.getBBox
          ? paperRef.current.svg.getBBox()
          : null;

        if (bbox && bbox.width > 10 && bbox.height > 10) {
          const cw = containerRef.current.clientWidth || 800;
          const ch = containerRef.current.clientHeight || 600;
          const pad = 80;
          const scaleX = (cw - pad) / bbox.width;
          const scaleY = (ch - pad) / bbox.height;
          // Strengthened fit (Point 1 & 2): scale to occupy a meaningful fraction of viewport (~40-70%)
          // capped at 2.6 to preserve crisp vector sizing without becoming absurdly giant
          const scale = Math.max(0.3, Math.min(Math.min(scaleX, scaleY), 2.6));
          const tx = (cw - bbox.width * scale) / 2 - bbox.x * scale;
          const ty = (ch - bbox.height * scale) / 2 - bbox.y * scale;

          transformState.current = { tx, ty, scale };
          updateTransform();
        } else {
          transformState.current = { tx: 0, ty: 0, scale: 1 };
          updateTransform();
        }
      } catch (e) {
        console.warn('Fit error:', e);
        transformState.current = { tx: 0, ty: 0, scale: 1 };
        updateTransform();
      }
    };

    // Expose imperative handle for Toolbar actions
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        transformState.current.scale = Math.min(transformState.current.scale * 1.25, 4);
        updateTransform();
      },
      zoomOut: () => {
        transformState.current.scale = Math.max(transformState.current.scale * 0.8, 0.2);
        updateTransform();
      },
      fit: () => {
        fitToViewport();
      },
      resetView: () => {
        transformState.current = { tx: 0, ty: 0, scale: 1 };
        updateTransform();
      },
      setInput: (id: string, val: string) => {
        if (!circuitRef.current) return;
        try {
          const vec = Vector3vl.fromBin(val);
          if (typeof circuitRef.current.setInput === 'function') {
            circuitRef.current.setInput(id, vec);
            if (circuitRef.current._engine) {
              let safety = 100;
              while (circuitRef.current._engine.hasPendingEvents && safety-- > 0) {
                circuitRef.current._engine.updateGatesNext();
              }
            }
            syncSemanticAttributes();
          }
        } catch (e) {
          console.warn('Direct input set error:', e);
        }
      },
      openTruthTable: () => {
        setIsTruthTableOpen(true);
        generateTruthTable();
        onTruthTableChange?.(true);
        setTimeout(fitToViewport, 120);
      },
      closeTruthTable: () => {
        setIsTruthTableOpen(false);
        onTruthTableChange?.(false);
        setTimeout(fitToViewport, 120);
      },
      toggleTruthTable: () => {
        if (isTruthTableOpen) {
          setIsTruthTableOpen(false);
          onTruthTableChange?.(false);
          setTimeout(fitToViewport, 120);
        } else {
          setIsTruthTableOpen(true);
          generateTruthTable();
          onTruthTableChange?.(true);
          setTimeout(fitToViewport, 120);
        }
      },
      isTruthTableOpen,
    }));

    // DigitalJS Circuit Initialization & Lifecycle
    useEffect(() => {
      if (!circuitData || !containerRef.current) return;

      let circuitInstance: any = null;
      let isMounted = true;

      import('digitaljs')
        .then((digitaljsModule) => {
          if (!isMounted || !containerRef.current) return;
          containerRef.current.innerHTML = '';

          const Circuit =
            digitaljsModule.Circuit ||
            (digitaljsModule as any).default?.Circuit ||
            (window as any).digitaljs?.Circuit;
          const transform =
            digitaljsModule.transform ||
            (digitaljsModule as any).default?.transform ||
            (window as any).digitaljs?.transform;
          const cells =
            digitaljsModule.cells ||
            (digitaljsModule as any).default?.cells ||
            (window as any).digitaljs?.cells;

          // Input button color overrides (Logic 0 = Muted Blue #38bdf8, Logic 1 = Bright Green #22c55e)
          if (cells && cells.InputView) {
            const inputAttrs = cells.InputView.prototype.attrs;
            if (inputAttrs && inputAttrs.button) {
              inputAttrs.button.high.btnface.fill = '#22c55e'; // Bright green
              inputAttrs.button.low.btnface.fill = '#38bdf8'; // Muted engineering blue (replaces red)
            }
          }

          if (Circuit) {
            let finalData = circuitData;
            try {
              if (simplify && transform && typeof transform.transformCircuit === 'function') {
                finalData = transform.transformCircuit(circuitData);
              }
            } catch (e) {
              console.warn('DigitalJS transform error:', e);
            }

            circuitInstance = new Circuit(finalData);
            circuitRef.current = circuitInstance;

            // Enhance JointJS cells with labels
            if (circuitInstance.graph) {
              circuitInstance.graph.getCells().forEach((cell: any) => {
                if (cell.isLink()) return;

                const givenName = cell.get('given_name');
                if (givenName) {
                  const currentMarkup = cell.markup || cell.get('markup');
                  if (Array.isArray(currentMarkup)) {
                    const newMarkup = [
                      ...currentMarkup,
                      {
                        tagName: 'text',
                        selector: 'topLabel',
                        className: 'top-label',
                      },
                    ];
                    cell.set('markup', newMarkup);

                    cell.attr('topLabel', {
                      text: givenName,
                      refX: '50%',
                      refY: 0,
                      refDy: -15,
                      textAnchor: 'middle',
                      fontSize: '9pt',
                      fill: '#38bdf8',
                      fontWeight: 'bold',
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

            // Pan logic on wrapper DIV
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

            // Wheel zoom
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

            let lastSelectedTime = 0;

            // Supported JointJS Component Selection (Point 6, 7 & 8)
            const selectCell = (cell: any, cellEl?: Element | null) => {
              if (!cell) return;
              lastSelectedTime = Date.now();

              // Clear previous selection highlights
              containerRef.current?.querySelectorAll('.cell-selected').forEach((el) => {
                el.classList.remove('cell-selected');
              });

              if (cellEl) {
                cellEl.classList.add('cell-selected');
              } else if (containerRef.current) {
                const found = containerRef.current.querySelector(`[model-id="${cell.id}"]`);
                if (found) found.classList.add('cell-selected');
              }

              const devId = cell.id;
              const dev = circuitData?.devices?.[devId];
              const isLink = cell.isLink ? cell.isLink() : false;
              const devType = isLink
                ? 'Wire'
                : dev?.type || cell.get('celltype') || cell.get('type') || 'Gate';
              const name = cell.get('given_name') || dev?.label || cell.get('label') || devId;

              let logicVal: string | undefined = undefined;
              if (dev?.type === 'Input') {
                const outSig = cell.get('outputSignals');
                logicVal =
                  outSig && outSig.out
                    ? typeof outSig.out.toBin === 'function'
                      ? outSig.out.toBin()
                      : String(outSig.out)
                    : '0';
              } else if (dev?.type === 'Output') {
                try {
                  const sig = circuitInstance.getOutput(devId);
                  logicVal = sig && typeof sig.toBin === 'function' ? sig.toBin() : String(sig);
                } catch (_) {}
              }

              onSelectItem({
                id: devId,
                name,
                type: devType,
                isLink,
                logicValue: logicVal,
                givenName: cell.get('given_name'),
                source: isLink ? cell.get('source')?.id : undefined,
                target: isLink ? cell.get('target')?.id : undefined,
              });
            };

            paper.on('cell:pointerclick', (cellView: any) => {
              selectCell(cellView?.model, cellView?.el);
            });

            // Native DOM capture listener on container to ensure button/port clicks inside a cell also select the cell
            const handleNativeContainerClick = (e: MouseEvent) => {
              const target = e.target as SVGElement;
              const cellEl = target?.closest?.('.joint-cell') as SVGElement;
              const cInst = circuitInstance || circuitRef.current;
              const graph = cInst?._graph || cInst?.graph || paperRef.current?.model || paper?.model;
              if (cellEl && graph) {
                const modelId = cellEl.getAttribute('model-id');
                if (modelId) {
                  const cell = graph.getCell(modelId);
                  if (cell) {
                    selectCell(cell, cellEl);
                  }
                }
              }
            };
            const currentContainer = containerRef.current;
            if (currentContainer) {
              currentContainer.addEventListener('click', handleNativeContainerClick, true);
              currentContainer.addEventListener('pointerdown', handleNativeContainerClick, true);
            }

            paper.on('blank:pointerclick', () => {
              if (Date.now() - lastSelectedTime < 250) return;
              containerRef.current?.querySelectorAll('.cell-selected').forEach((el) => {
                el.classList.remove('cell-selected');
              });
              onSelectItem(null);
            });

            // Start simulation engine
            circuitInstance.start();

            // Listen to graph changes to keep semantic DOM attributes and Inspector in sync
            if (circuitInstance.graph) {
              circuitInstance.graph.on('change', () => {
                syncSemanticAttributes();
              });
            }

            // Sync initial semantic attributes
            setTimeout(() => {
              syncSemanticAttributes();
            }, 100);

            // Auto-Fit policy (Point 17): Fit once after a NEW successful synthesis
            if (lastFittedCircuitRef.current !== circuitData) {
              setTimeout(() => {
                fitToViewport();
                lastFittedCircuitRef.current = circuitData;
              }, 120);
            }

            // Setup MutationObserver to continuously sync semantic attributes on SVG updates
            const observer = new MutationObserver(() => {
              syncSemanticAttributes();
            });
            observer.observe(containerRef.current, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['fill', 'stroke', 'class'],
            });

            // Cleanup handlers
            (containerRef.current as any)._cleanup = () => {
              observer.disconnect();
              if (currentContainer) {
                currentContainer.removeEventListener('click', handleNativeContainerClick, true);
                currentContainer.removeEventListener('pointerdown', handleNativeContainerClick, true);
              }
              window.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('mouseup', handleMouseUp);
              if (wrapper) wrapper.removeEventListener('wheel', handleWheel);
            };
          }
        })
        .catch((err) => {
          console.error('DigitalJS render error:', err);
        });

      return () => {
        isMounted = false;
        if (containerRef.current && (containerRef.current as any)._cleanup) {
          (containerRef.current as any)._cleanup();
        }
        if (circuitInstance && typeof circuitInstance.shutdown === 'function') {
          circuitInstance.shutdown();
        }
      };
    }, [circuitData, simplify]);

    // Viewport Reflow Observer (Point 16)
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (paperRef.current && typeof paperRef.current.setDimensions === 'function') {
            paperRef.current.setDimensions(width, height);
          }
        }
      });

      ro.observe(container);
      return () => ro.disconnect();
    }, []);

    // Truth table generation function
    const generateTruthTable = async () => {
      if (!circuitData || !circuitData.devices || !circuitRef.current) return;

      setIsGenerating(true);
      setIsTruthTableOpen(true);

      const inputs: { id: string; label: string; bits: number }[] = [];
      const outputs: { id: string; label: string; bits: number }[] = [];

      for (const [id, dev] of Object.entries<any>(circuitData.devices)) {
        if (dev.type === 'Input') {
          inputs.push({ id, label: dev.label || id, bits: dev.bits || 1 });
        } else if (dev.type === 'Output') {
          outputs.push({ id, label: dev.label || id, bits: dev.bits || 1 });
        }
      }

      const totalBits = inputs.reduce((sum, input) => sum + input.bits, 0);
      setTotalInputBits(totalBits);

      if (totalBits > 5) {
        if (onAlert) onAlert('Truth table supports up to 5 input bits.');
        else console.warn('Truth table supports up to 5 input bits.');
        setIsGenerating(false);
        return;
      }

      const combinationsCount = Math.pow(2, totalBits);
      const tableData: TruthTableRow[] = [];

      try {
        const wasRunning = circuitRef.current.running;
        if (!wasRunning && typeof circuitRef.current.start === 'function') {
          circuitRef.current.start();
        }

        for (let i = 0; i < combinationsCount; i++) {
          const binaryString = i.toString(2).padStart(totalBits, '0');
          let currentBitIndex = 0;
          const currentInputs: Record<string, string> = {};

          for (const input of inputs) {
            const bitVal = binaryString.substring(currentBitIndex, currentBitIndex + input.bits);
            currentInputs[input.label] = bitVal;
            try {
              const vec = Vector3vl.fromBin(bitVal);
              if (typeof circuitRef.current.setInput === 'function') {
                circuitRef.current.setInput(input.id, vec);
              }
            } catch (e) {
              console.warn('Truth table input set error:', e);
            }
            currentBitIndex += input.bits;
          }

          // Flush simulation engine queue so all combinational gates settle deterministically
          if (circuitRef.current?._engine) {
            let safety = 100;
            while (circuitRef.current._engine.hasPendingEvents && safety-- > 0) {
              circuitRef.current._engine.updateGatesNext();
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 20));

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
                  outVal = sig
                    .map((b: any) =>
                      b === 1 || b === '1' ? '1' : b === 0 || b === '0' ? '0' : 'x'
                    )
                    .reverse()
                    .join('');
                } else if (typeof sig === 'string') {
                  outVal = sig;
                } else {
                  outVal = String(sig);
                }
              }
            } catch (_) {
              outVal = 'x';
            }
            currentOutputs[output.label] = outVal;
          }

          tableData.push({ inputs: currentInputs, outputs: currentOutputs });
        }

        setTruthTableData(tableData);

        if (!wasRunning && typeof circuitRef.current.stop === 'function') {
          circuitRef.current.stop();
        }
      } catch (err) {
        console.error('Truth table generation error:', err);
      } finally {
        setIsGenerating(false);
      }
    };

    // Truth table row click -> apply combination to live circuit
    const handleTruthTableRowClick = (rowIndex: number) => {
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
            } catch (e) {
              console.warn('Row click input set error:', e);
            }
          }
        }
      }

      if (circuitRef.current?._engine) {
        let safety = 100;
        while (circuitRef.current._engine.hasPendingEvents && safety-- > 0) {
          circuitRef.current._engine.updateGatesNext();
        }
      }

      setTimeout(syncSemanticAttributes, 20);
    };

    return (
      <div
        data-testid="schematic-viewport"
        className="dot-grid"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Main Canvas Viewport Area */}
        <div
          data-testid="schematic-canvas-area"
          style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Error State Card (Point 11 & 25) */}
          {status === 'error' && (
            <div
              data-testid="schematic-error-state"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: '480px',
                padding: '24px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                textAlign: 'center',
                zIndex: 30,
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#ef4444', fontSize: '1.1rem' }}>
                Synthesis Error
              </h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  marginBottom: '16px',
                }}
              >
                The HDL code contains syntax or semantic errors. Previous schematic graph has been
                invalidated. Check the Problems tab for detailed compiler diagnostics.
              </p>
              {errorMessage && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    marginBottom: '14px',
                    textAlign: 'left',
                    maxHeight: '100px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {errorMessage}
                </div>
              )}
              {onOpenProblems && (
                <button
                  data-testid="view-problems-btn"
                  onClick={onOpenProblems}
                  style={{
                    padding: '6px 16px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  View Problems & Log
                </button>
              )}
            </div>
          )}

          {/* Empty State (Point 10) */}
          {!circuitData && status !== 'error' && status !== 'synthesizing' && (
            <div
              data-testid="schematic-empty-state"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                zIndex: 5,
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '10px', opacity: 0.6 }}>📐</div>
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '6px' }}>
                No Schematic Synthesized
              </div>
              <div style={{ fontSize: '0.85rem', marginBottom: '14px', maxWidth: '300px' }}>
                Write or load Verilog/SystemVerilog code, then click Synthesize to inspect the logic
                circuit.
              </div>
              {onImportHDL && (
                <button
                  data-testid="empty-import-hdl-btn"
                  onClick={onImportHDL}
                  style={{
                    padding: '6px 16px',
                    background: 'var(--accent-color)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Import HDL
                </button>
              )}
            </div>
          )}

          {/* DigitalJS Canvas Wrapper */}
          <div
            ref={wrapperRef}
            data-testid="schematic-canvas-wrapper"
            style={{
              width: '100%',
              height: '100%',
              transformOrigin: '0 0',
              cursor: 'grab',
              transition: 'none',
              display: status === 'error' || !circuitData ? 'none' : 'block',
            }}
          >
            <div
              ref={containerRef}
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            />
          </div>

          {/* Floating Logic Color Legend (Point 2) */}
          {circuitData && status !== 'error' && <LogicLegend />}
        </div>

        {/* Dockable / Collapsible Truth Table Drawer (Point 3, 4 & 14) */}
        <TruthTableDrawer
          isOpen={isTruthTableOpen}
          onClose={() => {
            setIsTruthTableOpen(false);
            onTruthTableChange?.(false);
            setTimeout(fitToViewport, 120);
          }}
          truthTableData={truthTableData}
          activeRowIndex={activeRowIndex}
          onRowClick={handleTruthTableRowClick}
          isGenerating={isGenerating}
          totalBits={totalInputBits}
        />
      </div>
    );
  }
);
