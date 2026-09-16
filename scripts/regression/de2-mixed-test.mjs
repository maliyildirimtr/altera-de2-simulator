import { spawn } from 'node:child_process';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    for (const port of [5173, 5174, 5175]) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}`);
        const text = await res.text();
        if (text.includes('Engineering Lab')) {
          baseUrl = `http://127.0.0.1:${port}`;
          break;
        }
      } catch (_) {}
    }
  }
  baseUrl = (baseUrl || 'http://127.0.0.1:5173').replace(/\/$/, '');
  console.log('Using baseUrl:', baseUrl);
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9248',
    `--user-data-dir=/tmp/de2-chrome-${process.pid}`,
    '--no-first-run',
    '--no-proxy-server',
    '--window-size=1200,800',
    `${baseUrl}/#/de2-simulator`
  ]);

  for (let i = 0; i < 20; i++) {
    await wait(300);
    try {
      const r = await fetch('http://127.0.0.1:9248/json/list');
      const list = await r.json();
      if (list.length > 0) break;
    } catch (_) {}
  }
  const r = await fetch('http://127.0.0.1:9248/json/list');
  const list = await r.json();
  const page = list.find(t => t.type === 'page');

  if (!page) {
    chrome.kill();
    throw new Error('Could not find chrome page');
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const callbacks = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled') {
      const args = m.params.args.map(a => {
        if (a.value !== undefined) {
          return typeof a.value === 'object' ? JSON.stringify(a.value) : a.value;
        }
        return a.description;
      }).join(' ');
      if (!args.includes('React DevTools')) {
        console.log(`[Browser] ${m.params.type}:`, args);
      }
    }
    if (m.id && callbacks.has(m.id)) callbacks.get(m.id)(m.result);
  };
  const send = (method, params = {}) => new Promise(res => {
    const curId = id++;
    callbacks.set(curId, res);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await send('Runtime.enable');
  await wait(2000); // Wait for app to load

  const evaluate = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(`Eval failed: ${res.exceptionDetails.exception.description}\nExpr: ${expr}`);
    }
    return res.result.value;
  };

  const waitFor = async (selector) => {
    for (let i = 0; i < 50; i++) {
      const ok = await evaluate(`!!document.querySelector('${selector}')`);
      if (ok) return;
      await wait(100);
    }
    throw new Error(`Timeout waiting for ${selector}`);
  };

  await waitFor('[data-testid="view-code"]');
  await evaluate(`document.querySelector('[data-testid="view-code"]').click()`);
  await wait(500);

  console.log('--- 1. Testing LEDR0 Constant ---');
  await evaluate(`
    (() => {
      const editor = window.monaco.editor.getEditors()[0];
      const model = editor.getModel();
      model.setValue(\`module led_test (
    output logic LEDR0,
    output logic LEDG0
);
assign LEDR0 = 1'b1;
assign LEDG0 = 1'b0;
endmodule\`);
    })()
  `);
  
  await evaluate(`
    window.useBoardStore.getState().setPinMappings([
      { portName: 'LEDR0', physicalPin: 'PIN_AE23', virtualComponent: 'LEDR[0]' },
      { portName: 'LEDG0', physicalPin: 'PIN_AE22', virtualComponent: 'LEDG[0]' }
    ])
  `);

  await evaluate(`document.querySelector('[data-testid="de2-compile"]').click()`);
  await wait(1500);

  const ledR = await evaluate(`window.useBoardStore.getState().ledR`);
  const ledG = await evaluate(`window.useBoardStore.getState().ledG`);

  assert.strictEqual(ledR[0], 1, 'LEDR0 should be ON (1)');
  assert.strictEqual(ledG[0], 0, 'LEDG0 should be OFF (0)');
  console.log('LEDR0 constant PASS');

  console.log('--- 2. Testing LEDR0 and LEDG0 SW-driven ---');
  await evaluate(`
    (() => {
      const editor = window.monaco.editor.getEditors()[0];
      const model = editor.getModel();
      model.setValue(\`module led_test (
    input  logic SW0,
    output logic LEDR0,
    output logic LEDG0
);
assign LEDR0 = SW0;
assign LEDG0 = ~SW0;
endmodule\`);
    })()
  `);

  await evaluate(`
    window.useBoardStore.getState().setPinMappings([
      { portName: 'SW0', physicalPin: 'PIN_N25', virtualComponent: 'SW[0]' },
      { portName: 'LEDR0', physicalPin: 'PIN_AE23', virtualComponent: 'LEDR[0]' },
      { portName: 'LEDG0', physicalPin: 'PIN_AE22', virtualComponent: 'LEDG[0]' }
    ])
  `);

  await evaluate(`document.querySelector('[data-testid="de2-compile"]').click()`);
  await wait(1500);

  await evaluate(`
    window.testStore = window.useBoardStore.getState();
    if(window.testStore.switches[0]) window.testStore.toggleSwitch(0);
  `);
  await wait(500);

  // Default SW0 is 0
  let ledR2 = await evaluate(`window.useBoardStore.getState().ledR`);
  let ledG2 = await evaluate(`window.useBoardStore.getState().ledG`);
  assert.strictEqual(ledR2[0], 0, 'LEDR0 should be OFF when SW0=0');
  assert.strictEqual(ledG2[0], 1, 'LEDG0 should be ON when SW0=0');
  
  // Toggle SW0
  await evaluate(`window.useBoardStore.getState().toggleSwitch(0)`);
  await wait(500);

  let ledR3 = await evaluate(`window.useBoardStore.getState().ledR`);
  let ledG3 = await evaluate(`window.useBoardStore.getState().ledG`);
  assert.strictEqual(ledR3[0], 1, 'LEDR0 should be ON when SW0=1');
  assert.strictEqual(ledG3[0], 0, 'LEDG0 should be OFF when SW0=1');
  
  console.log('SW-driven LEDs PASS');

  console.log('--- 3. Testing XOR Combinational Truth Table ---');
  await evaluate(`
    (() => {
      const editor = window.monaco.editor.getEditors()[0];
      const model = editor.getModel();
      model.setValue(\`module output_test (
    input  logic SW0,
    input  logic SW1,
    output logic LEDR0
);
assign LEDR0 = SW0 ^ SW1;
endmodule\`);
    })()
  `);

  await evaluate(`
    window.useBoardStore.getState().setPinMappings([
      { portName: 'SW0', physicalPin: 'PIN_N25', virtualComponent: 'SW[0]' },
      { portName: 'SW1', physicalPin: 'PIN_N26', virtualComponent: 'SW[1]' },
      { portName: 'LEDR0', physicalPin: 'PIN_AE23', virtualComponent: 'LEDR[0]' }
    ])
  `);

  await evaluate(`document.querySelector('[data-testid="de2-compile"]').click()`);
  await wait(1500);

  await evaluate(`
    window.testStore = window.useBoardStore.getState();
    if(window.testStore.switches[0]) window.testStore.toggleSwitch(0);
    if(window.testStore.switches[1]) window.testStore.toggleSwitch(1);
  `);
  await wait(500);
  let tr_00 = await evaluate(`window.useBoardStore.getState().ledR`);
  assert.strictEqual(tr_00[0], 0, '00 -> 0');

  await evaluate(`window.useBoardStore.getState().toggleSwitch(0)`);
  await wait(500);
  let tr_10 = await evaluate(`window.useBoardStore.getState().ledR`);
  assert.strictEqual(tr_10[0], 1, '10 -> 1');

  await evaluate(`
    window.useBoardStore.getState().toggleSwitch(0); // back to 0
    window.useBoardStore.getState().toggleSwitch(1); // set to 1
  `);
  await wait(500);
  let tr_01 = await evaluate(`window.useBoardStore.getState().ledR`);
  assert.strictEqual(tr_01[0], 1, '01 -> 1');

  await evaluate(`window.useBoardStore.getState().toggleSwitch(0)`);
  await wait(500);
  let tr_11 = await evaluate(`window.useBoardStore.getState().ledR`);
  assert.strictEqual(tr_11[0], 0, '11 -> 0');

  console.log('XOR Combinational truth-table PASS');


  console.log('--- 4. Testing Mixed LED + HEX ---');
  await evaluate(`
    (() => {
      const editor = window.monaco.editor.getEditors()[0];
      const model = editor.getModel();
      model.setValue(\`module mixed_test (
    input logic SW0,
    output logic LEDR0,
    output logic LEDG0,
    output logic HEX0_A,
    output logic HEX0_B
);
assign LEDR0 = SW0;
assign LEDG0 = ~SW0;
assign HEX0_A = SW0;
assign HEX0_B = ~SW0;
endmodule\`);
    })()
  `);

  await evaluate(`
    window.useBoardStore.getState().setPinMappings([
      { portName: 'SW0', physicalPin: 'PIN_N25', virtualComponent: 'SW[0]' },
      { portName: 'LEDR0', physicalPin: 'PIN_AE23', virtualComponent: 'LEDR[0]' },
      { portName: 'LEDG0', physicalPin: 'PIN_AE22', virtualComponent: 'LEDG[0]' },
      { portName: 'HEX0_A', physicalPin: 'PIN_AF10', virtualComponent: 'HEX0[0]' },
      { portName: 'HEX0_B', physicalPin: 'PIN_AB12', virtualComponent: 'HEX0[1]' }
    ])
  `);

  await evaluate(`document.querySelector('[data-testid="de2-compile"]').click()`);
  await wait(1500);

  // Switch to split view so HEX elements are rendered
  await evaluate(`document.querySelector('[data-testid="view-split"]').click()`);
  await wait(500);

  // SW0 = 0
  await evaluate(`
    window.testStore = window.useBoardStore.getState();
    if(window.testStore.switches[0]) window.testStore.toggleSwitch(0);
    if(window.testStore.switches[1]) window.testStore.toggleSwitch(1);
  `);
  await wait(500);
  let mx_lr0 = await evaluate(`window.useBoardStore.getState().ledR[0]`);
  let mx_lg0 = await evaluate(`window.useBoardStore.getState().ledG[0]`);
  let mx_hx0 = await evaluate(`
    (() => {
      const el = document.querySelector('[data-testid="de2-hex-0"]');
      if (!el) return null;
      return JSON.parse(el.getAttribute('data-segments'));
    })()
  `);
  
  assert.strictEqual(mx_lr0, 0, 'Mixed SW0=0 LEDR0=0');
  assert.strictEqual(mx_lg0, 1, 'Mixed SW0=0 LEDG0=1');
  assert.strictEqual(mx_hx0[0], 0, 'Mixed SW0=0 HEX0_A=0');
  assert.strictEqual(mx_hx0[1], 1, 'Mixed SW0=0 HEX0_B=1');

  // SW0 = 1
  await evaluate(`window.useBoardStore.getState().toggleSwitch(0)`);
  await wait(500);
  mx_lr0 = await evaluate(`window.useBoardStore.getState().ledR[0]`);
  mx_lg0 = await evaluate(`window.useBoardStore.getState().ledG[0]`);
  mx_hx0 = await evaluate(`
    (() => {
      const el = document.querySelector('[data-testid="de2-hex-0"]');
      if (!el) return null;
      return JSON.parse(el.getAttribute('data-segments'));
    })()
  `);
  
  assert.strictEqual(mx_lr0, 1, 'Mixed SW0=1 LEDR0=1');
  assert.strictEqual(mx_lg0, 0, 'Mixed SW0=1 LEDG0=0');
  assert.strictEqual(mx_hx0[0], 1, 'Mixed SW0=1 HEX0_A=1');
  assert.strictEqual(mx_hx0[1], 0, 'Mixed SW0=1 HEX0_B=0');

  console.log('Mixed LED + HEX PASS');

  console.log('--- 5. Verify graphSim/newState key overlap ---');
  // Temporary inspection (will be removed as requested)
  
  ws.close();
  chrome.kill();
  try { fs.rmSync(`/tmp/de2-chrome-${process.pid}`, { recursive: true, force: true }); } catch (e) {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
