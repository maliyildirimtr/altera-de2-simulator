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
        if (text.includes('Logic Lab')) {
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

  async function loadExample(id) {
    await evaluate(`{
      sessionStorage.setItem('eda_pending_example_handoff', JSON.stringify({ exampleId: '${id}', targetTool: 'de2' }));
      window.location.reload();
    }`);
    await wait(2000); // Wait for reload and initial load
    await waitFor('[data-testid="de2-compile"]');
    
    // Switch to code view to wait for compilation? Actually, let's just compile.
    await evaluate(`document.querySelector('[data-testid="de2-compile"]').click()`);
    await wait(2000); // compilation might take longer for examples
    
    // Switch to split to render board
    await evaluate(`
      const btn = document.querySelector('[data-testid="view-split"]');
      if(btn) btn.click();
    `);
    await wait(500);
  }

  // 1. Half Adder
  console.log('--- Testing Half Adder ---');
  await loadExample('half_adder');
  await evaluate(`
    window.testStore = window.useBoardStore.getState();
    if (window.testStore.switches[0]) window.testStore.toggleSwitch(0);
    if (window.testStore.switches[1]) window.testStore.toggleSwitch(1);
  `);
  await wait(500);
  let ledR = await evaluate(`window.useBoardStore.getState().ledR`);
  assert.strictEqual(ledR[0], 0, 'HA: Sum=0');
  assert.strictEqual(ledR[1], 0, 'HA: Carry=0');
  
  await evaluate(`window.useBoardStore.getState().toggleSwitch(0)`);
  await wait(500);
  ledR = await evaluate(`window.useBoardStore.getState().ledR`);
  assert.strictEqual(ledR[0], 1, 'HA: Sum=1');
  assert.strictEqual(ledR[1], 0, 'HA: Carry=0');
  console.log('Half Adder PASS');

  // 2. Full Adder
  console.log('--- Testing Full Adder ---');
  await loadExample('full_adder');
  await evaluate(`
    window.testStore = window.useBoardStore.getState();
    if (window.testStore.switches[0]) window.testStore.toggleSwitch(0);
    if (window.testStore.switches[1]) window.testStore.toggleSwitch(1);
    if (window.testStore.switches[2]) window.testStore.toggleSwitch(2);
  `);
  await wait(500);
  
  await evaluate(`
    window.useBoardStore.getState().toggleSwitch(0);
    window.useBoardStore.getState().toggleSwitch(1);
    window.useBoardStore.getState().toggleSwitch(2);
  `);
  await wait(500);
  ledR = await evaluate(`window.useBoardStore.getState().ledR`);
  assert.strictEqual(ledR[0], 1, 'FA: Sum=1');
  assert.strictEqual(ledR[1], 1, 'FA: Carry=1');
  console.log('Full Adder PASS');

  // 3. 4-bit Counter (Clocked)
  console.log('--- Testing 4-bit Counter ---');
  await loadExample('counter_4bit');
  
  // Reset counter (KEY0 is active-low reset)
  await evaluate(`
    window.useBoardStore.getState().setKey(0, true);
  `);
  await wait(200);
  
  // Tick clock once while reset is active to clear
  await evaluate(`window.useBoardStore.getState().tickClock()`);
  await wait(200);

  // Release reset
  await evaluate(`
    window.useBoardStore.getState().setKey(0, false);
  `);
  await wait(200);
  
  // Click step clock 6 times to count up to 3 (2 toggles per cycle)
  for(let i=0; i<6; i++) {
    await evaluate(`window.useBoardStore.getState().tickClock()`);
    await wait(200);
  }
  
  ledR = await evaluate(`window.useBoardStore.getState().ledR`);
  assert.strictEqual(ledR[0], 1, 'Counter Bit 0');
  assert.strictEqual(ledR[1], 1, 'Counter Bit 1');
  assert.strictEqual(ledR[2], 0, 'Counter Bit 2');
  assert.strictEqual(ledR[3], 0, 'Counter Bit 3');
  console.log('4-bit Counter PASS');

  console.log('All Examples PASS');
  
  ws.close();
  chrome.kill();
  try { fs.rmSync(`/tmp/de2-chrome-${process.pid}`, { recursive: true, force: true }); } catch (e) {}
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
