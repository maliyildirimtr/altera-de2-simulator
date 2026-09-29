import type { LearningExample } from './types';
import { applyMetadata, normalizeMetadata, type ExampleMetadata } from './metadata';
import metadataText from './metadata.json?raw';

// DE2 board demos. These have no separate testbench: what they exercise is
// the interactive board, not a waveform.
import de2InteractiveIoSrc from './source/de2_interactive_io.sv?raw';
import de2LcdHelloSrc from './source/de2_lcd_hello.sv?raw';
import de2LcdCustomSrc from './source/de2_lcd_custom.sv?raw';
import de2VgaPatternSrc from './source/de2_vga_pattern.sv?raw';
import de2Ps2KeyboardSrc from './source/de2_ps2_keyboard.sv?raw';

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

/** The examples as written in this file, before metadata.json is applied. */
export const BASE_EXAMPLES: LearningExample[] = [
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
  {
    id: 'de2_interactive_io',
    title: 'DE2 Interactive I/O Demo',
    description:
      'A tour of the DE2 board: switches drive the red LEDs, the push buttons drive green LEDs, four more switches show a hexadecimal digit on HEX0, and CLOCK_50 blinks LEDR17.',
    difficulty: 'beginner',
    category: 'fpga',
    topics: ['DE2 Board', 'Active-Low', 'Seven-Segment', 'Clock Divider'],
    learningObjectives: [
      'Drive every family of DE2 I/O from one small design',
      'See why KEY inputs must be inverted to read as "pressed"',
      'Encode a hexadecimal digit with ACTIVE-LOW seven-segment patterns',
    ],
    topModule: 'de2_interactive_io',
    source: {
      filename: 'de2_interactive_io.sv',
      language: 'systemverilog',
      code: de2InteractiveIoSrc,
    },
    de2: {
      supported: true,
      filename: 'de2_interactive_io.sv',
      source: de2InteractiveIoSrc,
      topModule: 'de2_interactive_io',
    },
    tools: {
      // Its whole point is the board; a schematic and a waveform of 18 wires
      // would say less than clicking a switch does.
      schematic: false,
      waveform: false,
      de2: true,
    },
  },
  {
    id: 'de2_lcd_hello',
    title: 'DE2 LCD Hello',
    description:
      "Writes two lines of text to the DE2's 16x2 character LCD over its HD44780 interface. KEY0 restarts the sequence.",
    difficulty: 'intermediate',
    category: 'fpga',
    topics: ['DE2 Board', 'LCD', 'HD44780', 'Sequencer'],
    learningObjectives: [
      'Drive an HD44780 character LCD: function set, display on, clear, address, write',
      'Latch a byte on the falling edge of an enable strobe',
      'Understand the 16x2 DDRAM map, where line 2 starts at 0x40 rather than 0x10',
    ],
    topModule: 'de2_lcd_hello',
    source: {
      filename: 'de2_lcd_hello.sv',
      language: 'systemverilog',
      code: de2LcdHelloSrc,
    },
    de2: {
      supported: true,
      filename: 'de2_lcd_hello.sv',
      source: de2LcdHelloSrc,
      topModule: 'de2_lcd_hello',
    },
    tools: {
      schematic: false,
      waveform: false,
      de2: true,
    },
  },
  {
    id: 'de2_lcd_custom',
    title: 'DE2 LCD Custom Characters',
    description:
      'Defines two custom glyphs in CGRAM, shows SW17..SW0 live in hexadecimal on the LCD and scrolls the display with KEY1/KEY2 (KEY3 returns home). Raise the clock frequency in the Inspector for a quicker start.',
    difficulty: 'intermediate',
    category: 'fpga',
    topics: ['DE2 Board', 'LCD', 'HD44780', 'CGRAM', 'Sequencer'],
    learningObjectives: [
      'Define custom 5x8 characters by writing CGRAM rows after command 0x40',
      'Refresh part of the display continuously from live inputs',
      'Scroll both lines with the cursor/display shift command (0x18 / 0x1C)',
    ],
    topModule: 'de2_lcd_custom',
    source: {
      filename: 'de2_lcd_custom.sv',
      language: 'systemverilog',
      code: de2LcdCustomSrc,
    },
    de2: {
      supported: true,
      filename: 'de2_lcd_custom.sv',
      source: de2LcdCustomSrc,
      topModule: 'de2_lcd_custom',
    },
    tools: {
      schematic: false,
      waveform: false,
      de2: true,
    },
  },
  {
    id: 'de2_vga_pattern',
    title: 'DE2 VGA Test Pattern',
    description:
      'A real 640x480 @ 60 Hz VGA signal: 25 MHz pixel clock, sync counters and 10-bit colour. SW1..SW0 pick colour bars, a checkerboard, a gradient or a frame with a cross; SW2 inverts. Open the VGA / PS/2 tab and press Draw frame.',
    difficulty: 'intermediate',
    category: 'fpga',
    topics: ['DE2 Board', 'VGA', 'Video timing', 'Counters'],
    learningObjectives: [
      'Generate horizontal and vertical sync from pixel and line counters',
      'Use a clock enable for a 25 MHz pixel clock from CLOCK_50',
      'Blank the colour outside the visible 640x480 area',
    ],
    topModule: 'de2_vga_pattern',
    source: {
      filename: 'de2_vga_pattern.sv',
      language: 'systemverilog',
      code: de2VgaPatternSrc,
    },
    de2: {
      supported: true,
      filename: 'de2_vga_pattern.sv',
      source: de2VgaPatternSrc,
      topModule: 'de2_vga_pattern',
    },
    tools: {
      schematic: false,
      waveform: false,
      de2: true,
    },
  },
  {
    id: 'de2_ps2_keyboard',
    title: 'DE2 PS/2 Keyboard',
    description:
      'Receives keyboard scan codes on PS2_CLK/PS2_DAT and shows the last two bytes on HEX3..HEX0 (F0 = key released) and whether a key is held on LEDG0. Open the VGA / PS/2 tab, click the keyboard area and type.',
    difficulty: 'intermediate',
    category: 'fpga',
    topics: ['DE2 Board', 'PS/2', 'Serial protocol', 'Synchroniser'],
    learningObjectives: [
      'Synchronise a slow external clock with two flip-flops and detect its falling edge',
      'Shift in an 11-bit PS/2 frame (start, data LSB first, parity, stop)',
      'Read make and break (F0) scan codes',
    ],
    topModule: 'de2_ps2_keyboard',
    source: {
      filename: 'de2_ps2_keyboard.sv',
      language: 'systemverilog',
      code: de2Ps2KeyboardSrc,
    },
    de2: {
      supported: true,
      filename: 'de2_ps2_keyboard.sv',
      source: de2Ps2KeyboardSrc,
      topModule: 'de2_ps2_keyboard',
    },
    tools: {
      schematic: false,
      waveform: false,
      de2: true,
    },
  },
];

function parseMetadata(text: string): ExampleMetadata {
  try {
    return normalizeMetadata(JSON.parse(text));
  } catch {
    return normalizeMetadata(null);
  }
}

/** Edited from the local dev editor (#/dev/examples); see metadata.ts. */
export const EXAMPLE_METADATA = parseMetadata(metadataText);

// Every file in ./source, so examples added through metadata.json need no
// import line here.
const SOURCE_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('./source/*.{sv,v}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>).map(
    ([p, text]) => [p.slice(p.lastIndexOf('/') + 1), text],
  ),
);

export const EXAMPLES_LIST: LearningExample[] = applyMetadata(BASE_EXAMPLES, EXAMPLE_METADATA, SOURCE_FILES);

export function getExampleById(id: string): LearningExample | undefined {
  return EXAMPLES_LIST.find((ex) => ex.id === id);
}
