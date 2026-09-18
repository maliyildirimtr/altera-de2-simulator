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
    '--remote-debugging-port=9247',
    `--user-data-dir=/tmp/de2-chrome-${process.pid}`,
    '--no-first-run',
    '--no-proxy-server',
    '--window-size=1200,800',
    `${baseUrl}/#/de2-simulator`
  ]);

  for (let i = 0; i < 20; i++) {
    await wait(300);
    try {
      const r = await fetch('http://127.0.0.1:9247/json/list');
      const list = await r.json();
      if (list.length > 0) break;
    } catch (_) {}
  }
  const r = await fetch('http://127.0.0.1:9247/json/list');
  const list = await r.json();
  const page = list.find(t => t.type === 'page' && t.url.includes('#/de2-simulator'));
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
      console.log(`[Browser] ${m.params.type}:`, args);
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
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (res.exceptionDetails) {
      throw new Error(`Eval failed: ${res.exceptionDetails.exception.description}\\nExpr: ${expr}`);
    }
    return res.result.value;
  };

  const waitFor = async (selector) => {
    for (let i = 0; i < 50; i++) {
      const ok = await evaluate(`!!document.querySelector('${selector}')`);
      if (ok) return;
      await wait(100);
    }
    await send('Page.enable');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(process.env.REGRESSION_ARTIFACT_DIR || os.tmpdir(), 'timeout_debug_de2.png'), Buffer.from(screenshot.data, 'base64'));
    throw new Error(`Timeout waiting for ${selector}`);
  };

  console.log('--- 1. Set HDL Code for HEX Test ---');
  // Switch to split view or code view so Monaco mounts
  await waitFor('[data-testid="view-code"]');
  await evaluate(`
    (() => {
      const btn = document.querySelector('[data-testid="view-code"]');
      if (btn) btn.click();
    })();
  `);
  await wait(500);

  const hdlCode = `module sevenseg_test (
    output logic HEX0_A,
    output logic HEX0_B,
    output logic HEX0_C,
    output logic HEX0_D,
    output logic HEX0_E,
    output logic HEX0_F,
    output logic HEX0_G
);
    // 1 turns the segment OFF because the board is active-low.
    // 0 turns the segment ON.
    // We will assign 1'b0 to see if it turns ON correctly, and 1'b1 to see if it turns OFF.
    assign HEX0_A = 1'b0; // ON
    assign HEX0_B = 1'b1; // OFF
    assign HEX0_C = 1'b0; // ON
    assign HEX0_D = 1'b1; // OFF
    assign HEX0_E = 1'b0; // ON
    assign HEX0_F = 1'b1; // OFF
    assign HEX0_G = 1'b0; // ON
endmodule`;

  let editorFound = false;
  for (let i = 0; i < 100; i++) {
    const ok = await evaluate(`!!window.monaco?.editor?.getEditors()?.[0]`);
    if (ok) {
      editorFound = true;
      break;
    }
    await wait(100);
  }
  
  if (!editorFound) {
    throw new Error('Timeout waiting for Monaco editor to load after clicking view-code');
  }
  
  await evaluate(`
    (() => {
      const editor = window.monaco.editor.getEditors()[0];
      if(!editor) throw new Error('Editor not found');
      const model = editor.getModel();
      if(!model) throw new Error('Model not found');
      model.setValue(\`module sevenseg_test (
    output logic HEX0_A,
    output logic HEX0_B,
    output logic HEX0_C,
    output logic HEX0_D,
    output logic HEX0_E,
    output logic HEX0_F,
    output logic HEX0_G
);
    assign HEX0_A = 1'b0; // ON
    assign HEX0_B = 1'b1; // OFF
    assign HEX0_C = 1'b0; // ON
    assign HEX0_D = 1'b1; // OFF
    assign HEX0_E = 1'b0; // ON
    assign HEX0_F = 1'b1; // OFF
    assign HEX0_G = 1'b0; // ON
endmodule\`);
    })()
  `);
  
  await evaluate(`
    window.useBoardStore.getState().setPinMappings([
      { portName: 'HEX0_A', physicalPin: 'PIN_AF10', virtualComponent: 'HEX0[0]' },
      { portName: 'HEX0_B', physicalPin: 'PIN_AB12', virtualComponent: 'HEX0[1]' },
      { portName: 'HEX0_C', physicalPin: 'PIN_AC12', virtualComponent: 'HEX0[2]' },
      { portName: 'HEX0_D', physicalPin: 'PIN_AD11', virtualComponent: 'HEX0[3]' },
      { portName: 'HEX0_E', physicalPin: 'PIN_AE11', virtualComponent: 'HEX0[4]' },
      { portName: 'HEX0_F', physicalPin: 'PIN_V14', virtualComponent: 'HEX0[5]' },
      { portName: 'HEX0_G', physicalPin: 'PIN_V13', virtualComponent: 'HEX0[6]' }
    ])
  `);
  
  await wait(500);

  console.log('--- 2. Compile HDL ---');
  await evaluate(`document.querySelector('[data-testid="de2-compile"]').click()`);
  await wait(2000); // wait for compile
  
  const status = await evaluate(`document.querySelector('[data-testid="engine-status"]').getAttribute('data-status')`);
  if (status !== 'ready') {
    throw new Error('Compilation failed or did not finish');
  }

  console.log('--- 3. Check HEX Output ---');
  // Switch back to split view so the board is rendered
  await evaluate(`document.querySelector('[data-testid="view-split"]').click()`);
  await wait(500);

  // HEX is continuously simulated when idle or clocked, because it's a combinational module.
  // We can just read the data-segments from the DOM.
  
  const hexSegments = await evaluate(`
    document.querySelector('[data-testid="de2-hex-0"]').getAttribute('data-segments')
  `);

  const hexData = await evaluate(`
    (() => {
      const el = document.querySelector('[data-testid="de2-hex-0"]');
      if (!el) return null;
      return JSON.parse(el.getAttribute('data-segments'));
    })()
  `);
  
  const debugMappings = await evaluate(`
    window.useBoardStore.getState().pinMappings
  `);
  console.log('pinMappings:', debugMappings);

  console.log('Got segments:', hexSegments);
  
  const parsed = JSON.parse(hexSegments);
  
  // Active low logic means 0 is ON, 1 is OFF.
  // Our code: A=0, B=1, C=0, D=1, E=0, F=1, G=0
  assert.strictEqual(parsed[0], 0, 'HEX0_A should be 0');
  assert.strictEqual(parsed[1], 1, 'HEX0_B should be 1');
  assert.strictEqual(parsed[2], 0, 'HEX0_C should be 0');
  assert.strictEqual(parsed[3], 1, 'HEX0_D should be 1');
  assert.strictEqual(parsed[4], 0, 'HEX0_E should be 0');
  assert.strictEqual(parsed[5], 1, 'HEX0_F should be 1');
  assert.strictEqual(parsed[6], 0, 'HEX0_G should be 0');
  
  console.log('All DE2 HEX assertions passed! Propagation is fixed.');
  
  ws.close();
  chrome.kill();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
