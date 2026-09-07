export interface VerilogModule {
  modules?: Record<string, any>;
  topModule?: string;
  inputs: string[];
  outputs: string[];
  portWidths?: Record<string, number>;
  evaluate: (inputs: Record<string, number>, state: Record<string, number>) => Record<string, number>;
}


export function connectNet(engine: VerilogModule, targetType: string, targetName: string, targetPort: string, sourceNet: string): VerilogModule {
  if (!engine?.modules || !engine?.topModule) return engine;
  const mod = engine.modules[engine.topModule];
  if (!mod) return engine;

  // Guard: sourceNet must be a non-empty string
  if (!sourceNet || typeof sourceNet !== 'string') {
    console.warn('[verilogEngine] connectNet: empty sourceNet, skipping');
    return engine;
  }

  try {
    const newEngine = { ...engine, modules: { ...engine.modules } };
    const newMod = { ...mod, instances: [...(mod.instances || [])], wires: [...(mod.wires || [])] };
    newEngine.modules[engine.topModule] = newMod;

    if (sourceNet.startsWith('CREATE_NET:')) {
        const parts = sourceNet.split(':');
        const srcName = parts[1];
        const srcPort = parts[2];
        if (!srcName || !srcPort) return engine; // malformed
        const newNet = `w_${srcName}_${srcPort}`;

        const srcInstIdx = newMod.instances.findIndex((i: any) => i?.name === srcName);
        if (srcInstIdx !== -1) {
            const src = newMod.instances[srcInstIdx];
            const newInst = { ...src, connections: { ...(src?.connections || {}) } };
            newInst.connections[srcPort] = newNet;
            newMod.instances[srcInstIdx] = newInst;
        }
        if (!newMod.wires.includes(newNet)) newMod.wires.push(newNet);
        sourceNet = newNet;
    }

    if (targetType === 'MODULE') {
      const instIdx = newMod.instances.findIndex((i: any) => i?.name === targetName);
      if (instIdx !== -1) {
         const inst = newMod.instances[instIdx];
         const newInst = { ...inst, connections: { ...(inst?.connections || {}) } };
         newInst.connections[targetPort] = sourceNet;
         newMod.instances[instIdx] = newInst;
      }
    } else if (targetType === 'GATE') {
      let outNet = targetName || '';
      if (outNet.startsWith('GATE_')) outNet = outNet.slice(5);
      outNet = outNet.replace(/_root(_\d+)*$/, '');

      if (outNet && newMod.rawAssignLogic) {
         const regex = new RegExp(`assign\\s+${outNet}\\s*=\\s*([^;]+);`, 'g');
         newMod.rawAssignLogic = newMod.rawAssignLogic.replace(regex, (_match: string, expr: string) => {
             expr = expr.trim();
             let newExpr = expr;
             if (expr.startsWith('(') && expr.endsWith(')')) {
                 expr = expr.slice(1, -1).trim();
                 newExpr = expr;
             }
             if (expr.startsWith('~')) {
                 newExpr = `~${sourceNet}`;
             } else {
                 const opMatch = expr.match(/([&|^])/);
                 if (opMatch) {
                     const op = opMatch[1];
                     const parts = expr.split(op).map((s: string) => s.trim());
                     if (targetPort === 'in0') parts[0] = sourceNet;
                     if (targetPort === 'in1') parts[1] = sourceNet;
                     newExpr = `${parts[0]} ${op} ${parts[1]}`;
                 }
             }
             return `assign ${outNet} = ${newExpr};`;
         });
      }
    } else if (targetType === 'OUTPUT') {
      if (newMod.rawAssignLogic) {
        const regex = new RegExp(`assign\\s+${targetName}\\s*=\\s*[^;]+;`, 'g');
        newMod.rawAssignLogic = newMod.rawAssignLogic.replace(regex, `assign ${targetName} = ${sourceNet};`);
      }
    }

    return recompileEngine(newEngine);
  } catch (err) {
    console.warn('[verilogEngine] connectNet error — returning original engine:', err);
    return engine; // ← white-screen prevention: state stays intact
  }
}

