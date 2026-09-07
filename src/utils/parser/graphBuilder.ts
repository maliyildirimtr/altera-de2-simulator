import { parseExpression, type LogicNode } from './logicParser';

export interface GraphNode {
  id: string;
  type: 'INPUT' | 'OUTPUT' | 'GATE' | 'MODULE';
  label: string;
  details?: string; // module type, e.g. "half_adder"
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  inputs: string[]; // port names for routing
  outputs: string[];
  pathPrefix: string; // The hierarchical prefix, e.g. 'ha1'
  expandedGraph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    width: number;
    height: number;
  };
}

export interface GraphEdge {
  fromNode: string;
  fromPort?: string;
  toNode: string;
  toPort?: string;
  netName?: string;
}

export interface ModuleGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildModuleGraph(
  modName: string, 
  modules: Record<string, any>,
  pathPrefix: string = ''
): ModuleGraph {
  try {
  const mod = modules[modName];
  if (!mod) return { nodes: [], edges: [] };
  // Guard against missing instances array
  if (!Array.isArray(mod.instances)) mod.instances = [];
  if (!Array.isArray(mod.inputs))    mod.inputs    = [];
  if (!Array.isArray(mod.outputs))   mod.outputs   = [];
  if (!Array.isArray(mod.wires))     mod.wires     = [];

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  

  const netSources: Record<string, { nodeId: string; port?: string }> = {};
  
  for (const input of mod.inputs) {
    const id = `IN_${pathPrefix ? pathPrefix + '_' : ''}${input}`;
    nodes.push({ id, type: 'INPUT', label: input, x: 0, y: 0, width: 60, height: 30, layer: 0, inputs: [], outputs: ['out'], pathPrefix });
    netSources[input] = { nodeId: id, port: 'out' };
  }

  for (const inst of mod.instances) {
    const subMod = modules[inst.type];
    const id = `INST_${pathPrefix ? pathPrefix + '_' : ''}${inst.name}`;
    const instInputs = subMod ? subMod.inputs : [];
    const instOutputs = subMod ? subMod.outputs : [];
    const w = 140;
    const h = Math.max(instInputs.length, instOutputs.length, 1) * 22 + 55;

    nodes.push({
      id,
      type: 'MODULE',
      label: inst.name,
      details: inst.type,
      x: 0, y: 0,
      width: w,
      height: h,
      layer: 0,
      inputs: instInputs,
      outputs: instOutputs,
      pathPrefix
    });

    for (const outPort of instOutputs) {
      const netConnectedToPort = Object.keys(inst.connections).find(k => k === outPort);
      if (netConnectedToPort) {
        const netName = inst.connections[netConnectedToPort];
        netSources[netName] = { nodeId: id, port: outPort };
      }
    }
  }

  if (mod.rawAssignLogic) {
    const cleanCode = mod.rawAssignLogic.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const assignRegex = /assign\s+([a-zA-Z0-9_]+)\s*=\s*(.*?);/g;
    let m;
    while ((m = assignRegex.exec(cleanCode)) !== null) {
      const outNet = m[1];
      const expr = m[2];
      const ast = parseExpression(outNet, expr);
      
      function convertAstToGraph(node: LogicNode, path: string = 'root'): { nodeId: string; port?: string } {
        if (node.type === 'INPUT') {
          if (['0', '1', "1'b0", "1'b1", "0'b0", "1'b0", 'open', 'unconnected'].includes(node.label)) {
            return { nodeId: '' };
          }
          return { nodeId: `NET_${node.label}` };
        }

        const id = `GATE_${pathPrefix ? pathPrefix + '_' : ''}${outNet}_${path}`;
        const childrenPointers = node.children.map((c, i) => convertAstToGraph(c, `${path}_${i}`));
        
        nodes.push({
          id, type: 'GATE', label: node.type,
          x: 0, y: 0, width: 60, height: 40, layer: 0,
          inputs: childrenPointers.map((_, i) => `in${i}`), outputs: ['out'], pathPrefix
        });

        childrenPointers.forEach((ptr, i) => {
          if (ptr.nodeId) {
            const netName = ptr.nodeId.startsWith('NET_') ? ptr.nodeId.substring(4) : undefined;
            edges.push({ fromNode: ptr.nodeId, fromPort: ptr.port, toNode: id, toPort: `in${i}`, netName });
          }
        });

        return { nodeId: id, port: 'out' };
      }

      if (ast.children.length > 0 && ast.children[0].type !== 'INPUT') {
        netSources[outNet] = convertAstToGraph(ast.children[0], 'root');
      } else if (ast.children.length > 0 && ast.children[0].type === 'INPUT') {
        const lbl = ast.children[0].label;
        if (!['0', '1', "1'b0", "1'b1", 'open'].includes(lbl)) {
          netSources[outNet] = { nodeId: `NET_${lbl}` };
        }
      }
    }
  }

  // 1. Try AST Synthesis: Transform case(sel) statements into hardware Multiplexer (MUX) components
  let synthesizedMux = false;
  if (mod.instances.length === 0 && mod.alwaysLogic) {
    const rawAlways = mod.alwaysLogic;
    const caseRegex = /case\s*\(\s*([^)]+)\s*\)([\s\S]*?)endcase/g;
    let match;
    const synthesizedOutputs = new Set<string>();

    while ((match = caseRegex.exec(rawAlways)) !== null) {
      const selExpr = match[1].trim();
      const caseContent = match[2];
      
      const selClean = selExpr.replace(/[\{\}\s]/g, '').replace(/\[.*\]/, '');
      const selWidth = mod.portWidths?.[selClean] || (selExpr.includes(',') ? selExpr.split(',').length : 2);
      const numInputs = Math.pow(2, selWidth);

      // Extract case items: pattern: (label) : (body)
      const itemRegex = /(?:(\d+'[bhdBHD][0-9a-fA-F_]+|\d+|default)\s*:)\s*([^;]+(?:;|$)|begin[\s\S]*?end)/g;
      let itemMatch;
      const varBranchAssignments: Record<string, Record<number, string>> = {};

      while ((itemMatch = itemRegex.exec(caseContent)) !== null) {
        const branchLabel = itemMatch[1].trim();
        const branchBody = itemMatch[2].trim();

        let branchIdx = -1;
        if (branchLabel === 'default') {
          branchIdx = -1;
        } else if (branchLabel.includes("'b") || branchLabel.includes("'B")) {
          const binStr = branchLabel.split(/['b'B]/)[1].replace(/_/g, '');
          branchIdx = parseInt(binStr, 2);
        } else if (branchLabel.includes("'h") || branchLabel.includes("'H")) {
          const hexStr = branchLabel.split(/['h'H]/)[1].replace(/_/g, '');
          branchIdx = parseInt(hexStr, 16);
        } else if (branchLabel.includes("'d") || branchLabel.includes("'D")) {
          const decStr = branchLabel.split(/['d'D]/)[1].replace(/_/g, '');
          branchIdx = parseInt(decStr, 10);
        } else if (/^\d+$/.test(branchLabel)) {
          branchIdx = parseInt(branchLabel, 10);
        }

        const assignInBranch = /([a-zA-Z0-9_]+)\s*=\s*([^;]+);/g;
        let aMatch;
        while ((aMatch = assignInBranch.exec(branchBody)) !== null) {
          const varName = aMatch[1].trim();
          const rhsExpr = aMatch[2].trim().replace(/^begin\s*/, '');
          if (!varBranchAssignments[varName]) varBranchAssignments[varName] = {};

          if (branchIdx !== -1) {
            varBranchAssignments[varName][branchIdx] = rhsExpr;
          } else {
            for (let b = 0; b < numInputs; b++) {
              if (varBranchAssignments[varName][b] === undefined) {
                varBranchAssignments[varName][b] = rhsExpr;
              }
            }
          }
        }
      }

      for (const [outVar, branchMap] of Object.entries(varBranchAssignments)) {
        if (Object.keys(branchMap).length === 0) continue;

        const muxId = `MUX_${pathPrefix ? pathPrefix + '_' : ''}${outVar}`;
        const muxInputs = [...Array(numInputs).keys()].map(i => `i${i}`).concat(['sel']);
        const muxHeight = Math.max((numInputs + 1) * 28 + 40, 110);

        nodes.push({
          id: muxId,
          type: 'MODULE',
          label: `MUX${numInputs}`,
          details: `MUX for ${outVar}`,
          x: 0,
          y: 0,
          width: 140,
          height: muxHeight,
          layer: 1,
          inputs: muxInputs,
          outputs: ['out'],
          pathPrefix
        });

        // Connect selector
        edges.push({
          fromNode: `IN_${pathPrefix ? pathPrefix + '_' : ''}${selClean}`,
          fromPort: 'out',
          toNode: muxId,
          toPort: 'sel',
          netName: selClean
        });

        // Connect data inputs i0 .. i(numInputs - 1)
        for (let i = 0; i < numInputs; i++) {
          const expr = branchMap[i] || '0';
          const cleanExpr = expr.replace(/\s+/g, '');

          if (cleanExpr === '0' || cleanExpr === "1'b0" || cleanExpr === "0'b0") {
            continue;
          } else if (cleanExpr === '1' || cleanExpr === "1'b1") {
            continue;
          } else if (cleanExpr.startsWith('~') || cleanExpr.startsWith('!')) {
            const invVar = cleanExpr.slice(1);
            const notGateId = `GATE_NOT_${pathPrefix ? pathPrefix + '_' : ''}${invVar}`;

            if (!nodes.some(n => n.id === notGateId)) {
              nodes.push({
                id: notGateId,
                type: 'GATE',
                label: 'NOT',
                x: 0,
                y: 0,
                width: 60,
                height: 40,
                layer: 0,
                inputs: ['in0'],
                outputs: ['out'],
                pathPrefix
              });
              edges.push({
                fromNode: `IN_${pathPrefix ? pathPrefix + '_' : ''}${invVar}`,
                fromPort: 'out',
                toNode: notGateId,
                toPort: 'in0',
                netName: invVar
              });
            }

            edges.push({
              fromNode: notGateId,
              fromPort: 'out',
              toNode: muxId,
              toPort: `i${i}`,
              netName: `not_${invVar}`
            });
          } else {
            edges.push({
              fromNode: `IN_${pathPrefix ? pathPrefix + '_' : ''}${cleanExpr}`,
              fromPort: 'out',
              toNode: muxId,
              toPort: `i${i}`,
              netName: cleanExpr
            });
          }
        }

        netSources[outVar] = { nodeId: muxId, port: 'out' };
        synthesizedOutputs.add(outVar);
      }
    }

    if (mod.outputs.length > 0 && mod.outputs.every((o: string) => synthesizedOutputs.has(o))) {
      synthesizedMux = true;
    }
  }

  // 2. Fallback: Synthesize Behavioral RTL Block for modules with complex behavioral logic
  if (!synthesizedMux && mod.instances.length === 0 && (!mod.rawAssignLogic || mod.rawAssignLogic.trim() === '') && (mod.alwaysLogic || mod.inputs.length > 0)) {
    const rtlId = `RTL_${pathPrefix ? pathPrefix + '_' : ''}${modName}`;
    const instInputs = [...mod.inputs];
    const instOutputs = [...mod.outputs];
    const w = 170;
    const h = Math.max(instInputs.length, instOutputs.length, 1) * 28 + 60;

    nodes.push({
      id: rtlId,
      type: 'MODULE',
      label: 'always_comb',
      details: modName,
      x: 0,
      y: 0,
      width: w,
      height: h,
      layer: 1,
      inputs: instInputs,
      outputs: instOutputs,
      pathPrefix
    });

    for (const inPort of instInputs) {
      edges.push({
        fromNode: `IN_${pathPrefix ? pathPrefix + '_' : ''}${inPort}`,
        fromPort: 'out',
        toNode: rtlId,
        toPort: inPort,
        netName: inPort
      });
    }

    for (const outPort of instOutputs) {
      netSources[outPort] = { nodeId: rtlId, port: outPort };
    }
  }

  // Process Bus Slicing & Bus Merger nodes
  const parentSlices: Record<string, { instName: string; outPort: string; sliceNet: string; high: number; low: number }[]> = {};
  for (const inst of mod.instances) {
    if (inst.sliceConnections) {
      for (const [port, info] of Object.entries(inst.sliceConnections as Record<string, any>)) {
        if (!parentSlices[info.parentNet]) parentSlices[info.parentNet] = [];
        parentSlices[info.parentNet].push({
          instName: inst.name,
          outPort: port,
          sliceNet: inst.connections[port],
          high: info.high,
          low: info.low
        });
      }
    }
  }

  for (const [parentNet, slices] of Object.entries(parentSlices)) {
    // Sort slices by low index ascending (e.g. [3:0], [7:4])
    slices.sort((a, b) => Math.min(a.low, a.high) - Math.min(b.low, b.high));
    const mergerId = `MERGE_${pathPrefix ? pathPrefix + '_' : ''}${parentNet}`;
    const pWidth = mod.portWidths?.[parentNet] || 8;
    const inputPortLabels = slices.map(s => `[${Math.max(s.high, s.low)}:${Math.min(s.high, s.low)}]`);

    nodes.push({
      id: mergerId,
      type: 'GATE',
      label: 'MERGE',
      details: `[${pWidth - 1}:0]`,
      x: 0,
      y: 0,
      width: 76,
      height: Math.max(slices.length * 24 + 20, 50),
      layer: 0,
      inputs: inputPortLabels,
      outputs: ['out'],
      pathPrefix
    });

    netSources[parentNet] = { nodeId: mergerId, port: 'out' };

    // Connect slice source nodes to the merger inputs
    slices.forEach((s, idx) => {
      const srcInstNodeId = `INST_${pathPrefix ? pathPrefix + '_' : ''}${s.instName}`;
      edges.push({
        fromNode: srcInstNodeId,
        fromPort: s.outPort,
        toNode: mergerId,
        toPort: inputPortLabels[idx],
        netName: s.sliceNet
      });
    });
  }

  for (const output of mod.outputs) {
    const id = `OUT_${pathPrefix ? pathPrefix + '_' : ''}${output}`;
    nodes.push({ id, type: 'OUTPUT', label: output, x: 0, y: 0, width: 60, height: 30, layer: 0, inputs: ['in'], outputs: [], pathPrefix });
    edges.push({ fromNode: `NET_${output}`, toNode: id, toPort: 'in', netName: output });
  }

  for (const inst of mod.instances) {
    const instNode = nodes.find(n => n.type === 'MODULE' && n.label === inst.name);
    if (!instNode) continue;
    
    for (const inPort of instNode.inputs) {
      const netName = inst.connections[inPort];
      if (netName && !['0', '1', "1'b0", "1'b1", 'open', 'unconnected'].includes(netName)) {
        edges.push({ fromNode: `NET_${netName}`, toNode: instNode.id, toPort: inPort, netName: netName });
      }
    }
  }

  function resolveNet(netName: string, visited = new Set<string>()): { nodeId: string; port?: string } | null {
    if (visited.has(netName)) return null; 
    visited.add(netName);
    const source = netSources[netName];
    if (!source) return null; 
    if (source.nodeId.startsWith('NET_')) return resolveNet(source.nodeId.substring(4), visited);
    return source;
  }

  for (let i = edges.length - 1; i >= 0; i--) {
    const edge = edges[i];
    if (edge.fromNode.startsWith('NET_')) {
      const netName = edge.fromNode.substring(4);
      const resolved = resolveNet(netName);
      if (resolved && resolved.nodeId) {
        edge.fromNode = resolved.nodeId;
        edge.fromPort = resolved.port;
        // If this edge didn't have a netName yet, assign the resolved one
        if (!edge.netName) edge.netName = netName;
      } else {
        edges.splice(i, 1);
      }
    }
  }

  const adj: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  nodes.forEach(n => { adj[n.id] = []; inDegree[n.id] = 0; });
  edges.forEach(e => {
    if (adj[e.fromNode]) {
      adj[e.fromNode].push(e.toNode);
      inDegree[e.toNode] = (inDegree[e.toNode] || 0) + 1;
    }
  });

  let queue = nodes.filter(n => inDegree[n.id] === 0);
  nodes.forEach(n => { if (inDegree[n.id] === 0) n.layer = 0; });

  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const v of adj[u.id]) {
      const vNode = nodes.find(n => n.id === v);
      if (vNode) {
        vNode.layer = Math.max(vNode.layer, u.layer + 1);
        inDegree[v]--;
        if (inDegree[v] === 0) queue.push(vNode);
      }
    }
  }

  let maxLayer = 0;
  nodes.forEach(n => {
    if (n.type !== 'OUTPUT') maxLayer = Math.max(maxLayer, n.layer);
  });
  nodes.forEach(n => {
    if (n.type === 'OUTPUT') n.layer = maxLayer + 1;
  });

  const layers: GraphNode[][] = [];
  nodes.forEach(n => {
    if (!layers[n.layer]) layers[n.layer] = [];
    layers[n.layer].push(n);
  });

  // Initialize Layer 0 Y coordinates
  let currentY0 = 50;
  layers[0]?.forEach((node) => {
    node.y = currentY0;
    currentY0 += node.height + 80;
  });

  for (let l = 1; l < layers.length; l++) {
    if (!layers[l]) continue;
    
    layers[l].forEach(node => {
      const incoming = edges.filter(e => e.toNode === node.id);
      if (incoming.length > 0) {
        let sumY = 0;
        incoming.forEach(edge => {
          const fromNode = nodes.find(n => n.id === edge.fromNode);
          if (fromNode) sumY += fromNode.y;
        });
        (node as any).avgY = sumY / incoming.length;
      } else {
        (node as any).avgY = 0;
      }
    });

    layers[l].sort((a, b) => ((a as any).avgY || 0) - ((b as any).avgY || 0));

    const prevLayer = layers[l - 1];
    if (prevLayer && prevLayer.length > 0 && layers[l].length === 1) {
      const minY = prevLayer[0].y;
      const maxY = prevLayer[prevLayer.length - 1].y + prevLayer[prevLayer.length - 1].height;
      const midY = (minY + maxY) / 2;
      layers[l][0].y = Math.max(50, Math.round(midY - layers[l][0].height / 2));
    } else {
      let currentY = 50;
      layers[l].forEach((node) => {
        node.y = currentY;
        currentY += node.height + 60;
      });
    }
  }

  let currentX = 50;
  layers.forEach((layerNodes) => {
    let maxW = 100;
    layerNodes.forEach((node) => {
      node.x = currentX;
      maxW = Math.max(maxW, node.width);
    });
    currentX += maxW + 220;
  });

  return { nodes, edges };
  } catch (err) {
    console.warn('[graphBuilder] buildModuleGraph error — returning empty graph:', err);
    return { nodes: [], edges: [] };
  }
}
