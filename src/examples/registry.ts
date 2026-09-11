import type { LearningExample } from './types';

// Raw SystemVerilog Source Imports
import basicGatesSrc from './source/basic_gates.sv?raw';
import basicGatesTb from './source/basic_gates_tb.sv?raw';
import basicGatesDe2 from './source/basic_gates_de2.sv?raw';

import halfAdderSrc from './source/half_adder.sv?raw';
import halfAdderTb from './source/half_adder_tb.sv?raw';
import halfAdderDe2 from './source/half_adder_de2.sv?raw';

import fullAdderSrc from './source/full_adder.sv?raw';
import fullAdderTb from './source/full_adder_tb.sv?raw';
import fullAdderDe2 from './source/full_adder_de2.sv?raw';

import mux2to1Src from './source/mux_2to1.sv?raw';
import mux2to1Tb from './source/mux_2to1_tb.sv?raw';
import mux2to1De2 from './source/mux_2to1_de2.sv?raw';

import mux4to1Src from './source/mux_4to1.sv?raw';
import mux4to1Tb from './source/mux_4to1_tb.sv?raw';

import decoder2to4Src from './source/decoder_2to4.sv?raw';
import decoder2to4Tb from './source/decoder_2to4_tb.sv?raw';
import decoder2to4De2 from './source/decoder_2to4_de2.sv?raw';

import decoder3to8Src from './source/decoder_3to8.sv?raw';
import decoder3to8Tb from './source/decoder_3to8_tb.sv?raw';
import decoder3to8De2 from './source/decoder_3to8_de2.sv?raw';

import comparator2bitSrc from './source/comparator_2bit.sv?raw';
import comparator2bitTb from './source/comparator_2bit_tb.sv?raw';

import rippleCarryAdder4bitSrc from './source/ripple_carry_adder_4bit.sv?raw';
import rippleCarryAdder4bitTb from './source/ripple_carry_adder_4bit_tb.sv?raw';

import dFlipFlopSrc from './source/d_flip_flop.sv?raw';
import dFlipFlopTb from './source/d_flip_flop_tb.sv?raw';

import counter4bitSrc from './source/counter_4bit.sv?raw';
import counter4bitTb from './source/counter_4bit_tb.sv?raw';
import counter4bitDe2 from './source/counter_4bit_de2.sv?raw';

import register4bitSrc from './source/register_4bit.sv?raw';
import register4bitTb from './source/register_4bit_tb.sv?raw';

import priorityEncoder4to2Src from './source/priority_encoder_4to2.sv?raw';
import priorityEncoder4to2Tb from './source/priority_encoder_4to2_tb.sv?raw';

import alu2bitSrc from './source/alu_2bit.sv?raw';
import alu2bitTb from './source/alu_2bit_tb.sv?raw';

