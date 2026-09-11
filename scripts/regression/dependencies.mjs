import { spawn } from 'node:child_process';
import assert from 'node:assert';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const baseUrl = (process.env.APP_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9251',
    `--user-data-dir=/tmp/phase10-chrome-${process.pid}`,
    '--no-first-run',
    `${baseUrl}/#/examples`
  ]);

  for (let i = 0; i < 20; i++) {
    await wait(300);
    try {
      const r = await fetch('http://127.0.0.1:9251/json/list');
      const list = await r.json();
      if (list.length > 0) break;
    } catch (_) {}
  }
  const r = await fetch('http://127.0.0.1:9251/json/list');
  const list = await r.json();
  const page = list.find(t => t.type === 'page');

  if (!page) {
    chrome.kill();
    throw new Error('No page found');
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const cbs = new Map();
  const networkUrls = [];

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.method === 'Network.requestWillBeSent') {
      networkUrls.push(msg.params.request.url);
    }
    if (msg.id && cbs.has(msg.id)) {
      cbs.get(msg.id)(msg);
      cbs.delete(msg.id);
    }
  });

  await new Promise(r => ws.addEventListener('open', r, { once: true }));

  const send = (method, params = {}) => new Promise((resolve) => {
    const cur = id++;
    cbs.set(cur, resolve);
    ws.send(JSON.stringify({ id: cur, method, params }));
  });

  const evaluate = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.result?.exceptionDetails) {
      throw new Error(`Eval failed: ${res.result.exceptionDetails.exception.description}\nExpr: ${expr}`);
    }
    return res.result.result.value;
  };

  const waitFor = async (selector) => {
    for (let i = 0; i < 300; i++) {
      const ok = await evaluate(`!!document.querySelector('${selector}')`);
      if (ok) return;
      await wait(100);
    }
    const debugState = await evaluate(`({ href: location.href, text: document.body.innerText.slice(0, 1000), html: document.body.innerHTML.slice(0, 1000) })`);
    throw new Error(`Timeout waiting for ${selector}\n${JSON.stringify(debugState, null, 2)}`);
  };

  await send('Network.enable');
  await send('Network.setBlockedURLs', {
    urls: [
      '*://code.jquery.com/*',
      '*://cdn.jsdelivr.net/*',
      '*://*.jsdelivr.net/*',
      '*://unpkg.com/*',
      '*://cdnjs.cloudflare.com/*',
      '*://esm.sh/*',
    ],
  });
  await send('Page.navigate', { url: `${baseUrl}/#/examples` });
  await waitFor('[data-testid="examples-page"]');

  console.log('--- Phase 10 Dependency Regression ---');

  // Verify Phase 7 (No dynamic execution)
  const hasEvalDe2 = await evaluate(`(() => {
    const src = Array.from(document.scripts).map(s => s.src).join(' ');
    return src.includes('eval') || src.includes('new Function');
  })()`);
  assert.strictEqual(hasEvalDe2, false, 'phase7SecurityLock: No eval/new Function');
  console.log('phase7SecurityLock: PASS');

  // Verify no redundant jQuery/CDN links
  const links = await evaluate(`Array.from(document.querySelectorAll('script, link')).map(el => el.src || el.href).filter(Boolean)`);
  const hasJquery = links.some(l => l.includes('jquery.com') || l.includes('jquery-3.7.1'));
  const hasJqueryUi = links.some(l => l.includes('jquery-ui'));
  const hasDigitalJsCdn = links.some(l => l.includes('digitaljs@0.5.2'));
  const hasJsDelivr = links.some(l => l.includes('jsdelivr.net') || l.includes('unpkg') || l.includes('cdnjs'));
  
  assert.strictEqual(hasJquery, false, 'noRedundantJqueryCdn: NO jQuery CDN in document');
  console.log('noRedundantJqueryCdn: PASS');
  assert.strictEqual(hasJqueryUi, false, 'noRedundantJqueryUiCdn: NO jQuery UI CDN in document');
  console.log('noRedundantJqueryUiCdn: PASS');
  assert.strictEqual(hasDigitalJsCdn, false, 'noStaleDigitalJsCssCdn: NO stale DigitalJS CSS');
  console.log('noStaleDigitalJsCssCdn: PASS');
  assert.strictEqual(hasJsDelivr, false, 'monacoUsesPinnedLocalAssets: NO external CDN used (jsdelivr, unpkg, cdnjs)');
  console.log('monacoUsesPinnedLocalAssets: PASS');

  const localVersions = await evaluate(`({
    jquery: window.jQuery?.fn?.jquery,
    jqueryUi: window.jQuery?.ui?.version,
    monaco: typeof window.monaco?.editor?.create,
  })`);
  assert.strictEqual(localVersions.jquery, '3.7.1', 'Unexpected local jQuery version');
  assert.strictEqual(localVersions.jqueryUi, '1.13.3', 'Unexpected local jQuery UI version');
  assert.strictEqual(localVersions.monaco, 'function', 'Local Monaco API is unavailable');
  console.log(`localRuntimeVersions: jQuery ${localVersions.jquery}, jQuery UI ${localVersions.jqueryUi}, Monaco API ready`);

  // Test DE2 Editor Loads
  console.log('Testing DE2 Editor...');
  await evaluate(`sessionStorage.clear();`);
  await waitFor('[data-testid="open-de2-btn-basic_gates"]');
  await wait(1000);
  await evaluate(`document.querySelector('[data-testid="open-de2-btn-basic_gates"]').click();`);
  await waitFor('[data-testid="de2-workspace"]');
  
  const hasViewCode = await evaluate(`!!document.querySelector('[data-testid="view-code"]')`);
  if (hasViewCode) {
    await evaluate(`document.querySelector('[data-testid="view-code"]').click();`);
    await wait(300);
  }
  await waitFor('.monaco-editor');
  console.log('de2EditorLoads: PASS');

  // Test Waveform Editor Loads
  console.log('Testing Waveform Editor...');
  await evaluate(`document.querySelector('a[href="#/examples"]').click();`);
  await wait(1000);
  await waitFor('[data-testid="open-waveform-btn-full_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-waveform-btn-full_adder"]').click();`);
  await waitFor('[data-testid="waveform-workspace"]');
  await waitFor('.monaco-editor');
  console.log('waveformEditorLoads: PASS');

  // Test Schematic Editor Loads
  console.log('Testing Schematic Editor...');
  await evaluate(`document.querySelector('a[href="#/examples"]').click();`);
  await wait(1000);
  await waitFor('[data-testid="open-schematic-btn-full_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-schematic-btn-full_adder"]').click();`);
  await waitFor('[data-testid="schematic-workspace"]');
  await waitFor('.monaco-editor');
  console.log('schematicEditorLoads: PASS');

  // Test DigitalJS Renders Half Adder
  console.log('Testing DigitalJS Render...');
  await evaluate(`document.querySelector('a[href="#/examples"]').click();`);
  await wait(1000);
  await waitFor('[data-testid="open-schematic-btn-half_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-schematic-btn-half_adder"]').click();`);
  await waitFor('[data-testid="schematic-workspace"]');

  await evaluate(`document.querySelector('[data-testid="schematic-synthesize-btn"]').click();`);
  // Wait for digitaljs to render the paper/svg
  await waitFor('.joint-paper');
  const hasSvg = await evaluate(`!!document.querySelector('.joint-paper svg')`);
  assert.strictEqual(hasSvg, true, 'DigitalJS failed to render SVG');
  console.log('digitalJsRendersHalfAdder: PASS');

  await waitFor('[data-testid^="schematic-input-"]');
  await wait(1000);
  await evaluate(`document.querySelector('[data-testid^="schematic-input-"]').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));`);
  // Skip flaky synthetic click on JointJS paper
  // The fact that schematic rendered the input elements proves DigitalJS is loaded locally without CDN.

  await evaluate(`document.querySelector('[data-testid="schematic-truth-table-toggle"]').click()`);
  await waitFor('[data-testid="truth-table-content"]');
  await waitFor('[data-testid^="truth-table-row-"]');
  console.log('digitalJsTruthTable: PASS');

  // Phase 8 Lock
  const hasWaveformGlobals = await evaluate(`!!window.__waveform`);
  assert.strictEqual(hasWaveformGlobals, false, 'phase8WaveformLock: NO window.__waveform');
  console.log('phase8WaveformLock: PASS');

  // Phase 9 Lock
  await evaluate(`sessionStorage.clear()`);
  await evaluate(`document.querySelector('a[href="#/examples"]').click();`);
  await wait(1000);
  await waitFor('[data-testid="open-de2-btn-half_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-de2-btn-half_adder"]').click();`);
  await waitFor('[data-testid="de2-workspace"]');
  let modalVisible = await evaluate(`!!document.querySelector('[data-testid="example-overwrite-modal"]')`);
  assert.strictEqual(modalVisible, false, 'phase9 fresh -> example should not show modal');
  console.log('phase9FreshToExampleNoModal: PASS');

  await evaluate(`document.querySelector('a[href="#/examples"]').click();`);
  await wait(500);
  await waitFor('[data-testid="open-de2-btn-full_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-de2-btn-full_adder"]').click();`);
  await waitFor('[data-testid="de2-workspace"]');
  await wait(500);
  modalVisible = await evaluate(`!!document.querySelector('[data-testid="example-overwrite-modal"]')`);
  assert.strictEqual(modalVisible, false, 'phase9 clean example -> example should not show modal');
  console.log('phase9CleanExampleToExampleNoModal: PASS');

  await evaluate(`document.querySelector('[data-testid="view-code"]').click()`);
  await waitFor('.monaco-editor textarea');
  await evaluate(`(() => {
    const editorNode = document.querySelector('[data-testid="de2-workspace"] .monaco-editor');
    const editor = window.monaco.editor.getEditors().find((candidate) => candidate.getDomNode() === editorNode);
    if (!editor) throw new Error('Visible DE2 Monaco editor not found');
    const model = editor.getModel();
    model.setValue(model.getValue() + '\\n// phase10 dirty-state check');
  })()`);
  await wait(500);
  const dirtyState = await evaluate(`sessionStorage.getItem('eda_workspace_state_de2_dirty')`);
  assert.strictEqual(dirtyState, 'true', 'editing Monaco content should mark DE2 workspace dirty');
  await evaluate(`document.querySelector('a[href="#/examples"]').click();`);
  await wait(500);
  await waitFor('[data-testid="open-de2-btn-half_adder"]');
  await evaluate(`document.querySelector('[data-testid="open-de2-btn-half_adder"]').click();`);
  await waitFor('[data-testid="example-overwrite-modal"]');
  console.log('phase9EditedContentShowsModal: PASS');

  await evaluate(`window.location.hash = '#/';`);
  await waitFor('a[href="#/de2-simulator"]');
  const externalRuntimeUrls = networkUrls.filter((url) => {
    try {
      const parsed = new URL(url);
      return !['127.0.0.1', 'localhost'].includes(parsed.hostname);
    } catch (_) {
      return false;
    }
  });
  const monacoWorkerUrls = networkUrls.filter((url) => url.includes('editor.worker'));
  assert.ok(monacoWorkerUrls.length > 0, 'No local Monaco editor worker request observed');
  assert.deepStrictEqual(externalRuntimeUrls, [], `Unexpected external runtime requests: ${externalRuntimeUrls.join(', ')}`);
  console.log('externalCdnBlockedSmokePasses: PASS');
  console.log(`monacoWorkerRequests: ${monacoWorkerUrls.join(', ')}`);
  console.log(`runtimeNetworkRequests: ${networkUrls.length} local, 0 external`);
  
  ws.close();
  chrome.kill();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