export function disconnectNet(engine: VerilogModule, targetType: string, targetName: string, targetPort: string): VerilogModule {
  if (!engine?.modules || !engine?.topModule) return engine;
  const mod = engine.modules[engine.topModule];
  if (!mod) return engine;

  try {
    const newEngine = { ...engine, modules: { ...engine.modules } };
    const newMod = { ...mod, instances: [...(mod.instances || [])], wires: [...(mod.wires || [])] };
    newEngine.modules[engine.topModule] = newMod;

    if (targetType === 'MODULE') {
      const instIdx = newMod.instances.findIndex((i: any) => i?.name === targetName);
      if (instIdx !== -1) {
         const newInst = { ...newMod.instances[instIdx], connections: { ...(newMod.instances[instIdx]?.connections || {}) } };
         delete newInst.connections[targetPort];
         newMod.instances[instIdx] = newInst;
      }
    } else if (targetType === 'GATE') {
      let outNet = targetName || '';
      if (outNet.startsWith('GATE_')) outNet = outNet.slice(5);
      outNet = outNet.replace(/_root(_\d+)*$/, '');

      if (outNet && newMod.rawAssignLogic) {
         const regex = new RegExp(`assign\\s+${outNet}\\s*=\\s*([^;]+);`);
         const match = regex.exec(newMod.rawAssignLogic);
         if (match) {
             let expr = match[1].trim();
             if (expr.startsWith('(') && expr.endsWith(')')) expr = expr.slice(1, -1).trim();
             
             let newExpr = expr;
             if (expr.startsWith('~')) {
                 newExpr = `~0`;
             } else {
                 const opMatch = expr.match(/([&|^])/);
                 if (opMatch) {
                     const op = opMatch[1];
                     const parts = expr.split(op).map((s: string) => s.trim());
                     if (targetPort === 'in0') parts[0] = '0';
                     if (targetPort === 'in1') parts[1] = '0';
                     newExpr = `${parts[0]} ${op} ${parts[1]}`;
                 }
             }
             
             const replaceRegex = new RegExp(`assign\\s+${outNet}\\s*=\\s*[^;]+;`, 'g');
             newMod.rawAssignLogic = newMod.rawAssignLogic.replace(replaceRegex, `assign ${outNet} = ${newExpr};`);
         }
      }
    } else if (targetType === 'OUTPUT') {
      if (newMod.rawAssignLogic) {
        const regex = new RegExp(`assign\\s+${targetName}\\s*=\\s*([^;]+);`);
        const match = regex.exec(newMod.rawAssignLogic);
        if (match) {
          const expr = match[1];
          if (expr !== '0' && expr !== "1'b0") {
              const dummyNet = `float_${targetName}_${Math.floor(Math.random() * 1000)}`;
              if (!newMod.wires.includes(dummyNet)) newMod.wires.push(dummyNet);
              
              const replaceRegex = new RegExp(`assign\\s+${targetName}\\s*=\\s*[^;]+;`, 'g');
              newMod.rawAssignLogic = newMod.rawAssignLogic.replace(replaceRegex, `assign ${dummyNet} = ${expr};\nassign ${targetName} = 0;`);
              
              if (newMod.assignLogic) {
                  const regex2 = new RegExp(`^\\s*${targetName}\\s*=\\s*[^;]+;$`, 'gm');
                  newMod.assignLogic = newMod.assignLogic.replace(regex2, `      ${dummyNet} = ${expr};\n      ${targetName} = 0;`);
              }
          } else {
              const replaceRegex = new RegExp(`assign\\s+${targetName}\\s*=\\s*[^;]+;`, 'g');
              newMod.rawAssignLogic = newMod.rawAssignLogic.replace(replaceRegex, `assign ${targetName} = 0;`);
              if (newMod.assignLogic) {
                  const regex2 = new RegExp(`^\\s*${targetName}\\s*=\\s*[^;]+;$`, 'gm');
                  newMod.assignLogic = newMod.assignLogic.replace(regex2, `      ${targetName} = 0;`);
              }
          }
        }
      }
    }
    return recompileEngine(newEngine);
  } catch (err) {
    console.warn('[verilogEngine] disconnectNet error — returning original engine:', err);
    return engine; // ← safe fallback: no crash, no white screen
  }
}

