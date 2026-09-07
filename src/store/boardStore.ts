import { create } from 'zustand';
import type { ParsedPort } from '../utils/parser/pinParser';
import { disconnectNet, connectNet, compileVerilog, recompileEngine, type VerilogModule } from '../core/simulator/verilogEngine';
import { buildModuleGraph } from '../utils/parser/graphBuilder';
import { evaluateGraphTopological } from '../core/simulator/graphEvaluator';
import { COMPONENT_REGISTRY } from '../utils/components/componentRegistry';

interface BoardState {
  // Inputs
  switches: number[]; // 18 switches: 0 or 1
  keys: number[];     // 4 keys (active-low): 1 (unpressed) or 0 (pressed)
  
  // Outputs
  ledR: number[];     // 18 red LEDs: 0 or 1
  ledG: number[];     // 9 green LEDs: 0 or 1
  hex: number[][];    // 8 7-segment displays, each with 7 segments (active-low)
  
  // File Upload and Pin Mapping State
  isUploaderOpen: boolean;
  setUploaderOpen: (open: boolean) => void;
  
  pinMappings: ParsedPort[];
  setPinMappings: (mappings: ParsedPort[]) => void;
  
  hdlCode: string;
  setHdlCode: (code: string) => void;
  
  // Simulation Engine State
  engine: VerilogModule | null;
  setEngine: (engine: VerilogModule | null) => void;
  simState: Record<string, number>;
  clockState: number; // 0 or 1
  waveformHistory: Array<{ time: number, state: Record<string, number> }>;
  
  // Continuous Auto-Simulation (Run/Pause)
  isSimRunning: boolean;
  simFrequency: number; // in Hz
  startAutoSimulation: () => void;
  stopAutoSimulation: () => void;
  setSimFrequency: (freq: number) => void;

  runSimulationCycle: () => void;
  tickClock: () => void;
  
  // Actions
  toggleSwitch: (index: number) => void;
  setKey: (index: number, pressed: boolean) => void;
  setLedR: (index: number, value: number) => void;
  setLedG: (index: number, value: number) => void;
  setHex: (index: number, segments: number[]) => void;
  resetBoard: () => void;
  toggleInputByName: (portName: string) => void;
  setInputVal: (portName: string, val: number) => void;
  
  // Component & Interactive Routing Actions
  addComponentToHdl: (componentId: string) => string | undefined;
  deleteNode: (nodeId: string) => void;
  disconnectEdge: (targetType: string, targetName: string, targetPort: string) => void;
  connectEdge: (targetType: string, targetName: string, targetPort: string, sourceNet: string) => void;
}

const INITIAL_SWITCHES = Array(18).fill(0);
const INITIAL_KEYS = Array(4).fill(1); // Active-low: 1 is unpressed
const INITIAL_LEDR = Array(18).fill(0);
const INITIAL_LEDG = Array(9).fill(0);
const INITIAL_HEX = Array(8).fill(Array(7).fill(1)); // Active-low: 1 is off

let simIntervalTimer: ReturnType<typeof setInterval> | null = null;

