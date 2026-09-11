import { spawn } from 'node:child_process';
import assert from 'node:assert';
import fs from 'node:fs';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9246',
    `${baseUrl}/#/de2-simulator`
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

  const checkModal = async () => {
    await wait(300);
    return await evaluate(`!!document.querySelector('.fixed.inset-0 button')`);
  };
  
  const clickReplaceAndOpen = async () => {
    await evaluate(`(() => {
      const modalButtons = Array.from(document.querySelectorAll('.fixed.inset-0 button'));
      const replaceBtn = modalButtons.find(b => b.textContent.includes('Replace'));
      if (replaceBtn) replaceBtn.click();
    })()`);
    await wait(500);
  };
  
  const clickCancel = async () => {
    await evaluate(`(() => {
      const modalButtons = Array.from(document.querySelectorAll('.fixed.inset-0 button'));
      const cancelBtn = modalButtons.find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    })()`);
    await wait(500);
  };

  console.log('--- Phase 9 Dirty State Regression Matrix ---');

  await evaluate(`sessionStorage.clear();`);

  // 1. DE2 Fresh Session -> Load Example -> NO Modal
  console.log('[DE2] Fresh Session Defaults Clean...');
  await evaluate(`window.location.hash = '#/projects';`);
  await waitFor('[data-testid="open-de2-btn-half_adder"]');
  const dbg = await evaluate(`JSON.stringify({
    origin: sessionStorage.getItem('eda_workspace_state_de2_origin'),
    dirty: sessionStorage.getItem('eda_workspace_state_de2_dirty'),
    legacy: sessionStorage.getItem('eda_de2_user_modified')
  })`);
  console.log('[DE2 Debug] State before clicking example:', dbg);
  await evaluate(`document.querySelector('[data-testid="open-de2-btn-half_adder"]').click();`);
  
  let modal = await checkModal();
  assert.strictEqual(modal, false, '[DE2] Fresh workspace should not show modal');
  
  // 2. DE2 Clean Example -> Another Example -> NO Modal
  console.log('[DE2] Clean Example -> Example -> No Modal...');
  await evaluate(`window.location.hash = '#/projects';`);
  await waitFor('[data-testid="open-de2-btn-full_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-de2-btn-full_adder"]').click();`);
  
  modal = await checkModal();
  assert.strictEqual(modal, false, '[DE2] Untouched Example switching should not show modal');
  await waitFor('[data-testid="de2-workspace"]');

  // 3. DE2 Edited Example -> Example -> Modal
  console.log('[DE2] Edited Example -> Shows Modal...');
  const editMonaco = async () => {
    // Force code view open
    await evaluate(`document.querySelector('[data-testid="view-code"]').click();`);
    await wait(300);
    // Wait for the editor to render
    let editorReady = false;
    for (let i = 0; i < 50; i++) {
      const ok = await evaluate(`!!document.querySelector('.monaco-editor') && !!window.monaco?.editor?.getEditors()?.[0]`);
      if (ok) { editorReady = true; break; }
      await wait(100);
    }
    if (!editorReady) {
      await send('Page.enable');
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(process.env.REGRESSION_ARTIFACT_DIR || os.tmpdir(), 'monaco_timeout.png'), Buffer.from(screenshot.data, 'base64'));
      const html = await evaluate(`document.body.innerHTML`);
      fs.writeFileSync(path.join(process.env.REGRESSION_ARTIFACT_DIR || os.tmpdir(), 'dom_timeout.html'), html);
      throw new Error("Monaco editor failed to mount");
    }
    await evaluate(`(() => {
      const editor = window.monaco.editor.getEditors()[0];
      const model = editor.getModel();
      model.setValue(model.getValue() + '\\n// user edit');
    })()`);
    await wait(500);
  };
  await editMonaco();
  await evaluate(`window.location.hash = '#/projects';`);
  await waitFor('[data-testid="open-de2-btn-half_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-de2-btn-half_adder"]').click();`);
  
  modal = await checkModal();
  assert.strictEqual(modal, true, '[DE2] Edited workspace must show modal');
  
  // Cancel preserves dirty metadata
  console.log('[DE2] Cancel preserves metadata...');
  await clickCancel();
  let de2State = await evaluate(`JSON.stringify({
    origin: sessionStorage.getItem('eda_workspace_state_de2_origin'),
    dirty: sessionStorage.getItem('eda_workspace_state_de2_dirty')
  })`);
  assert.strictEqual(JSON.parse(de2State).dirty, 'true', 'Cancel should leave workspace dirty');
  
  // Replace loads example and marks clean
  console.log('[DE2] Replace marks example clean...');
  await waitFor('[data-testid="open-de2-btn-half_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-de2-btn-half_adder"]').click();`);
  await clickReplaceAndOpen();
  
  de2State = await evaluate(`JSON.stringify({
    origin: sessionStorage.getItem('eda_workspace_state_de2_origin'),
    dirty: sessionStorage.getItem('eda_workspace_state_de2_dirty')
  })`);
  assert.strictEqual(JSON.parse(de2State).dirty, 'false', 'Replace should reset dirty flag');
  assert.strictEqual(JSON.parse(de2State).origin, 'example', 'Replace should set origin to example');

  // 4. Waveform Fresh Session -> Example -> NO Modal
  console.log('[Waveform] Fresh Session Defaults Clean...');
  // Force a fresh Waveform context by clearing storage for waveform
  await evaluate(`
    sessionStorage.removeItem('eda_workspace_state_waveform_origin');
    sessionStorage.removeItem('eda_workspace_state_waveform_dirty');
    window.location.hash = '#/waveform';
  `);
  await wait(1000);
  await evaluate(`window.location.hash = '#/projects';`);
  await waitFor('[data-testid="open-waveform-btn-half_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-waveform-btn-half_adder"]').click();`);
  
  modal = await checkModal();
  assert.strictEqual(modal, false, '[Waveform] Fresh workspace should not show modal');

  // 5. Schematic Fresh Session -> Example -> NO Modal
  console.log('[Schematic] Fresh Session Defaults Clean...');
  await evaluate(`
    sessionStorage.removeItem('eda_workspace_state_schematic_origin');
    sessionStorage.removeItem('eda_workspace_state_schematic_dirty');
    window.location.hash = '#/schematic';
  `);
  await wait(1000);
  await evaluate(`window.location.hash = '#/projects';`);
  await waitFor('[data-testid="open-schematic-btn-half_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-schematic-btn-half_adder"]').click();`);
  
  modal = await checkModal();
  assert.strictEqual(modal, false, '[Schematic] Fresh workspace should not show modal');

  console.log('All Phase 9 assertions passed!');
  chrome.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
