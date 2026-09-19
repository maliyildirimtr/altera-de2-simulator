import { create } from 'zustand';
import type { ParsedPort } from '../utils/parser/pinParser';
import { disconnectNet, connectNet, compileVerilog, recompileEngine, type VerilogModule } from '../core/simulator/verilogEngine';
import { buildModuleGraph } from '../utils/parser/graphBuilder';
import { evaluateGraphTopological } from '../core/simulator/graphEvaluator';
import { COMPONENT_REGISTRY } from '../utils/components/componentRegistry';
import {
  createLcdState,
  lcdStep,
  resetLcdState,
  type LcdState,
} from '../core/peripherals/lcdController';
import { collectLcdBus } from '../core/peripherals/lcdSignals';
import { parseBitRef, readSignal, writeSignal } from '../core/simulator/vectorSignals';
import { expandTarget, parseVirtualComponent } from '../board/virtualComponents';
import { autoMapPort } from '../utils/parser/pinParser';

/**
 * What the LCD signal chain has actually done, as a value the panel can
 * publish and a test can assert.
 *
 * These are not tracing hooks left in by accident. Each one answers a question
 * that could otherwise only be answered by guessing at a runtime from outside
 * it, and answering them wrongly is what made a blank display take three
 * rounds of debugging: whether the design drives an LCD at all, whether its
 * enable line is pulsing, what it last wrote, and whether its own sequencer is
 * advancing. Cheap to keep, and the difference between a diagnosis and a
 * hypothesis.
 */
export interface LcdDebug {
  /** Evaluations since the last reset. One per clock transition, exactly. */
  cycle: number;
  /** Falling LCD_EN edges the peripheral actually latched on. */
  fallingEdges: number;
  /** The last byte latched, and whether it was a command or a character. */
  lastByte: number;
  lastWasCommand: boolean;
  /**
   * True once `collectLcdBus` has returned a bus for this design. Separates
   * "this design has a blank display" from "this design has no display".
   */
  busSeen: boolean;
  /**
   * The design's own `step` register, when it has one. A driver that is stuck
   * shows it here, which is the difference between a peripheral fault and a
   * design that never got going.
   */
  step: number | null;
}

const INITIAL_LCD_DEBUG: LcdDebug = {
  cycle: 0,
  fallingEdges: 0,
  lastByte: -1,
  lastWasCommand: false,
  busSeen: false,
  step: null,
};

interface BoardState {
  // Inputs
  switches: number[]; // 18 switches: 0 or 1
  keys: number[];     // 4 keys (active-low): 1 (unpressed) or 0 (pressed)
  
  // Outputs
  ledR: number[];     // 18 red LEDs: 0 or 1
  ledG: number[];     // 9 green LEDs: 0 or 1
  hex: number[][];    // 8 7-segment displays, each with 7 segments (active-low)

  /**
   * Diagnostics for the LCD signal chain, so the whole path can be read off
   * one DOM element in a real browser instead of guessed at from a Node test.
   *
   * Kept in the store rather than inside `lcdController`: the controller is a
   * pure decoder and must stay free of counters. Nothing here feeds back into
   * simulation — it is recorded alongside, never read by, the peripheral.
   */
  lcdDebug: LcdDebug;

  /**
   * 16x2 character LCD. Decoded by the pure HD44780 emulator in
   * `src/core/peripherals/lcdController.ts` — the store owns the state, the
   * controller owns the command semantics, and React only renders the result.
   * Advanced from the compiled design's LCD_* outputs on every simulation
   * cycle; left untouched when the design drives no LCD signals at all.
   */
  lcd: LcdState;

  
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
  lcd: createLcdState(),
  lcdDebug: { ...INITIAL_LCD_DEBUG },
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
      // 1. Map virtual components (SW, KEY, CLOCK_50) to engine inputs.
      //
      //    Routed through `writeSignal` because a port's name in the pin
      //    mapping is not necessarily a name the engine accepts: a design
      //    declaring `input [17:0] SW` has ONE engine input called `SW`, so
      //    writing `inputs['SW[0]']` would drive nothing and every switch
      //    would read 0. `writeSignal` packs the bit into the vector instead,
      //    seeding from the previous state so bits no pin covers keep their
      //    value — without that, mapping only KEY0 would drive KEY1..KEY3 to
      //    0, which for an active-low input means "held down".
      const inputs: Record<string, number> = {};
      const declaredInputs = new Set(state.engine?.inputs ?? []);
      const portWidth = (portName: string): number =>
        state.engine?.portWidths?.[portName] ?? 1;

