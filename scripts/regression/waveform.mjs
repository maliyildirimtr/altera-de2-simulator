import { spawn } from 'node:child_process';
import assert from 'node:assert';
import fs from 'node:fs';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9246',
    `--user-data-dir=/tmp/phase8-chrome-${process.pid}`,
    '--no-first-run',
    'http://127.0.0.1:5173/altera-de2-simulator/#/waveform'
  ]);

  for (let i = 0; i < 20; i++) {
    await wait(300);
    try {
      const r = await fetch('http://127.0.0.1:9246/json/list');
      const list = await r.json();
      if (list.length > 0) break;
    } catch (_) {}
  }
  const r = await fetch('http://127.0.0.1:9246/json/list');
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
    fs.writeFileSync(path.join(process.env.REGRESSION_ARTIFACT_DIR || os.tmpdir(), 'timeout_debug.png'), Buffer.from(screenshot.data, 'base64'));
    const html = await evaluate(`document.body.innerHTML`);
    console.log("DOM AT TIMEOUT:");
    console.log(html);
    throw new Error(`Timeout waiting for ${selector}`);
  };

  const getCompileStatus = async () => {
    await waitFor('[data-testid="waveform-workspace"]');
    return evaluate(`document.querySelector('[data-testid="waveform-workspace"]').getAttribute('data-compile-status')`);
  };

  console.log('--- 1. Example Handoff + Edit Result ---');
  // Load Half Adder Example
  await evaluate(`
    window.location.hash = '#/projects';
  `);
  await wait(1000);
  await waitFor('[data-testid="open-waveform-btn-half_adder"]');
  await evaluate(`
    document.querySelector('[data-testid="open-waveform-btn-half_adder"]').click();
  `);
  await wait(500);
  
  // Verify NO overwrite modal appears (Phase 9 requirement)
  const hasModal = await evaluate(`
    !!document.querySelector('.fixed.inset-0 button')
  `);
  assert.strictEqual(hasModal, false, 'FALSE POSITIVE: Unsaved Work modal appeared on a fresh workspace when opening an Example.');
  await wait(500);


  let status = await getCompileStatus();
  assert.strictEqual(status, 'idle', 'Status should be idle after Example load');
  
  // Compile original example
  await evaluate(`document.querySelector('[title="Compile HDL with Icarus Verilog"]').click()`);
  await wait(1500);
  status = await getCompileStatus();
  assert.strictEqual(status, 'success', 'Original example should compile successfully');
  
  const editActiveModel = async (replaceFrom, replaceTo) => {
    // Wait for the editor to render
    for (let i = 0; i < 20; i++) {
      const ok = await evaluate(`!!window.monaco?.editor?.getEditors()?.[0]`);
      if (ok) break;
      await wait(100);
    }
    await evaluate(`
      (() => {
        const editor = window.monaco.editor.getEditors()[0];
        if(!editor) throw new Error('Editor not found');
        const model = editor.getModel();
        if(!model) throw new Error('Model not found');
        const oldVal = model.getValue();
        const newVal = oldVal.replace('${replaceFrom}', '${replaceTo}');
        if (oldVal === newVal) throw new Error('Replace failed, string not found. String was: ' + oldVal);
        model.setValue(newVal);
      })()
    `);
  };

  // Edit Monaco to invert 'a' in 's'
  console.log('--- 2. Source Editor Edit Regression ---');
  await editActiveModel('assign sum   = a ^ b;', 'assign sum   = ~a ^ b;');
  await wait(100);
  
  status = await getCompileStatus();
  assert.strictEqual(status, 'idle', 'Status should return to idle after edit (waveformSourceEditInvalidatesSimulation)');
  
  // Compile again
  await evaluate(`document.querySelector('[title="Compile HDL with Icarus Verilog"]').click()`);
  await wait(1500);
  
  status = await getCompileStatus();
  assert.strictEqual(status, 'success', 'Edited source should compile successfully');
  
  // We need to verify that it actually compiled the edited version.
  // We can't use debug bridges. The easiest way is to introduce a syntax error and prove it fails.
  
  console.log('--- 3. Compile Failure Recovery Result ---');
  await editActiveModel('', 'INVALID_SYNTAX_BOOM!!!');
  await wait(100);
  status = await getCompileStatus();
  assert.strictEqual(status, 'idle', 'Status should return to idle after syntax error edit');
  
  await evaluate(`document.querySelector('[title="Compile HDL with Icarus Verilog"]').click()`);
  await wait(1500);
  status = await getCompileStatus();
  assert.strictEqual(status, 'error', 'Compile should fail due to invalid syntax (waveformCompileFailureClearsOldWaveform)');
  
  // Verify Run button is disabled
  const runDisabled = await evaluate(`document.querySelector('[title="Run Simulation Playback"]').disabled`);
  assert.strictEqual(runDisabled, true, 'Run button should be disabled when compile fails (waveformCompileFailureDisablesRun)');
  
  // Fix syntax
  await editActiveModel('INVALID_SYNTAX_BOOM!!!', '');
  await wait(100);
  await evaluate(`document.querySelector('[title="Compile HDL with Icarus Verilog"]').click()`);
  await wait(1500);
  status = await getCompileStatus();
  assert.strictEqual(status, 'success', 'Compile should succeed after fixing syntax (waveformCompileRecovery)');
  
  console.log('--- 4. Rapid Edit / Compile Regression ---');
  // Edit and IMMEDIATELY click compile without wait
  await editActiveModel('assign sum   = ~a ^ b;', 'assign sum   = a ^ b; // rapid');
  await evaluate(`document.querySelector('[title="Compile HDL with Icarus Verilog"]').click()`);
  await wait(1500);
  status = await getCompileStatus();
  assert.strictEqual(status, 'success', 'Rapid edit should compile successfully without lag (waveformRapidEditCompileNoLag)');

  console.log('--- 5. Testbench Editor Edit Regression ---');
  // Edit TB to introduce syntax error
  await evaluate(`
    (() => {
      // Switch tab to testbench first
      document.querySelectorAll('button').forEach(b => {
        if(b.textContent.includes('testbench')) b.click();
      });
    })()
  `);
  await wait(500);
  
  await editActiveModel('module', 'INVALID_TB!!! module');
  await wait(100);
  status = await getCompileStatus();
  assert.strictEqual(status, 'idle', 'Status should be idle after TB edit (waveformTestbenchEditInvalidatesSimulation)');
  
  await evaluate(`document.querySelector('[title="Compile HDL with Icarus Verilog"]').click()`);
  await wait(1500);
  status = await getCompileStatus();
  assert.strictEqual(status, 'error', 'Compile should fail due to TB syntax error');

  console.log('--- 6. Removed Waveform Global Bridges ---');
  const bridgeCheck = await evaluate(`typeof window.__waveformState`);
  assert.strictEqual(bridgeCheck, 'undefined', 'window.__waveformState should be undefined (noProductionWaveformDebugBridge)');

  console.log('All Phase 8 assertions passed!');
  
  ws.close();
  chrome.kill();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
