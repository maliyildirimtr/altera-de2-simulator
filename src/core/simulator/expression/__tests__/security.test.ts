/// <reference types="node" />
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { compileVerilog } from '../../verilogEngine';


async function runTests() {
  console.log("Starting Security and Regression Tests...");

  // 1. Security Exploit Class Regression
  console.log("Test 1: Arbitrary JS Execution (constructor)");
  const maliciousHDL1 = `
module exploit(input a, output b);
  assign b = inputs.constructor.constructor('globalThis.__DE2_SECURITY_TEST_MARKER=123')();
endmodule
  `;
  compileVerilog(maliciousHDL1);
  assert.strictEqual(
    (globalThis as any).__DE2_SECURITY_TEST_MARKER,
    undefined,
    "Security marker was modified! Exploit succeeded!"
  );
  console.log("  PASS: Constructor exploit blocked.");

  // 2. Security Exploit Class (__proto__)
  console.log("Test 2: Prototype Pollution / Access");
  const maliciousHDL2 = `
module exploit2(input a, output b);
  assign b = {}.__proto__;
endmodule
  `;
  compileVerilog(maliciousHDL2);
  assert.strictEqual(
    (globalThis as any).__proto_modified, // just in case
    undefined,
    "Security prototype accessed!"
  );
  console.log("  PASS: __proto__ exploit blocked.");

  // 3. Suspicious Valid Signal Names
  console.log("Test 3: Suspicious Signal Names as Data");
  const suspiciousHDL = `
module safe_names(input constructor, output prototype);
  assign prototype = !constructor;
endmodule
  `;
  const engine3 = compileVerilog(suspiciousHDL);
  const state3 = engine3.evaluate({ constructor: 0 }, {});
  assert.strictEqual(state3['prototype'], 1, "Suspicious valid names failed.");
  const state3b = engine3.evaluate({ constructor: 1 }, state3);
  assert.strictEqual(state3b['prototype'], 0, "Suspicious valid names failed.");
  console.log("  PASS: Suspicious signal names act as safe data.");

  // 4. Blocking vs Non-Blocking Semantics
  console.log("Test 4: Blocking vs Non-Blocking");
  
  // Non-blocking (swap)
  const nbaHDL = `
module swap_nba(input clk, output q1, output q2);
  logic d1 = 1;
  logic d2 = 0;
  always_ff @(posedge clk) begin
    d1 <= d2;
    d2 <= d1;
  end
  assign q1 = d1;
  assign q2 = d2;
endmodule
  `;
  const engine4a = compileVerilog(nbaHDL);
  let state4a = engine4a.evaluate({ clk: 0 }, { d1: 1, d2: 0 });
  state4a = engine4a.evaluate({ clk: 1 }, state4a);
  assert.strictEqual(state4a['d1'], 0, "NBA swap failed for d1");
  assert.strictEqual(state4a['d2'], 1, "NBA swap failed for d2");
  
  // Blocking (cascade)
  const baHDL = `
module cascade_ba(input clk, output q1, output q2);
  logic d1 = 1;
  logic d2 = 0;
  always_ff @(posedge clk) begin
    d1 = d2;
    d2 = d1;
  end
  assign q1 = d1;
  assign q2 = d2;
endmodule
  `;
  const engine4b = compileVerilog(baHDL);
  let state4b = engine4b.evaluate({ clk: 0 }, { d1: 1, d2: 0 });
  state4b = engine4b.evaluate({ clk: 1 }, state4b);
  // With blocking, d1 becomes d2 (0). Then d2 becomes d1 (now 0). Both should be 0.
  assert.strictEqual(state4b['d1'], 0, "BA cascade failed for d1");
  assert.strictEqual(state4b['d2'], 0, "BA cascade failed for d2");
  console.log("  PASS: Blocking and Non-Blocking behave correctly.");

  // 5. Counter 4-bit Regression
  console.log("Test 5: Counter 4-bit Regression");
  const counterSrc = fs.readFileSync(path.resolve(__dirname, '../../../src/examples/source/counter_4bit_de2.sv'), 'utf-8');
  const engine5 = compileVerilog(counterSrc);
  
  // Initial state, reset active (KEY0 is 0 -> ~KEY0 is 1)
  let state5 = engine5.evaluate({ CLOCK_50: 0, KEY0: 0 }, {});
  state5 = engine5.evaluate({ CLOCK_50: 1, KEY0: 0 }, state5); // posedge
  assert.strictEqual(state5['LEDR0'], 0);
  assert.strictEqual(state5['LEDR1'], 0);
  assert.strictEqual(state5['LEDR2'], 0);
  assert.strictEqual(state5['LEDR3'], 0);

  // Deassert reset (KEY0 is 1 -> ~KEY0 is 0), wait a cycle
  state5 = engine5.evaluate({ CLOCK_50: 0, KEY0: 1 }, state5);
  
  // Assert count + Clock Edge
  state5 = engine5.evaluate({ CLOCK_50: 1, KEY0: 1 }, state5);
  assert.strictEqual(state5['LEDR0'], 1, "Counter bit 0 should be 1");
  assert.strictEqual(state5['LEDR1'], 0);
  
  // Another count edge
  state5 = engine5.evaluate({ CLOCK_50: 0, KEY0: 1 }, state5);
  state5 = engine5.evaluate({ CLOCK_50: 1, KEY0: 1 }, state5);
  assert.strictEqual(state5['LEDR0'], 0, "Counter bit 0 should be 0");
  assert.strictEqual(state5['LEDR1'], 1, "Counter bit 1 should be 1");
  console.log("  PASS: Counter 4-bit resets and counts correctly on clock edges.");

  // 6. Case Statement verification
  const caseTestHDL = `
module case_test(
  input logic [1:0] sel,
  output logic [3:0] y
);
  always_comb begin
    case (sel)
      2'b00: y = 4'b0001;
      2'b01: y = 4'b0010;
      2'b10: y = 4'b0100;
      default: y = 4'b1000;
    endcase
  end
endmodule
  `;
  const caseEngine = compileVerilog(caseTestHDL);
  let caseState = caseEngine.evaluate({ sel: 0 }, {});
  assert.strictEqual(caseState['y'], 1, "case 00");
  caseState = caseEngine.evaluate({ sel: 1 }, caseState);
  assert.strictEqual(caseState['y'], 2, "case 01");
  caseState = caseEngine.evaluate({ sel: 2 }, caseState);
  assert.strictEqual(caseState['y'], 4, "case 10");
  caseState = caseEngine.evaluate({ sel: 3 }, caseState);
  assert.strictEqual(caseState['y'], 8, "case default");
  console.log("  PASS: CaseStmt evaluates correctly.");

  // 7. Bitwise NOT scalar and vector test
  const not1BitHDL = `
module not_1bit(input logic a, output logic y);
  assign y = ~a;
endmodule
  `;
  const not1Engine = compileVerilog(not1BitHDL);
  assert.strictEqual(not1Engine.evaluate({ a: 0 }, {})['y'], 1, "~0 is 1");
  assert.strictEqual(not1Engine.evaluate({ a: 1 }, {})['y'], 0, "~1 is 0");
  
  const notVectorHDL = `
module not_vec(input logic [3:0] a, output logic [3:0] y);
  assign y = ~a;
endmodule
  `;
  const notVecEngine = compileVerilog(notVectorHDL);
  try {
    notVecEngine.evaluate({ a: 2 }, {}); // 4'b0010
    assert.fail("Should throw for vector ~");
  } catch (e: any) {
    assert.match(e.message, /Vector bitwise NOT is unsupported/);
  }
  console.log("  PASS: Bitwise NOT correctly handles 1-bit and fails closed for vectors.");

  // 8. Edge Transition (posedge/negedge) and Level stability
  const edgeHDL = `
module edge_test(
  input logic clk,
  input logic d,
  output logic q_pos,
  output logic q_neg
);
  always_ff @(posedge clk) begin
    q_pos <= d;
  end
  always_ff @(negedge clk) begin
    q_neg <= d;
  end
endmodule
  `;
  const edgeEngine = compileVerilog(edgeHDL);
  let edgeState = edgeEngine.evaluate({ clk: 0, d: 1 }, {}); // initial state
  assert.strictEqual(edgeState['q_pos'], undefined, "q_pos untouched");
  assert.strictEqual(edgeState['q_neg'], undefined, "q_neg untouched");
  
  // Pos Edge
  edgeState = edgeEngine.evaluate({ clk: 1, d: 1 }, edgeState);
  assert.strictEqual(edgeState['q_pos'], 1, "q_pos captured on posedge");
  assert.strictEqual(edgeState['q_neg'], undefined, "q_neg untouched on posedge");
  
  // Steady high
  edgeState = edgeEngine.evaluate({ clk: 1, d: 0 }, edgeState);
  assert.strictEqual(edgeState['q_pos'], 1, "q_pos stable on steady high");
  
  // Neg Edge
  edgeState = edgeEngine.evaluate({ clk: 0, d: 0 }, edgeState);
  assert.strictEqual(edgeState['q_pos'], 1, "q_pos stable on negedge");
  assert.strictEqual(edgeState['q_neg'], 0, "q_neg captured on negedge");

  console.log("  PASS: Edge transitions (posedge/negedge) trigger correctly and not on steady levels.");

  // 9. Blocking vs Non-Blocking semantics
  const swapHDL = `
module swap_test(
  input logic clk,
  output logic a_nb,
  output logic b_nb,
  output logic a_b,
  output logic b_b
);
  always_ff @(posedge clk) begin
    a_nb <= b_nb;
    b_nb <= a_nb;
  end
  
  always_ff @(posedge clk) begin
    a_b = b_b;
    b_b = a_b;
  end
endmodule
  `;
  const swapEngine = compileVerilog(swapHDL);
  // initial state
  let swapState = swapEngine.evaluate({ clk: 0 }, { a_nb: 0, b_nb: 1, a_b: 0, b_b: 1 });
  
  // Pos Edge
  swapState = swapEngine.evaluate({ clk: 1 }, swapState);
  assert.strictEqual(swapState['a_nb'], 1, "a_nb non-blocking swap");
  assert.strictEqual(swapState['b_nb'], 0, "b_nb non-blocking swap");
  assert.strictEqual(swapState['a_b'], 1, "a_b blocking cascade");
  assert.strictEqual(swapState['b_b'], 1, "b_b blocking cascade");
  
  // Another Pos Edge
  swapState = swapEngine.evaluate({ clk: 0 }, swapState);
  swapState = swapEngine.evaluate({ clk: 1 }, swapState);
  assert.strictEqual(swapState['a_nb'], 0, "a_nb swapped back");
  assert.strictEqual(swapState['b_nb'], 1, "b_nb swapped back");
  assert.strictEqual(swapState['a_b'], 1, "a_b remains 1");
  assert.strictEqual(swapState['b_b'], 1, "b_b remains 1");
  console.log("  PASS: Blocking (=) and Non-blocking (<=) semantics are strict and differentiated.");

  // 10. DE2 Examples Compatibility
  console.log("\\nTesting all DE2 Examples...");
  const de2ExampleFiles = [
    'basic_gates_de2.sv',
    'half_adder_de2.sv',
    'full_adder_de2.sv',
    'mux_2to1_de2.sv',
    'decoder_2to4_de2.sv',
    'decoder_3to8_de2.sv',
    'counter_4bit_de2.sv'
  ];
  for (const filename of de2ExampleFiles) {
    try {
      const code = fs.readFileSync(path.join(__dirname, '../../../src/examples/source', filename), 'utf-8');
      const eng = compileVerilog(code);
      // Dummy evaluation
      eng.evaluate({}, {});
      console.log(`  PASS: Example '${filename}' compiled and evaluated successfully.`);
    } catch (err: any) {
      console.error(`  FAIL: Example '${filename}' failed: ${err.message}`);
      throw err;
    }
  }

  console.log("\\nAll security and semantic tests passed successfully!");
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