export function elaborateEngine(modules: Record<string, any>, topModule: string): VerilogModule {
  const topMod = modules[topModule];
  if (!topMod) {
    throw new Error(`Top module '${topModule}' not found in modules.`);
  }

  const topInputs: string[] = topMod.inputs || [];
  const topOutputs: string[] = topMod.outputs || [];
  
  const allWires = new Set<string>(topMod.wires || []);
  const allRegs = new Set<string>(topMod.regs || []);
  let combinedAssignLogic = "";
  let combinedAlwaysLogic = "";

  const submoduleMirrors: { internal: string; external: string }[] = [];

  function flatten(modName: string, instPrefix: string, connections: Record<string, string> | null) {
    const mod = modules[modName];
    if (!mod) {
      console.warn(`Submodule ${modName} is instantiated but not found in code!`);
      return;
    }

    const dict: Record<string, string> = {};

    // 1. Map input ports: if connection provided, use it. If disconnected, default to '0'
    for (const inPort of (mod.inputs || [])) {
      if (connections && connections[inPort] !== undefined && connections[inPort] !== '') {
        dict[inPort] = connections[inPort];
        if (instPrefix) {
          submoduleMirrors.push({ internal: `${instPrefix}_${inPort}`, external: connections[inPort] });
        }
      } else if (instPrefix) {
        dict[inPort] = '0';
        submoduleMirrors.push({ internal: `${instPrefix}_${inPort}`, external: '0' });
      }
    }

    // 2. Map output ports: if connection provided, use it. If not, generate an internal wire
    for (const outPort of (mod.outputs || [])) {
      if (connections && connections[outPort] !== undefined && connections[outPort] !== '') {
        dict[outPort] = connections[outPort];
        if (instPrefix) {
          submoduleMirrors.push({ internal: `${instPrefix}_${outPort}`, external: connections[outPort] });
        }
      } else if (instPrefix) {
        const internalNet = `${instPrefix}_${outPort}`;
        dict[outPort] = internalNet;
        allWires.add(internalNet);
      }
    }

    // 3. Prefix internal wires/regs
    for (const w of (mod.wires || [])) {
      const newName = instPrefix ? `${instPrefix}_${w}` : w;
      dict[w] = newName;
      if (instPrefix) allWires.add(newName);
    }
    for (const r of (mod.regs || [])) {
      const newName = instPrefix ? `${instPrefix}_${r}` : r;
      dict[r] = newName;
      if (instPrefix) allRegs.add(newName);
    }

    function applyDict(codeStr: string) {
      if (!codeStr) return "";
      let res = codeStr;
      const sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length);
      for (const oldName of sortedKeys) {
        const newName = dict[oldName];
        const regex = new RegExp(`\\b${oldName}\\b`, 'g');
        res = res.replace(regex, newName);
      }
      return res;
    }

    if (mod.assignLogic) {
      combinedAssignLogic += `// --- Flattened ${modName} ${instPrefix} ---\n`;
      combinedAssignLogic += applyDict(mod.assignLogic) + '\n';
    }
    if (mod.alwaysLogic) {
      combinedAlwaysLogic += applyDict(mod.alwaysLogic) + '\n';
    }

    // Recursively flatten sub-instances
    for (const inst of (mod.instances || [])) {
      const resolvedConnections: Record<string, string> = {};
      for (const [p, net] of Object.entries(inst.connections || {})) {
        resolvedConnections[p] = dict[net as string] || (net as string);
      }
      const newPrefix = instPrefix ? `${instPrefix}_${inst.name}` : inst.name;
      flatten(inst.type, newPrefix, resolvedConnections);
    }
  }

  flatten(topModule, '', null);

  // Scan combined logic to ensure ALL referenced identifiers are declared in the JS function scope
  const declaredVars = new Set<string>([...topInputs, ...topOutputs, ...allWires, ...allRegs]);
  const jsKeywords = new Set([
    'let', 'var', 'const', 'if', 'else', 'for', 'while', 'return', 'state', 'inputs', 
    'iter', 'Math', 'true', 'false', 'null', 'undefined', 'break', 'continue', 'switch', 'case', 'default',
    'function', 'class', 'delete', 'typeof', 'instanceof', 'void', 'new', 'this', 'super', 
    'import', 'export', 'try', 'catch', 'finally', 'throw', 'do', 'in', 'of', 'debugger', 'with', 'yield', 'await', 'async'
  ]);

  const identifierRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  let identMatch;
  const scannedText = `${combinedAssignLogic}\n${combinedAlwaysLogic}`.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  while ((identMatch = identifierRegex.exec(scannedText)) !== null) {
    const ident = identMatch[0];
    if (!declaredVars.has(ident) && !jsKeywords.has(ident) && isNaN(Number(ident))) {
      allWires.add(ident);
      declaredVars.add(ident);
    }
  }

  // Deduplicate all internal signals (excluding topInputs which are declared from inputs map)
  const inputSet = new Set(topInputs);
  const internalSignalSet = new Set<string>();
  for (const sig of [...topOutputs, ...allWires, ...allRegs]) {
    if (!inputSet.has(sig)) {
      internalSignalSet.add(sig);
    }
  }
  const internalSignals: string[] = Array.from(internalSignalSet);

  const fnBody = `
    try {
      // Inputs (prefer inputs map, fallback to preserved state value)
      ${topInputs.map((i: string) => `let ${i} = inputs['${i}'] !== undefined ? inputs['${i}'] : (state['${i}'] ?? 0);`).join('\n      ')}
      
      // Outputs & Internal State
      ${internalSignals.map((s: string) => `let ${s} = state['${s}'] || 0;`).join('\n      ')}
      
      // Propagation Loop
      for (let iter = 0; iter < 3; iter++) {
${combinedAssignLogic}
${combinedAlwaysLogic}
      }
      
      // Write back state
      ${topInputs.map((i: string) => `state['${i}'] = ${i};`).join('\n      ')}
      ${internalSignals.map((s: string) => `state['${s}'] = ${s};`).join('\n      ')}
      ${submoduleMirrors.map(m => `state['${m.internal}'] = ${m.external === '0' ? '0' : `(state['${m.external}'] ?? ${m.external} ?? 0)`};`).join('\n      ')}
      
      // Save previous inputs
      ${topInputs.map((i: string) => `state['__prev_${i}'] = ${i};`).join('\n      ')}
      
      return state;
    } catch (evalErr) {
      console.warn("[evaluate runtime error]", evalErr);
      return state;
    }
  `;

  try {
    const evaluate = new Function('inputs', 'state', fnBody) as any;
    return { inputs: topInputs, outputs: topOutputs, evaluate, modules, topModule };
  } catch (err) {
    console.error("Transpilation Error:", err);
    console.error("Generated Code:", fnBody);
    const fallbackEvaluate = (_inputs: Record<string, number>, state: Record<string, number>) => state;
    return { inputs: topInputs, outputs: topOutputs, evaluate: fallbackEvaluate, modules, topModule };
  }
}