export const useBoardStore = create<BoardState>((set, get) => ({
  switches: [...INITIAL_SWITCHES],
  keys: [...INITIAL_KEYS],
  ledR: [...INITIAL_LEDR],
  ledG: [...INITIAL_LEDG],
  hex: [...INITIAL_HEX],
  
  isUploaderOpen: false,
  setUploaderOpen: (open) => set({ isUploaderOpen: open }),
  
  pinMappings: [],
  setPinMappings: (mappings) => set({ pinMappings: mappings }),
  
  hdlCode: '',
  setHdlCode: (code) => set({ hdlCode: code }),
  
  engine: null,
  setEngine: (engine) => set({ engine, simState: {}, clockState: 0, waveformHistory: [] }),
  simState: {},
  clockState: 0,
  waveformHistory: [],

  // Simulation Controls
  isSimRunning: false,
  simFrequency: 5, // 5 Hz default

  startAutoSimulation: () => {
    if (simIntervalTimer) clearInterval(simIntervalTimer);
    const freq = get().simFrequency || 5;
    const intervalMs = Math.max(20, Math.floor(1000 / (freq * 2)));

    simIntervalTimer = setInterval(() => {
      get().tickClock();
    }, intervalMs);

    set({ isSimRunning: true });
  },

  stopAutoSimulation: () => {
    if (simIntervalTimer) {
      clearInterval(simIntervalTimer);
      simIntervalTimer = null;
    }
    set({ isSimRunning: false });
  },

  setSimFrequency: (freq: number) => {
    set({ simFrequency: freq });
    if (get().isSimRunning) {
      get().startAutoSimulation(); // Restart with new frequency
    }
  },
  
  runSimulationCycle: () => set((state) => {
    if (!state.engine) return state;
    try {
      // 1. Map virtual components (SW, KEY) to Engine Inputs
      const inputs: Record<string, number> = {};
      for (const mapping of state.pinMappings) {
        if (!mapping.virtualComponent) continue;
        
        const match = mapping.virtualComponent.match(/(SW|KEY|LEDR|LEDG|HEX|CLOCK_50)(\d+)?(?:\[(\d+)\])?/);
        if (match) {
          const type = match[1];
          const idx = parseInt(match[2] || match[3] || '0');
          
          if (type === 'SW') inputs[mapping.portName] = state.switches[idx] ?? 0;
          if (type === 'KEY') inputs[mapping.portName] = state.keys[idx] ?? 1;
          if (type === 'CLOCK_50') inputs[mapping.portName] = state.clockState;
        }
      }

      // Also map CLOCK_50 direct input if top module declares it
      inputs['CLOCK_50'] = state.clockState;
      inputs['clk'] = state.clockState;
      inputs['CLK'] = state.clockState;

      // Ensure all engine inputs are populated (fallback to existing simState value)
      if (state.engine?.inputs) {
        for (const inputName of state.engine.inputs) {
          if (inputs[inputName] === undefined) {
            inputs[inputName] = state.simState[inputName] ?? 0;
          }
        }
      }

      // 2. Evaluate Engine — both AST compiled evaluate and Graph-Based Topological Simulation
      let newState = state.engine.evaluate(inputs, { ...state.simState });

      try {
        if (state.engine?.topModule && state.engine?.modules) {
          const graph = buildModuleGraph(state.engine.topModule, state.engine.modules);
          if (graph.nodes.length > 0) {
            const graphSim = evaluateGraphTopological(graph.nodes, graph.edges, inputs, state.engine.modules);
            newState = { ...newState, ...graphSim.fullState };
          }
        }
      } catch (graphErr) {
        console.warn('[boardStore] evaluateGraphTopological warning:', graphErr);
      }

      // 3. Map Engine Outputs to virtual components (LEDR, LEDG, HEX)
      const newLedR = [...state.ledR];
      const newLedG = [...state.ledG];
      
      for (const mapping of state.pinMappings) {
        if (!mapping.virtualComponent) continue;
        
        const val = newState?.[mapping.portName] ?? 0;
        
        const match = mapping.virtualComponent.match(/(SW|KEY|LEDR|LEDG|HEX)(\d+)?(?:\[(\d+)\])?/);
        if (match) {
          const type = match[1];
          const idx = parseInt(match[2] || match[3] || '0');
          
          if (type === 'LEDR') newLedR[idx] = val;
          if (type === 'LEDG') newLedG[idx] = val;
        }
      }
      
      const newHistory = [...state.waveformHistory, { time: Date.now(), state: { ...newState, 'CLOCK_50': state.clockState } }];
      if (newHistory.length > 50) newHistory.shift();

      return { simState: newState, ledR: newLedR, ledG: newLedG, waveformHistory: newHistory };
    } catch (err) {
      console.warn('[boardStore] runSimulationCycle error (state preserved):', err);
      return state;
    }
  }),

  toggleSwitch: (index) => set((state) => {
    const newSwitches = [...state.switches];
    newSwitches[index] = newSwitches[index] === 0 ? 1 : 0;
    
    // Auto-run simulation tick
    setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
    return { switches: newSwitches };
  }),

  setKey: (index, pressed) => set((state) => {
    const newKeys = [...state.keys];
    newKeys[index] = pressed ? 0 : 1; // Active-low: 0 is pressed
    
    // Auto-run simulation tick
    setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
    return { keys: newKeys };
  }),

  tickClock: () => set((state) => {
    const newClock = state.clockState === 0 ? 1 : 0;
    const newSimState = { ...state.simState, 'CLOCK_50': newClock, 'clk': newClock, 'CLK': newClock };
    setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
    return { clockState: newClock, simState: newSimState };
  }),

  setLedR: (index, value) => set((state) => {
    const newLedR = [...state.ledR];
    newLedR[index] = value;
    return { ledR: newLedR };
  }),

  setLedG: (index, value) => set((state) => {
    const newLedG = [...state.ledG];
    newLedG[index] = value;
    return { ledG: newLedG };
  }),

  setHex: (index, segments) => set((state) => {
    const newHex = [...state.hex];
    newHex[index] = segments;
    return { hex: newHex };
  }),

  resetBoard: () => {
    if (simIntervalTimer) {
      clearInterval(simIntervalTimer);
      simIntervalTimer = null;
    }
    set({
      switches: [...INITIAL_SWITCHES],
      keys: [...INITIAL_KEYS],
      ledR: [...INITIAL_LEDR],
      ledG: [...INITIAL_LEDG],
      hex: [...INITIAL_HEX],
      clockState: 0,
      simState: {},
      isSimRunning: false,
      waveformHistory: [],
    });
    setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
  },

  toggleInputByName: (portName) => set((state) => {
    const bitWidth = state.engine?.portWidths?.[portName] || 1;
    const maxVal = Math.pow(2, bitWidth) - 1;

    const mapping = state.pinMappings.find(m => m.portName === portName);
    if (!mapping || !mapping.virtualComponent || mapping.virtualComponent === 'Unmapped') {
      // Toggle unmapped input directly in simState cycling through 0..maxVal
      const current = state.simState[portName] ?? 0;
      const newVal = current >= maxVal ? 0 : current + 1;
      const newSimState = { ...state.simState, [portName]: newVal, ['__prev_' + portName]: newVal };
      setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
      return { simState: newSimState };
    }

    const match = mapping.virtualComponent.match(/(SW|KEY|CLOCK_50)(\d+)?(?:\[(\d+)\])?/);
    if (!match) return state;

    const type = match[1];
    const idx = parseInt(match[2] || match[3] || '0');

    if (type === 'SW') {
      const current = state.simState[portName] ?? state.switches[idx] ?? 0;
      const newVal = current >= maxVal ? 0 : current + 1;
      const newSwitches = [...state.switches];
      newSwitches[idx] = newVal & 1;
      const newSimState = { ...state.simState, [portName]: newVal, ['__prev_' + portName]: newVal };
      setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
      return { switches: newSwitches, simState: newSimState };
    }
    if (type === 'KEY') {
      const newKeys = [...state.keys];
      newKeys[idx] = newKeys[idx] === 1 ? 0 : 1;
      const logicalVal = newKeys[idx] === 0 ? 1 : 0; // active-low → logical high when pressed
      const newSimState = { ...state.simState, [portName]: logicalVal, ['__prev_' + portName]: logicalVal };
      setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
      return { keys: newKeys, simState: newSimState };
    }
    if (type === 'CLOCK_50') {
      const newClock = state.clockState === 0 ? 1 : 0;
      const newSimState = { ...state.simState, [portName]: newClock, ['__prev_' + portName]: newClock };
      setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
      return { clockState: newClock, simState: newSimState };
    }
    return state;
  }),

  setInputVal: (portName, val) => set((state) => {
    const bitWidth = state.engine?.portWidths?.[portName] || 1;
    const maxVal = Math.pow(2, bitWidth) - 1;
    const clampedVal = Math.max(0, Math.min(val, maxVal));

    const mapping = state.pinMappings.find(m => m.portName === portName);
    if (!mapping || !mapping.virtualComponent || mapping.virtualComponent === 'Unmapped') {
      const newSimState = { ...state.simState, [portName]: clampedVal, ['__prev_' + portName]: clampedVal };
      setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
      return { simState: newSimState };
    }

    const match = mapping.virtualComponent.match(/(SW|KEY|CLOCK_50)(\d+)?(?:\[(\d+)\])?/);
    if (!match) {
      const newSimState = { ...state.simState, [portName]: clampedVal, ['__prev_' + portName]: clampedVal };
      setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
      return { simState: newSimState };
    }

    const type = match[1];
    const idx = parseInt(match[2] || match[3] || '0');

    const newSimState = { ...state.simState, [portName]: clampedVal, ['__prev_' + portName]: clampedVal };
    const newSwitches = [...state.switches];
    const newKeys = [...state.keys];

    if (type === 'SW') {
      newSwitches[idx] = clampedVal & 1;
    } else if (type === 'KEY') {
      newKeys[idx] = clampedVal === 0 ? 1 : 0;
    }

    setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
    return { switches: newSwitches, keys: newKeys, simState: newSimState };
  }),

  // Add a component to HDL code dynamically
  addComponentToHdl: (componentId: string) => {
    const comp = COMPONENT_REGISTRY[componentId];
    if (!comp) return undefined;

    const state = get();
    const currentCode = state.hdlCode || '';
    const instSuffix = Math.floor(Math.random() * 900 + 100);
    const instName = `${comp.id}_${instSuffix}`;
    const prefix = state.engine?.topModule || 'top';

    const { instanceCode, wiresToDeclare, submoduleCode } = comp.generateVerilog(instName, prefix);

    let updatedCode = currentCode;

    // Append submodule if provided and not present
    if (submoduleCode && !updatedCode.includes(`module ${comp.id}`)) {
      updatedCode = `${submoduleCode}\n\n${updatedCode}`;
    }

    // Insert instance code before last endmodule
    if (updatedCode.includes('endmodule')) {
      let wireDec = '';
      if (wiresToDeclare && wiresToDeclare.length > 0) {
        wireDec = `  logic ${wiresToDeclare.join(', ')};\n`;
      }
      updatedCode = updatedCode.replace(/endmodule\s*$/, `${wireDec}${instanceCode}\nendmodule\n`);
    } else {
      // Create minimal top module if code was empty
      updatedCode = `module circuit (\n    input logic CLOCK_50\n);\n${instanceCode}\nendmodule\n`;
    }

    set({ hdlCode: updatedCode });
    try {
      const newEngine = compileVerilog(updatedCode);
      set({ engine: newEngine });
      setTimeout(() => get().runSimulationCycle(), 0);
    } catch (err) {
      console.warn('[boardStore] addComponent compile error:', err);
    }
    return instName;
  },

  deleteNode: (nodeId: string) => set((state) => {
    if (!state.engine?.modules || !state.engine.topModule) return state;
    try {
      const engine = state.engine;
      const topModName = engine.topModule;
      if (!topModName || !engine.modules) return state;
      const mod = engine.modules[topModName];
      if (!mod) return state;

      const newMod = { ...mod, instances: [...(mod.instances || [])], wires: [...(mod.wires || [])] };
      const newModules = { ...engine.modules, [topModName]: newMod };

      // Determine what kind of node this is from ID prefix
      if (nodeId.startsWith('INST_')) {
        // Remove module instance
        const instName = nodeId.replace(/^INST_/, '').replace(/^[^_]+_/, '');
        const actualInstName = nodeId.replace(/^INST_/, '');
        newMod.instances = newMod.instances.filter(
          (inst: any) => inst.name !== instName && inst.name !== actualInstName
        );
      } else if (nodeId.startsWith('GATE_')) {
        // Remove the assign statement for this gate
        let outNet = nodeId.replace(/^GATE_/, '').replace(/_root(_\d+)*$/, '');
        if (newMod.rawAssignLogic) {
          const regex = new RegExp(`assign\\s+${outNet}\\s*=\\s*[^;]+;\\s*(?:\/\/[^\\n]*)?\\n?`, 'g');
          newMod.rawAssignLogic = newMod.rawAssignLogic.replace(regex, '');
        }
        if (newMod.assignLogic) {
          const regex2 = new RegExp(`^\\s*${outNet}\\s*=\\s*[^;]+;\\s*\\n?`, 'gm');
          newMod.assignLogic = newMod.assignLogic.replace(regex2, '');
        }
        // Remove from wires too
        newMod.wires = (newMod.wires || []).filter((w: string) => w !== outNet);
      }

      const newEngineData = { ...engine, modules: newModules };
      // Recompile to get fresh evaluate function
      try {
        const freshEngine = recompileEngine(newEngineData);
        setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
        return { engine: freshEngine };
      } catch {
        return { engine: newEngineData as any };
      }
    } catch (err) {
      console.warn('[boardStore] deleteNode error:', err);
      return state;
    }
  }),

  disconnectEdge: (targetType, targetName, targetPort) => set((state) => {
    if (!state.engine) return state;
    try {
      const newEngine = disconnectNet(state.engine, targetType, targetName, targetPort);
      setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
      return { engine: newEngine };
    } catch (err) {
      console.warn('[boardStore] disconnectEdge error (engine unchanged):', err);
      return state;
    }
  }),

  connectEdge: (targetType, targetName, targetPort, sourceNet) => set((state) => {
    if (!state.engine) return state;
    try {
      const newEngine = connectNet(state.engine, targetType, targetName, targetPort, sourceNet);
      setTimeout(() => useBoardStore.getState().runSimulationCycle(), 0);
      return { engine: newEngine };
    } catch (err) {
      console.warn('[boardStore] connectEdge error (engine unchanged):', err);
      return state;
    }
  }),
}));