export const EXAMPLES_LIST: LearningExample[] = [
  {
    id: 'basic_gates',
    title: 'Basic Logic Gates',
    description: 'Explore the fundamental Boolean logic gates in parallel: AND, OR, XOR, NOT, NAND, and NOR.',
    difficulty: 'beginner',
    category: 'combinational',
    topics: ['Gates', 'Boolean Logic', 'Bitwise Operators'],
    learningObjectives: [
      'Understand core bitwise logic operations in SystemVerilog',
      'Compare gate truth tables side-by-side',
      'Observe concurrent continuous assignments',
    ],
    topModule: 'basic_gates',
    source: {
      filename: 'basic_gates.sv',
      language: 'systemverilog',
      code: basicGatesSrc,
    },
    testbench: {
      filename: 'basic_gates_tb.sv',
      language: 'systemverilog',
      code: basicGatesTb,
    },
    de2: {
      supported: true,
      filename: 'basic_gates_de2.sv',
      source: basicGatesDe2,
      topModule: 'basic_gates_de2',
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: true,
    },
  },
  {
    id: 'half_adder',
    title: 'Half Adder',
    description: 'Add two single-bit binary numbers producing Sum and Carry outputs using XOR and AND logic.',
    difficulty: 'beginner',
    category: 'arithmetic',
    topics: ['Arithmetic', 'Addition', 'XOR', 'AND'],
    learningObjectives: [
      'Calculate binary sum using XOR logic',
      'Generate carry-out using AND logic',
      'Lay the foundation for multi-bit addition',
    ],
    topModule: 'half_adder',
    source: {
      filename: 'half_adder.sv',
      language: 'systemverilog',
      code: halfAdderSrc,
    },
    testbench: {
      filename: 'half_adder_tb.sv',
      language: 'systemverilog',
      code: halfAdderTb,
    },
    de2: {
      supported: true,
      filename: 'half_adder_de2.sv',
      source: halfAdderDe2,
      topModule: 'half_adder_de2',
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: true,
    },
  },
  {
    id: 'full_adder',
    title: 'Full Adder',
    description: 'Add three single-bit binary inputs (A, B, and Carry-In) with full carry generation.',
    difficulty: 'beginner',
    category: 'arithmetic',
    topics: ['Arithmetic', 'Full Adder', 'Carry Propagation'],
    learningObjectives: [
      'Account for incoming carry from previous stages',
      'Compute sum as a 3-way XOR expression',
      'Derive the standard carry-out equation',
    ],
    topModule: 'full_adder',
    source: {
      filename: 'full_adder.sv',
      language: 'systemverilog',
      code: fullAdderSrc,
    },
    testbench: {
      filename: 'full_adder_tb.sv',
      language: 'systemverilog',
      code: fullAdderTb,
    },
    de2: {
      supported: true,
      filename: 'full_adder_de2.sv',
      source: fullAdderDe2,
      topModule: 'full_adder_de2',
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: true,
    },
  },
  {
    id: 'mux_2to1',
    title: '2:1 Multiplexer',
    description: 'Route one of two data inputs to the output based on a single select control line.',
    difficulty: 'beginner',
    category: 'routing',
    topics: ['MUX', 'Select', 'Conditional Routing'],
    learningObjectives: [
      'Use select signal to choose an active data path',
      'Master the SystemVerilog conditional ternary operator',
      'Understand how multiplexers form hardware decision logic',
    ],
    topModule: 'mux_2to1',
    source: {
      filename: 'mux_2to1.sv',
      language: 'systemverilog',
      code: mux2to1Src,
    },
    testbench: {
      filename: 'mux_2to1_tb.sv',
      language: 'systemverilog',
      code: mux2to1Tb,
    },
    de2: {
      supported: true,
      filename: 'mux_2to1_de2.sv',
      source: mux2to1De2,
      topModule: 'mux_2to1_de2',
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: true,
    },
  },
  {
    id: 'mux_4to1',
    title: '4:1 Multiplexer',
    description: 'Select between four binary data inputs using a 2-bit address selection bus.',
    difficulty: 'beginner',
    category: 'routing',
    topics: ['MUX', 'Bus Selection', 'Data Steering'],
    learningObjectives: [
      'Decode 2-bit binary select addresses',
      'Construct multi-way conditional data steering',
      'Evaluate multiplexer data propagation waveforms',
    ],
    topModule: 'mux_4to1',
    source: {
      filename: 'mux_4to1.sv',
      language: 'systemverilog',
      code: mux4to1Src,
    },
    testbench: {
      filename: 'mux_4to1_tb.sv',
      language: 'systemverilog',
      code: mux4to1Tb,
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: false,
    },
  },
  {
    id: 'decoder_2to4',
    title: '2-to-4 Decoder',
    description: 'Convert a 2-bit binary code into four active-high one-hot outputs with enable control.',
    difficulty: 'beginner',
    category: 'routing',
    topics: ['Decoder', 'One-Hot', 'Enable Control'],
    learningObjectives: [
      'Translate binary input codes to one-hot output lines',
      'Use master enable gating to control circuit activation',
      'Observe minterm generation in digital design',
    ],
    topModule: 'decoder_2to4',
    source: {
      filename: 'decoder_2to4.sv',
      language: 'systemverilog',
      code: decoder2to4Src,
    },
    testbench: {
      filename: 'decoder_2to4_tb.sv',
      language: 'systemverilog',
      code: decoder2to4Tb,
    },
    de2: {
      supported: true,
      filename: 'decoder_2to4_de2.sv',
      source: decoder2to4De2,
      topModule: 'decoder_2to4_de2',
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: true,
    },
  },
  {
    id: 'decoder_3to8',
    title: '3-to-8 Decoder',
    description: 'Construct an 8-output decoder hierarchically by composing two 2-to-4 decoder modules.',
    difficulty: 'intermediate',
    category: 'routing',
    topics: ['Decoder', 'Hierarchical Design', 'Enable Gating'],
    learningObjectives: [
      'Build wider decoders hierarchically from smaller building blocks',
      'Use the most significant bit (A[2]) for upper/lower bank enable',
      'Practice explicit named port instantiation in SystemVerilog',
    ],
    topModule: 'decoder_3to8',
    source: {
      filename: 'decoder_3to8.sv',
      language: 'systemverilog',
      code: decoder3to8Src,
    },
    testbench: {
      filename: 'decoder_3to8_tb.sv',
      language: 'systemverilog',
      code: decoder3to8Tb,
    },
    de2: {
      supported: true,
      filename: 'decoder_3to8_de2.sv',
      source: decoder3to8De2,
      topModule: 'decoder_3to8_de2',
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: true,
    },
  },
  {
    id: 'comparator_2bit',
    title: '2-bit Magnitude Comparator',
    description: 'Compare two 2-bit unsigned integers to determine greater than, equal to, or less than relations.',
    difficulty: 'beginner',
    category: 'combinational',
    topics: ['Comparator', 'Relational Operators', 'Magnitude'],
    learningObjectives: [
      'Compare binary vector magnitudes concurrently',
      'Generate mutually exclusive relational status flags',
      'Inspect comparator logic gate synthesis',
    ],
    topModule: 'comparator_2bit',
    source: {
      filename: 'comparator_2bit.sv',
      language: 'systemverilog',
      code: comparator2bitSrc,
    },
    testbench: {
      filename: 'comparator_2bit_tb.sv',
      language: 'systemverilog',
      code: comparator2bitTb,
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: false,
    },
  },
  {
    id: 'ripple_carry_adder_4bit',
    title: '4-bit Ripple Carry Adder',
    description: 'Chain four Full Adders together with explicit named ports to perform 4-bit addition.',
    difficulty: 'intermediate',
    category: 'arithmetic',
    topics: ['Hierarchical Addition', 'Ripple Carry', 'Named Ports'],
    learningObjectives: [
      'Instantiate submodules hierarchically using explicit port syntax',
      'Trace carry bit propagation across multiple adder stages',
      'Understand latency tradeoffs in ripple-carry architectures',
    ],
    topModule: 'ripple_carry_adder_4bit',
    source: {
      filename: 'ripple_carry_adder_4bit.sv',
      language: 'systemverilog',
      code: rippleCarryAdder4bitSrc,
    },
    testbench: {
      filename: 'ripple_carry_adder_4bit_tb.sv',
      language: 'systemverilog',
      code: rippleCarryAdder4bitTb,
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: false,
    },
  },
  {
    id: 'd_flip_flop',
    title: 'D Flip-Flop',
    description: 'The fundamental sequential storage element with synchronous active-high reset.',
    difficulty: 'beginner',
    category: 'sequential',
    topics: ['Flip-Flop', 'always_ff', 'Clock Edge', 'Reset'],
    learningObjectives: [
      'Model edge-triggered sequential logic with always_ff',
      'Implement predictable synchronous active-high reset',
      'Observe setup, hold, and clock synchronization in waveforms',
    ],
    topModule: 'd_flip_flop',
    source: {
      filename: 'd_flip_flop.sv',
      language: 'systemverilog',
      code: dFlipFlopSrc,
    },
    testbench: {
      filename: 'd_flip_flop_tb.sv',
      language: 'systemverilog',
      code: dFlipFlopTb,
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: false,
    },
  },
  {
    id: 'counter_4bit',
    title: '4-bit Synchronous Counter',
    description: 'A 4-bit up-counter with synchronous reset that increments on each rising clock edge.',
    difficulty: 'intermediate',
    category: 'sequential',
    topics: ['Counter', 'Sequential', 'Clock Divider', 'State'],
    learningObjectives: [
      'Implement synchronous arithmetic state transitions',
      'Observe binary rollover and periodic waveform frequency division',
      'Map clock and reset to physical board keys and LEDs',
    ],
    topModule: 'counter_4bit',
    source: {
      filename: 'counter_4bit.sv',
      language: 'systemverilog',
      code: counter4bitSrc,
    },
    testbench: {
      filename: 'counter_4bit_tb.sv',
      language: 'systemverilog',
      code: counter4bitTb,
    },
    de2: {
      supported: true,
      filename: 'counter_4bit_de2.sv',
      source: counter4bitDe2,
      topModule: 'counter_4bit_de2',
    },
    tools: {
      schematic: false, // DigitalJS 2D multi-bit sequential feedback is complex; kept cleanly unsupported
      waveform: true,
      de2: true,
    },
  },
  {
    id: 'register_4bit',
    title: '4-bit Parallel Register',
    description: 'Store 4 bits of parallel data with clock gating via a dedicated load enable signal.',
    difficulty: 'intermediate',
    category: 'sequential',
    topics: ['Register', 'Parallel Load', 'Clock Gating'],
    learningObjectives: [
      'Control data retention and updating using a load enable signal',
      'Coordinate synchronous reset with conditional data capture',
      'Understand register-transfer level (RTL) building blocks',
    ],
    topModule: 'register_4bit',
    source: {
      filename: 'register_4bit.sv',
      language: 'systemverilog',
      code: register4bitSrc,
    },
    testbench: {
      filename: 'register_4bit_tb.sv',
      language: 'systemverilog',
      code: register4bitTb,
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: false,
    },
  },
  {
    id: 'priority_encoder_4to2',
    title: '4-to-2 Priority Encoder',
    description: 'Encode the highest-priority active input into a 2-bit binary index with a valid flag.',
    difficulty: 'intermediate',
    category: 'combinational',
    topics: ['Encoder', 'Priority Logic', 'Arbitration'],
    learningObjectives: [
      'Resolve conflicting concurrent inputs by strict priority order',
      'Generate an auxiliary valid signal for zero-input detection',
      'Use nested conditional expressions in synthesizable RTL',
    ],
    topModule: 'priority_encoder_4to2',
    source: {
      filename: 'priority_encoder_4to2.sv',
      language: 'systemverilog',
      code: priorityEncoder4to2Src,
    },
    testbench: {
      filename: 'priority_encoder_4to2_tb.sv',
      language: 'systemverilog',
      code: priorityEncoder4to2Tb,
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: false,
    },
  },
  {
    id: 'alu_2bit',
    title: 'Simple 2-bit ALU',
    description: 'Execute arithmetic addition, bitwise AND, bitwise OR, and XOR selected by a 2-bit opcode.',
    difficulty: 'intermediate',
    category: 'arithmetic',
    topics: ['ALU', 'Arithmetic Logic Unit', 'Opcode Decoding'],
    learningObjectives: [
      'Combine multiple functional execution units into a single datapath',
      'Control arithmetic versus logic execution with an opcode bus',
      'Handle multi-bit carry output alongside calculation result',
    ],
    topModule: 'alu_2bit',
    source: {
      filename: 'alu_2bit.sv',
      language: 'systemverilog',
      code: alu2bitSrc,
    },
    testbench: {
      filename: 'alu_2bit_tb.sv',
      language: 'systemverilog',
      code: alu2bitTb,
    },
    tools: {
      schematic: true,
      waveform: true,
      de2: false,
    },
  },
];

export function getExampleById(id: string): LearningExample | undefined {
  return EXAMPLES_LIST.find((ex) => ex.id === id);
}