export function parseVerilogLiteralVal(lit: string): number {
  lit = lit.trim();
  const binMatch = lit.match(/^\d+'b([01xXzZ_]+)$/i);
  if (binMatch) return parseInt(binMatch[1].replace(/_/g, ''), 2) || 0;
  const hexMatch = lit.match(/^\d+'h([0-9a-fA-F_]+)$/i);
  if (hexMatch) return parseInt(hexMatch[1].replace(/_/g, ''), 16) || 0;
  const decMatch = lit.match(/^\d+'d([0-9_]+)$/i);
  if (decMatch) return parseInt(decMatch[1].replace(/_/g, ''), 10) || 0;
  if (/^\d+$/.test(lit)) return parseInt(lit, 10);
  return 0;
}

function replaceCaseWithSwitch(str: string): string {
  let res = '';
  let i = 0;
  while (i < str.length) {
    const caseIdx = str.indexOf('case', i);
    if (caseIdx === -1) {
      res += str.slice(i);
      break;
    }
    const isWord = (caseIdx === 0 || /[\s;{}]/.test(str[caseIdx - 1])) && /[\s\(]/.test(str[caseIdx + 4] || '');
    if (!isWord) {
      res += str.slice(i, caseIdx + 4);
      i = caseIdx + 4;
      continue;
    }
    res += str.slice(i, caseIdx);
    const openParen = str.indexOf('(', caseIdx + 4);
    if (openParen === -1) {
      res += str.slice(caseIdx);
      break;
    }
    let depth = 1;
    let j = openParen + 1;
    while (j < str.length && depth > 0) {
      if (str[j] === '(') depth++;
      else if (str[j] === ')') depth--;
      j++;
    }
    const expr = str.slice(openParen + 1, j - 1);
    res += `switch (${expr}) {`;
    i = j;
  }
  return res;
}

export function transpileVerilogCodeBlock(code: string): string {
  let js = code.replace(/^(?:\s*always_comb|\s*always_ff|\s*always\s*(?:@\s*(?:\(.*?\)|[*]|\w+))?)\s*/i, '');
  js = js.replace(/\b\d+'b([01_xXzZ]+)\b/gi, (_, b) => String(parseInt(b.replace(/[_xXzZ]/g, '0'), 2)));
  js = js.replace(/\b\d+'h([0-9a-fA-F_]+)\b/gi, (_, h) => String(parseInt(h.replace(/_/g, ''), 16)));
  js = js.replace(/\b\d+'d([0-9_]+)\b/gi, (_, d) => String(parseInt(d.replace(/_/g, ''), 10)));
  js = js.replace(/\b\d+'o([0-7_]+)\b/gi, (_, o) => String(parseInt(o.replace(/_/g, ''), 8)));
  js = js.replace(/\b1'b0\b/g, '0').replace(/\b1'b1\b/g, '1');

  js = replaceCaseWithSwitch(js);
  js = js.replace(/\bendcase\b/g, '}');

  js = js.replace(/\{([^{}]+)\}/g, (match, inner) => {
    const parts = inner.split(',').map((p: string) => p.trim()).filter(Boolean);
    if (parts.length <= 1) return match;
    const n = parts.length;
    return '(' + parts.map((p: string, i: number) => {
      const shift = n - 1 - i;
      return shift > 0 ? `((${p}) << ${shift})` : `(${p})`;
    }).join(' | ') + ')';
  });

  js = js.replace(/([0-9a-zA-Z_]+)\s*:\s*(?:begin\s*)?([^;]+;)(?:\s*end)?/g, (match, label, stmt) => {
    if (label === 'default') {
      return `default: ${stmt} break;`;
    }
    if (!isNaN(Number(label)) || /^[a-zA-Z0-9_]+$/.test(label)) {
      return `case ${label}: ${stmt} break;`;
    }
    return match;
  });

  js = js.replace(/\bbegin(?:\s*:\s*[a-zA-Z0-9_]+)?\b/g, '{');
  js = js.replace(/\bend(?:\s*:\s*[a-zA-Z0-9_]+)?\b/g, '}');
  js = js.replace(/<=/g, '=');

  return js;
}

function transpileVerilogRhs(expr: string): string {
  expr = expr.trim();
  if (expr === "1'b0" || expr === '0') return '0';
  if (expr === "1'b1" || expr === '1') return '1';
  
  let js = expr
    .replace(/\b\d+'b([01_]+)\b/gi, (_, b) => String(parseInt(b.replace(/_/g, ''), 2)))
    .replace(/\b\d+'h([0-9a-f_]+)\b/gi, (_, h) => String(parseInt(h.replace(/_/g, ''), 16)))
    .replace(/\b\d+'d([0-9_]+)\b/gi, (_, d) => String(parseInt(d.replace(/_/g, ''), 10)))
    .replace(/!([a-zA-Z0-9_]+(?:\[\d+(?::\d+)?\])?)/g, '((!$1) ? 1 : 0)')
    .replace(/~([a-zA-Z0-9_]+(?:\[\d+(?::\d+)?\])?)/g, '((~$1) & 1)');
  
  return js;
}

export function recompileEngine(engine: VerilogModule): VerilogModule {
  if (!engine?.modules || !engine?.topModule) return engine;
  try {
    for (const mod of Object.values(engine.modules)) {
      if (mod && mod.rawAssignLogic) {
        let assignLogic = "";
        const assignRegex = /assign\s+([a-zA-Z0-9_]+)\s*=\s*(.*?);/g;
        let m;
        while ((m = assignRegex.exec(mod.rawAssignLogic)) !== null) {
          assignLogic += `      ${m[1]} = (${m[2]}) & 1;\n`;
        }
        mod.assignLogic = assignLogic;
      }
    }
    return elaborateEngine(engine.modules, engine.topModule);
  } catch (err) {
    console.warn('[verilogEngine] recompileEngine error:', err);
    return engine;
  }
}

export interface InternalModuleDef {
  inputs: string[];
  outputs: string[];
  wires: string[];
  regs: string[];
  portWidths?: Record<string, number>;
  assignLogic: string;
  rawAssignLogic: string;
  alwaysLogic: string;
  instances: { 
    type: string; 
    name: string; 
    connections: Record<string, string>; 
    sliceConnections?: Record<string, { parentNet: string; high: number; low: number }>;
  }[];
}

export function compileVerilog(code: string): VerilogModule {
  // Remove comments
  const cleanCode = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  const modules: Record<string, InternalModuleDef> = {};
  const moduleRegex = /module\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*;(.*?)endmodule/gs;

  let match;
  while ((match = moduleRegex.exec(cleanCode)) !== null) {
    const modName = match[1];
    const portStr = match[2];
    const bodyStr = match[3];

    const inputs: string[] = [];
    const outputs: string[] = [];
    const wires: string[] = [];
    const regs: string[] = [];
    const instances: { 
      type: string; 
      name: string; 
      connections: Record<string, string>; 
      sliceConnections?: Record<string, { parentNet: string; high: number; low: number }>;
    }[] = [];
    let assignLogic = "";
    let rawAssignLogic = "";
    let alwaysLogic = "";

    const portWidths: Record<string, number> = {};

    // Parse inline ports
    const inlinePorts = portStr.split(',');
    let currentDir = '';
    for (const port of inlinePorts) {
      const p = port.trim();
      const widthMatch = p.match(/\[(\d+):(\d+)\]/);
      const bitWidth = widthMatch ? Math.abs(parseInt(widthMatch[1]) - parseInt(widthMatch[2])) + 1 : 1;

      if (p.startsWith('input')) {
        currentDir = 'input';
        const name = p.replace(/input\s+(?:logic\s+|wire\s+|reg\s+)?(?:\[\d+:\d+\]\s*)?/, '').trim();
        if (name) {
          if (!inputs.includes(name)) inputs.push(name);
          portWidths[name] = bitWidth;
        }
      } else if (p.startsWith('output')) {
        currentDir = 'output';
        const name = p.replace(/output\s+(?:logic\s+|wire\s+|reg\s+)?(?:\[\d+:\d+\]\s*)?/, '').trim();
        if (name) {
          if (!outputs.includes(name)) outputs.push(name);
          portWidths[name] = bitWidth;
        }
      } else if (p) {
        const name = p.replace(/(?:logic\s+|wire\s+|reg\s+)?(?:\[\d+:\d+\]\s*)?/, '').trim();
        if (name) {
          if (currentDir === 'input' && !inputs.includes(name)) inputs.push(name);
          if (currentDir === 'output' && !outputs.includes(name)) outputs.push(name);
          portWidths[name] = bitWidth;
        }
      }
    }

    // Body declarations
    const inputRegex = /input\s+(?:logic\s+|wire\s+|reg\s+)?(?:\[(\d+):(\d+)\]\s*)?(.*?);/g;
    const outputRegex = /output\s+(?:logic\s+|wire\s+|reg\s+)?(?:\[(\d+):(\d+)\]\s*)?(.*?);/g;
    const wireRegex = /(?:wire|logic)\s+(?:\[(\d+):(\d+)\]\s*)?(.*?);/g;
    const regRegex = /reg\s+(?:\[(\d+):(\d+)\]\s*)?(.*?);/g;

    let m;
    while ((m = inputRegex.exec(bodyStr)) !== null) {
      const bitWidth = m[1] && m[2] ? Math.abs(parseInt(m[1]) - parseInt(m[2])) + 1 : 1;
      m[3].split(',').forEach(p => { const name = p.trim(); if (name) { inputs.push(name); portWidths[name] = bitWidth; } });
    }
    while ((m = outputRegex.exec(bodyStr)) !== null) {
      const bitWidth = m[1] && m[2] ? Math.abs(parseInt(m[1]) - parseInt(m[2])) + 1 : 1;
      m[3].split(',').forEach(p => { const name = p.trim(); if (name) { outputs.push(name); portWidths[name] = bitWidth; } });
    }
    while ((m = wireRegex.exec(bodyStr)) !== null) { m[3].split(',').forEach(p => wires.push(p.trim())); }
    while ((m = regRegex.exec(bodyStr)) !== null) { m[3].split(',').forEach(p => regs.push(p.trim())); }

    // Assigns
    const assignRegex = /assign\s+([a-zA-Z0-9_]+(?:\s*\[\s*\d+\s*(?::\s*\d+\s*)?\])?)\s*=\s*(.*?);/g;
    while ((m = assignRegex.exec(bodyStr)) !== null) {
      const lhs = m[1].replace(/\s+/g, '');
      const rhs = m[2];
      const bitMatch = lhs.match(/^([a-zA-Z0-9_]+)\[(\d+)\]$/);
      if (bitMatch) {
        const net = bitMatch[1];
        const bitIdx = parseInt(bitMatch[2]);
        assignLogic += `      ${net} = (${net} & ~(1 << ${bitIdx})) | (((${transpileVerilogRhs(rhs)}) & 1) << ${bitIdx});\n`;
        rawAssignLogic += `assign ${lhs} = ${rhs};\n`;
      } else {
        assignLogic += `      ${lhs} = (${transpileVerilogRhs(rhs)});\n`;
        rawAssignLogic += `assign ${lhs} = ${rhs};\n`;
      }
    }

    // Always blocks (always_comb, always_ff, always @*, always @(...))
    const startRegex = /(always_comb|always_ff|always(?:\s*@\s*(?:\(.*?\)|[*]|\w+))?)\s*/g;
    let aMatch;
    while ((aMatch = startRegex.exec(bodyStr)) !== null) {
      const header = aMatch[1] || '';
      const afterStart = bodyStr.slice(startRegex.lastIndex);
      const trimmed = afterStart.trimStart();
      const offset = afterStart.length - trimmed.length;
      const searchIdx = startRegex.lastIndex + offset;

      let blockBody = '';
      if (bodyStr.slice(searchIdx).startsWith('begin')) {
        let depth = 0;
        const tokenRegex = /\b(begin|end|case|endcase)\b/g;
        tokenRegex.lastIndex = searchIdx;
        let tMatch;
        let endIdx = searchIdx;
        while ((tMatch = tokenRegex.exec(bodyStr)) !== null) {
          if (tMatch[1] === 'begin' || tMatch[1] === 'case') {
            depth++;
          } else if (tMatch[1] === 'end' || tMatch[1] === 'endcase') {
            depth--;
            if (depth === 0) {
              endIdx = tokenRegex.lastIndex;
              break;
            }
          }
        }
        blockBody = bodyStr.slice(searchIdx, endIdx);
        startRegex.lastIndex = endIdx;
      } else {
        const semiIdx = bodyStr.indexOf(';', searchIdx);
        if (semiIdx !== -1) {
          blockBody = bodyStr.slice(searchIdx, semiIdx + 1);
          startRegex.lastIndex = semiIdx + 1;
        }
      }

      if (blockBody) {
        const transpiledBlock = transpileVerilogCodeBlock(blockBody);
        if (header.includes('posedge')) {
          const clkName = header.split('posedge')[1]?.replace(/[\(\)\s*]/g, '').trim();
          if (clkName) {
            alwaysLogic += `      if (${clkName} === 1 && state['__prev_${clkName}'] === 0) {\n  ${transpiledBlock}\n      }\n`;
          }
        } else {
          alwaysLogic += `      ${transpiledBlock}\n`;
        }
      }
    }

      // Instances
      const instanceRegex = /([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*;/gs;
      while ((m = instanceRegex.exec(bodyStr)) !== null) {
        const type = m[1];
        const name = m[2];
        const connStr = m[3];

        // Exclude keywords
        if (['module', 'if', 'while', 'always', 'always_comb', 'always_ff', 'initial', 'assign', 'wire', 'reg', 'input', 'output'].includes(type)) continue;

        const connections: Record<string, string> = {};
        const sliceConnections: Record<string, { parentNet: string; high: number; low: number }> = {};
        
        // Match port connections: .port(expression_or_signal)
        const connRegex = /\.([a-zA-Z0-9_]+)\s*\(\s*([^)]*(?:\([^)]*\)[^)]*)*)\s*\)/g;
        let cMatch;
        while ((cMatch = connRegex.exec(connStr)) !== null) {
          const portName = cMatch[1];
          const rawExpr = cMatch[2].trim();
          if (!rawExpr) continue;

          // Check if rawExpr is a bus slice: e.g. D[3:0] or D[7:4] or D[2]
          const sliceMatch = rawExpr.match(/^([a-zA-Z0-9_]+)\[(\d+)(?::(\d+))?\]$/);
          
          // Check if rawExpr is an expression with logic operators: e.g. E | !C or ~C & E or A ^ B
          const isOperatorExpr = /[&|^~!()\+\-]/.test(rawExpr);

          if (sliceMatch) {
            const parentNet = sliceMatch[1];
            const high = parseInt(sliceMatch[2]);
            const low = sliceMatch[3] !== undefined ? parseInt(sliceMatch[3]) : high;
            const sWidth = Math.abs(high - low) + 1;
            const sliceNet = `w_${name}_${portName}_${high}_${low}`;
            
            connections[portName] = sliceNet;
            sliceConnections[portName] = { parentNet, high, low };
            if (!wires.includes(sliceNet)) wires.push(sliceNet);
            portWidths[sliceNet] = sWidth;
          } else if (isOperatorExpr) {
            // Inline expression -> synthesize wire & assign logic
            const exprWire = `w_${name}_${portName}_expr`;
            connections[portName] = exprWire;
            if (!wires.includes(exprWire)) wires.push(exprWire);
            rawAssignLogic += `assign ${exprWire} = ${rawExpr};\n`;
            assignLogic += `      ${exprWire} = (${transpileVerilogRhs(rawExpr)}) & 1;\n`;
          } else {
            connections[portName] = rawExpr;
          }
        }
        instances.push({ type, name, connections, sliceConnections });
      }

      // Automatically synthesize bus merging logic for sliced outputs
      const parentSlices: Record<string, { sliceNet: string; high: number; low: number }[]> = {};
      for (const inst of instances) {
        if (inst.sliceConnections) {
          for (const [port, info] of Object.entries(inst.sliceConnections)) {
            if (!parentSlices[info.parentNet]) parentSlices[info.parentNet] = [];
            parentSlices[info.parentNet].push({
              sliceNet: inst.connections[port],
              high: info.high,
              low: info.low
            });
          }
        }
      }

      for (const [pNet, slices] of Object.entries(parentSlices)) {
        if (outputs.includes(pNet) || wires.includes(pNet)) {
          const mergeExpr = slices.map(s => {
            const width = Math.abs(s.high - s.low) + 1;
            const mask = (1 << width) - 1;
            return `((${s.sliceNet} & 0x${mask.toString(16)}) << ${Math.min(s.high, s.low)})`;
          }).join(' | ');

          assignLogic += `      ${pNet} = (${mergeExpr});\n`;
        }
      }

    // Deduplicate
    const uniqueInputs = Array.from(new Set(inputs)).filter(Boolean);
    const uniqueOutputs = Array.from(new Set(outputs)).filter(Boolean);
    const uniqueWires = Array.from(new Set(wires)).filter(Boolean);
    const uniqueRegs = Array.from(new Set(regs)).filter(Boolean);

    modules[modName] = { 
      inputs: uniqueInputs, 
      outputs: uniqueOutputs, 
      wires: uniqueWires, 
      regs: uniqueRegs, 
      portWidths,
      assignLogic, 
      rawAssignLogic, 
      alwaysLogic, 
      instances 
    };
  }

  const modNames = Object.keys(modules);
  if (modNames.length === 0) {
    throw new Error("No modules found in the Verilog code.");
  }

  // Find Top Module
  const instantiated = new Set();
  for (const mod of Object.values(modules)) {
    for (const inst of mod.instances) {
      instantiated.add(inst.type);
    }
  }

  let topModule: string | null = null;
  for (let i = modNames.length - 1; i >= 0; i--) {
    if (!instantiated.has(modNames[i])) {
      topModule = modNames[i];
      break;
    }
  }
  if (!topModule) topModule = modNames[modNames.length - 1];

  const topMod = modules[topModule];
  const engine = elaborateEngine(modules, topModule);
  if (topMod && topMod.portWidths) {
    engine.portWidths = topMod.portWidths;
  }
  return engine;
}

