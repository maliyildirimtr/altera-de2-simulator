import type { GraphNode, GraphEdge } from '../../utils/parser/graphBuilder';
import { Parser } from './expression/parser';
import { evaluateStmt, createSafeState, commitNextState, isEdgeActive } from './expression/evaluator';
import type { EvalContext } from './expression/evaluator';

export interface GraphSimulationResult {
  nodeOutputs: Record<string, Record<string, number>>; // nodeId -> { portName: value }
  edgeValues: Record<string, number>; // edgeId -> value
  outputValues: Record<string, number>; // outputPortName -> value
  fullState: Record<string, number>;
}

/**
 * Evaluates all nodes and edges in the schematic canvas graph using
 * topological signal propagation, executing each individual logic gate,
 * sub-module, and bus merger step-by-step.
 */
export function evaluateGraphTopological(
  nodes: GraphNode[],
  edges: GraphEdge[],
  inputValues: Record<string, number>,
  modules: Record<string, any> = {}
): GraphSimulationResult {
  const nodeOutputs: Record<string, Record<string, number>> = {};
  const edgeValues: Record<string, number> = {};
  const fullState: Record<string, number> = { ...inputValues };

  // 1. Initialize input nodes with user input values
  for (const node of nodes) {
    if (node.type === 'INPUT') {
      const val = inputValues[node.label] !== undefined ? inputValues[node.label] : (inputValues[`IN_${node.label}`] ?? 0);
      nodeOutputs[node.id] = { out: val };
      fullState[node.label] = val;
      fullState[node.id] = val;
    }
  }

  // 2. Multi-pass propagation loop to evaluate all gates, sub-modules, and buses
  const maxPasses = Math.min(Math.max(nodes.length, 4), 10);
  for (let pass = 0; pass < maxPasses; pass++) {
    for (const node of nodes) {
      if (node.type === 'INPUT') continue;

      const inEdges = edges.filter(e => e.toNode === node.id);

      if (node.type === 'GATE') {
        const lbl = node.label.toUpperCase();
        if (lbl === 'MERGE') {
          // Bus merger node
          let merged = 0;
          for (const edge of inEdges) {
            const srcOutputs = nodeOutputs[edge.fromNode];
            const srcPort = edge.fromPort || 'out';
            const sliceVal = srcOutputs ? (srcOutputs[srcPort] ?? 0) : 0;
            
            // Check slice net format (e.g. w_dec1_d_3_0 -> high=3, low=0) or edge.toPort (e.g. [3:0])
            const sliceMatch = (edge.netName || edge.toPort || '')?.match(/(?:_|^\[?)(\d+):(\d+)(?:\]?$)?/) ||
                               (edge.netName || '')?.match(/_(\d+)_(\d+)$/);
            if (sliceMatch) {
              const p1 = parseInt(sliceMatch[1]);
              const p2 = parseInt(sliceMatch[2]);
              const low = Math.min(p1, p2);
              const high = Math.max(p1, p2);
              const width = Math.abs(high - low) + 1;
              const mask = (1 << width) - 1;
              merged |= (sliceVal & mask) << low;
            } else {
              merged = sliceVal;
            }
          }
          nodeOutputs[node.id] = { out: merged };
          const parentNet = node.id.replace(/^MERGE_/, '');
          fullState[parentNet] = merged;
          fullState[node.id] = merged;
        } else {
          // Standard Logic Gate (NOT, AND, OR, NAND, NOR, XOR, XNOR, BUFFER)
          const inVals: number[] = [];
          for (let i = 0; i < (node.inputs.length || 1); i++) {
            const portName = node.inputs[i] || `in${i}`;
            const edge = inEdges.find(e => e.toPort === portName || (inEdges.length === 1 && !e.toPort));
            if (edge) {
              const srcOutputs = nodeOutputs[edge.fromNode];
              const srcPort = edge.fromPort || 'out';
              inVals.push(srcOutputs ? (srcOutputs[srcPort] ?? 0) : 0);
            } else {
              inVals.push(0);
            }
          }

          let outVal = 0;
          const a = inVals[0] ?? 0;
          const b = inVals[1] ?? 0;

          if (lbl === 'NOT') {
            outVal = (!a) ? 1 : 0;
          } else if (lbl === 'AND') {
            outVal = inVals.reduce((acc, v) => acc & v, 1) & 1;
          } else if (lbl === 'OR') {
            outVal = inVals.reduce((acc, v) => acc | v, 0) & 1;
          } else if (lbl === 'NAND') {
            outVal = (!(inVals.reduce((acc, v) => acc & v, 1) & 1)) ? 1 : 0;
          } else if (lbl === 'NOR') {
            outVal = (!(inVals.reduce((acc, v) => acc | v, 0) & 1)) ? 1 : 0;
          } else if (lbl === 'XOR') {
            outVal = (a ^ b) & 1;
          } else if (lbl === 'XNOR') {
            outVal = (!((a ^ b) & 1)) ? 1 : 0;
          } else if (lbl === 'BUFFER') {
            outVal = a & 1;
          }

          nodeOutputs[node.id] = { out: outVal };
          const outNet = node.id.replace(/^GATE_/, '').replace(/_root(_\d+)*$/, '');
          fullState[outNet] = outVal;
          fullState[node.id] = outVal;
        }
      } else if (node.type === 'MODULE') {
        // Gather sub-module input values from incoming edges
        const subInputs: Record<string, number> = {};
        for (const port of node.inputs) {
          const edge = inEdges.find(e => e.toPort === port);
          if (edge) {
            const srcOutputs = nodeOutputs[edge.fromNode];
            const srcPort = edge.fromPort || 'out';
            subInputs[port] = srcOutputs ? (srcOutputs[srcPort] ?? 0) : 0;
          } else {
            subInputs[port] = 0;
          }
          fullState[`${node.label}_${port}`] = subInputs[port];
        }

        const subOutputs: Record<string, number> = {};

        // 1. Direct Multiplexer (MUX) Evaluation
        if (node.label.startsWith('MUX') || node.id.startsWith('MUX_')) {
          const sel = subInputs['sel'] ?? 0;
          const selectedPort = `i${sel}`;
          const outVal = subInputs[selectedPort] ?? 0;
          subOutputs['out'] = outVal;
          const outNet = node.id.replace(/^MUX_/, '').replace(/_.*$/, '');
          fullState[outNet] = outVal;
          fullState[`${node.label}_out`] = outVal;
          fullState[node.id] = outVal;
        } else {
          // 2. Behavioral RTL Block / Sub-module evaluation
          const possibleModNames = [
            node.details,
            node.label,
            node.id.replace(/^RTL_/, '').replace(/^INST_/, ''),
            Object.keys(modules).find(m => node.id.includes(m))
          ].filter(Boolean);

          let subMod = null;
          for (const name of possibleModNames) {
            if (name && modules[name]) {
              subMod = modules[name];
              break;
            }
          }

          if (subMod && (subMod.alwaysLogic || subMod.assignLogic)) {
            try {
              if (!subMod._compiledEvaluate) {
                try {
                  const parser = new Parser(`${subMod.rawAssignLogic || ''}\n${subMod.rawAlwaysLogic || ''}`);
                  const moduleAST = parser.parseModuleBody();
                  
                  subMod._compiledEvaluate = (inputs: Record<string, number>, st: Record<string, number>) => {
                    const state = createSafeState(st);
                    
                    for (const p of subMod.inputs) {
                      state[p] = inputs[p] ?? 0;
                    }
                    
                    const ctx: EvalContext = { state, nextState: Object.create(null) };
                    
                    for (const block of moduleAST.alwaysBlocks) {
                      if (block.edge === 'posedge' || block.edge === 'negedge') {
                        if (isEdgeActive(block, state)) {
                          evaluateStmt(block.body, ctx);
                        }
                      }
                    }
                    commitNextState(ctx);
                    
                    for (let iter = 0; iter < 3; iter++) {
                      for (const assign of moduleAST.continuousAssigns) {
                        evaluateStmt(assign, ctx);
                      }
                      for (const block of moduleAST.alwaysBlocks) {
                        if (block.edge !== 'posedge' && block.edge !== 'negedge') {
                          if (isEdgeActive(block, state)) {
                            evaluateStmt(block.body, ctx);
                          }
                        }
                      }
                      commitNextState(ctx);
                    }
                    
                    for (const p of subMod.inputs) {
                      state[`__prev_${p}`] = state[p];
                    }
                    
                    return state;
                  };
                } catch (parseErr) {
                  console.warn(`[graphEvaluator] Error parsing module ${node.label}:`, parseErr);
                  subMod._compiledEvaluate = (_inputs: Record<string, number>, st: Record<string, number>) => st;
                }
              }
              const res = subMod._compiledEvaluate(subInputs, {});
              for (const outPort of node.outputs) {
                subOutputs[outPort] = res[outPort] ?? 0;
                fullState[outPort] = subOutputs[outPort];
                fullState[`${node.label}_${outPort}`] = subOutputs[outPort];
                fullState[`${node.id}_${outPort}`] = subOutputs[outPort];
              }
            } catch (modErr) {
              console.warn(`[graphEvaluator] Error evaluating module ${node.label}:`, modErr);
              for (const outPort of node.outputs) subOutputs[outPort] = 0;
            }
          } else {
            for (const outPort of node.outputs) {
              subOutputs[outPort] = 0;
            }
          }
        }
        nodeOutputs[node.id] = subOutputs;
      } else if (node.type === 'OUTPUT') {
        const edge = inEdges[0];
        let outVal = 0;
        if (edge) {
          const srcOutputs = nodeOutputs[edge.fromNode];
          const srcPort = edge.fromPort || 'out';
          outVal = srcOutputs ? (srcOutputs[srcPort] ?? 0) : 0;
        }
        nodeOutputs[node.id] = { in: outVal };
        fullState[node.label] = outVal;
        fullState[node.id] = outVal;
      }
    }
  }

  // 3. Compute exact wire/edge values directly from the source pin that drives it
  for (const edge of edges) {
    const srcOutputs = nodeOutputs[edge.fromNode];
    const srcPort = edge.fromPort || 'out';
    const val = srcOutputs ? (srcOutputs[srcPort] ?? 0) : 0;
    const edgeId = `${edge.fromNode}_${edge.fromPort || ''}_to_${edge.toNode}_${edge.toPort || ''}`;
    edgeValues[edgeId] = val;
    if (edge.netName) {
      fullState[edge.netName] = val;
    }
  }

  const outputValues: Record<string, number> = {};
  for (const node of nodes) {
    if (node.type === 'OUTPUT') {
      outputValues[node.label] = nodeOutputs[node.id]?.in ?? 0;
    }
  }

  return { nodeOutputs, edgeValues, outputValues, fullState };
}