      /*
       * When a bit is packed into a declared vector, the OTHER bits of that
       * vector must start from the board rather than from zero. A .qsf that
       * names only KEY[0] still leaves KEY[3:1] physically connected to three
       * buttons, and KEY is ACTIVE-LOW — so zeroing them would report three
       * buttons held down. Seeding from the bank makes the whole declared port
       * read the board, which is both correct and what a student expects.
       */
      const packBank = (values: number[], idle: number, width: number): number => {
        let packed = 0;
        for (let bit = 0; bit < Math.min(Math.max(width, 1), 32); bit += 1) {
          if (values[bit] ?? idle) packed |= 1 << bit;
        }
        return packed;
      };
      const seedBank = (base: string, values: number[], idle: number): void => {
        if (inputs[base] === undefined && declaredInputs.has(base)) {
          inputs[base] = packBank(values, idle, portWidth(base));
        }
      };

      for (const mapping of state.pinMappings) {
        const target = parseVirtualComponent(mapping.virtualComponent);
        if (!target) continue;

        if (target.family === 'CLOCK_50') {
          writeSignal(inputs, declaredInputs, mapping.portName, state.clockState, state.simState);
          continue;
        }
        if (target.family !== 'SW' && target.family !== 'KEY') continue;

        // KEY's idle value is 1 (released); an unset switch is 0.
        const values = target.family === 'SW' ? state.switches : state.keys;
        const idle = target.family === 'SW' ? 0 : 1;

        for (const { signal, index } of expandTarget(target, mapping.portName, portWidth(mapping.portName))) {
          const ref = parseBitRef(signal);
          if (ref) seedBank(ref.base, values, idle);
          writeSignal(inputs, declaredInputs, signal, values[index] ?? idle, state.simState);
        }
      }

      // Also map CLOCK_50 direct input if top module declares it
      inputs['CLOCK_50'] = state.clockState;
      inputs['clk'] = state.clockState;
      inputs['CLK'] = state.clockState;

      /*
       * Any engine input still undriven gets one more chance to be recognised
       * as DE2 hardware BEFORE falling back to a raw default.
       *
       * This matters far more than it looks. An undriven input used to default
       * to 0, and KEY is ACTIVE-LOW — so a design whose reset is `~KEY0` was
       * held permanently in reset the moment its pin mapping was missing or
       * blank, with no diagnostic anywhere. That is what kept the LCD example's
       * sequencer pinned at step 0: LCD_EN stayed high, no enable edge ever
       * fell, and because LCD_ON/LCD_BLON are level-sensitive the panel lit up
       * with nothing on it.
       *
       * Mappings go missing easily: the workspace only auto-assigns ports when
       * `pinMappings.length === 0`, so a table left over from a previous design
       * suppresses auto-mapping entirely, and `autoMapPort` returning null
       * stores an empty virtualComponent.
       *
       * So a port literally NAMED after a DE2 input is now driven by that
       * input's board state whether or not the mapping table says so — which is
       * what a student naming a port `KEY0` expects, and it makes the board the
       * single source for every recognised input. Only genuinely unrecognised
       * names fall back to the previous value.
       */
      if (state.engine?.inputs) {
        for (const inputName of state.engine.inputs) {
          if (inputs[inputName] !== undefined) continue;

          const implied = parseVirtualComponent(autoMapPort(inputName));
          if (implied && (implied.family === 'SW' || implied.family === 'KEY')) {
            const values = implied.family === 'SW' ? state.switches : state.keys;
            const idle = implied.family === 'SW' ? 0 : 1;
            for (const { signal, index } of expandTarget(implied, inputName, portWidth(inputName))) {
              const ref = parseBitRef(signal);
              if (ref) seedBank(ref.base, values, idle);
              writeSignal(inputs, declaredInputs, signal, values[index] ?? idle, state.simState);
            }
            if (inputs[inputName] !== undefined) continue;
          }
          if (implied && implied.family === 'CLOCK_50') {
            inputs[inputName] = state.clockState;
            continue;
          }

          inputs[inputName] = state.simState[inputName] ?? 0;
        }
      }

      // 2. Evaluate Engine — both AST compiled evaluate and Graph-Based Topological Simulation
      let newState = state.engine.evaluate(inputs, { ...state.simState });

      try {
        if (state.engine?.topModule && state.engine?.modules) {
          const graph = buildModuleGraph(state.engine.topModule, state.engine.modules);
          if (graph.nodes.length > 0) {
            const graphSim = evaluateGraphTopological(graph.nodes, graph.edges, inputs, state.engine.modules);
            newState = { ...graphSim.fullState, ...newState };
          }
        }
      } catch (graphErr) {
        console.warn('[boardStore] evaluateGraphTopological warning:', graphErr);
      }

      // 3. Map Engine Outputs to virtual components (LEDR, LEDG, HEX)
      const newLedR = [...state.ledR];
      const newLedG = [...state.ledG];
      const newHex = state.hex.map(h => [...h]);
      
      //    Read through `readSignal`, which resolves a per-pin name against
      //    EITHER representation the engine may have produced: the flattened
      //    key `HEX0[0]`, the underscore spelling `HEX0_0`, or bit 0 of the
      //    packed vector `HEX0`. The engine stores `output [6:0] HEX0` as a
      //    single packed integer, so without this a .qsf mapping seven pins
      //    to HEX0[0..6] resolves nothing.
      //
      //    An unresolved signal is LEFT ALONE rather than defaulted to 0.
      //    That distinction is the whole bug: HEX segments are active-low, so
      //    coercing a missing value to 0 lights the segment, and a display
      //    driven by a vector read "8" no matter what the design computed.
      for (const mapping of state.pinMappings) {
        const target = parseVirtualComponent(mapping.virtualComponent);
        if (!target) continue;
        if (target.family !== 'LEDR' && target.family !== 'LEDG' && target.family !== 'HEX') {
          continue;
        }

        for (const { signal, index } of expandTarget(target, mapping.portName, portWidth(mapping.portName))) {
          const val = readSignal(newState, signal);
          if (val === undefined || !Number.isFinite(val)) continue;
          const bit = val ? 1 : 0;

          if (target.family === 'LEDR') {
            if (index < newLedR.length) newLedR[index] = bit;
          } else if (target.family === 'LEDG') {
            if (index < newLedG.length) newLedG[index] = bit;
          } else if (target.family === 'HEX') {
            const display = newHex[target.display];
            if (display && index < display.length) display[index] = bit;
          }
        }
      }
      
      // 4. Advance the LCD peripheral from the design's LCD_* outputs.
      //    `collectLcdBus` returns null when the design drives no LCD signals,
      //    and `lcdStep` returns the same object when LCD_EN has not moved —
      //    so on the overwhelming majority of ticks this is a no-op and the
      //    reference stays stable for React.
      let newLcd = state.lcd;
      const lcdBus = collectLcdBus(newState ?? {}, state.pinMappings);
      if (lcdBus) newLcd = lcdStep(state.lcd, lcdBus);

      /*
       * Diagnostics, recorded ALONGSIDE the peripheral and never read by it.
       * The edge is recomputed here from the same pre-step level the controller
       * saw, rather than inferred from the controller afterwards, so a change
       * to either one can never quietly make the other lie.
       */
      const fell = lcdBus !== null && state.lcd.prevEn === 1 && (lcdBus.en ? 1 : 0) === 0;
      const newLcdDebug: LcdDebug = {
        cycle: state.lcdDebug.cycle + 1,
        fallingEdges: state.lcdDebug.fallingEdges + (fell ? 1 : 0),
        lastByte: fell && lcdBus ? lcdBus.data : state.lcdDebug.lastByte,
        lastWasCommand: fell && lcdBus ? lcdBus.rs === 0 : state.lcdDebug.lastWasCommand,
        busSeen: state.lcdDebug.busSeen || lcdBus !== null,
        step: typeof newState?.step === 'number' ? newState.step : null,
      };

      const newHistory = [...state.waveformHistory, { time: Date.now(), state: { ...newState, 'CLOCK_50': state.clockState } }];
      if (newHistory.length > 50) newHistory.shift();

      return { simState: newState, ledR: newLedR, ledG: newLedG, hex: newHex, lcd: newLcd, lcdDebug: newLcdDebug, waveformHistory: newHistory };
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

  /*
   * Advances the clock and evaluates the design IN THE SAME TASK.
   *
   * This used to defer the evaluation with `setTimeout(..., 0)`. That is a
   * silent edge-eater: if two `tickClock` calls land before the timer queue
   * drains — which happens whenever a board re-render takes longer than the
   * auto-simulation interval — the second toggle overwrites `clockState` and
   * both queued evaluations then run against the same final level. One clock
   * transition is simply never evaluated.
   *
   * For a counter that shows up as a skipped increment. For a peripheral that
   * latches on an edge it is fatal: an LCD_EN pulse that lived entirely inside
   * the skipped transition is never seen, so the LCD stays blank while its
   * level-sensitive signals (LCD_ON / LCD_BLON) still get through — the glass
   * lights up and no character ever appears.
   *
   * Evaluating synchronously makes "one evaluation per clock transition" an
   * invariant of the store rather than something that depends on how busy the
   * UI thread happens to be.
   */
  tickClock: () => {
    const state = get();
    const newClock = state.clockState === 0 ? 1 : 0;
    set({
      clockState: newClock,
      simState: { ...state.simState, 'CLOCK_50': newClock, 'clk': newClock, 'CLK': newClock },
    });
    get().runSimulationCycle();
  },

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
      // Blank panel, cursor home, display state back to power-on defaults.
      lcd: resetLcdState(),
      lcdDebug: { ...INITIAL_LCD_DEBUG },
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

// Expose to window for automated testing
if (typeof window !== 'undefined') {
  (window as any).useBoardStore = useBoardStore;
}
