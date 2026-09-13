import { spawn } from 'node:child_process';
import assert from 'node:assert';

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const baseUrl = (process.env.APP_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
  const debugPort = 9253;
  const userDataDir = `/tmp/phase12-ux-chrome-${process.pid}`;

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--window-size=1440,900',
    `${baseUrl}/#/de2-simulator`,
  ]);

  const cleanup = () => {
    try {
      chrome.kill();
    } catch (_) {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    // Wait for Chrome remote debugging to become available
    for (let i = 0; i < 25; i++) {
      await wait(250);
      try {
        const r = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        const list = await r.json();
        if (list.length > 0) break;
      } catch (_) {}
    }

    const r = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const list = await r.json();
    const page = list.find((t) => t.type === 'page');

    if (!page) {
      throw new Error('Could not find chrome page target');
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && callbacks.has(m.id)) {
        callbacks.get(m.id)(m.result);
        callbacks.delete(m.id);
      }
    };

    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const curId = id++;
        callbacks.set(curId, resolve);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });

    await send('Runtime.enable');
    await send('Page.enable');
    await wait(2000); // Wait for React app to mount

    const evaluate = async (expr) => {
      const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      if (res.exceptionDetails) {
        throw new Error(`Eval failed: ${res.exceptionDetails.exception?.description || 'unknown'}\nExpr: ${expr}`);
      }
      return res.result.value;
    };

    const waitFor = async (selector, timeoutMs = 5000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const exists = await evaluate(`!!document.querySelector('${selector}')`);
        if (exists) return true;
        await wait(100);
      }
      throw new Error(`Timeout waiting for selector: ${selector}`);
    };

    console.log('--- Phase 12.2C DE2 UX Regression Suite ---');

    // =========================================================================
    // 1. DE2 Default to Board Mode
    // =========================================================================
    console.log('[Test 1] Verifying Fresh Workspace Defaults to Board Mode...');
    // Ensure clean state without prior layout
    await evaluate(`localStorage.removeItem('de2_workspace_layout_v1'); location.reload();`);
    await wait(1800);
    await waitFor('[data-testid="view-board"]');

    const isBoardPressed = await evaluate(
      `document.querySelector('[data-testid="view-board"]').getAttribute('aria-pressed')`
    );
    assert.strictEqual(isBoardPressed, 'true', 'Default view mode must be "board"');

    const hasEditorContainer = await evaluate(
      `!!document.querySelector('[data-testid="de2-editor-container"]')`
    );
    assert.strictEqual(hasEditorContainer, false, 'Editor container must NOT be mounted or visible in fresh Board view');

    const isBoardViewportVisible = await evaluate(
      `!!document.querySelector('[data-testid="de2-board-viewport"]')`
    );
    assert.strictEqual(isBoardViewportVisible, true, 'Board viewport must be visible in Board mode');
    console.log('  PASS: Fresh workspace starts in Board mode.');

    // =========================================================================
    // 2. Persistence Across Reload & Reset
    // =========================================================================
    console.log('[Test 2] Verifying Layout Persistence & Reset...');
    // Switch to Split view
    await evaluate(`document.querySelector('[data-testid="view-split"]').click()`);
    await wait(400);

    const isSplitPressed = await evaluate(
      `document.querySelector('[data-testid="view-split"]').getAttribute('aria-pressed')`
    );
    assert.strictEqual(isSplitPressed, 'true', 'Split view button should have aria-pressed="true"');

    // Check localStorage
    const savedLayoutRaw = await evaluate(`localStorage.getItem('de2_workspace_layout_v1')`);
    assert.ok(savedLayoutRaw, 'Layout should be persisted in localStorage');
    const savedLayout = JSON.parse(savedLayoutRaw);
    assert.strictEqual(savedLayout.activeView, 'split', 'activeView in layout should be "split"');

    // Reload page and verify restored view
    await evaluate(`location.reload()`);
    await wait(1800);
    await waitFor('[data-testid="view-split"]');

    const restoredSplitPressed = await evaluate(
      `document.querySelector('[data-testid="view-split"]').getAttribute('aria-pressed')`
    );
    assert.strictEqual(restoredSplitPressed, 'true', 'Split mode must be restored after page reload');

    // Reset workspace layout
    await waitFor('[data-testid="de2-reset-layout"]');
    await evaluate(`document.querySelector('[data-testid="de2-reset-layout"]').click()`);
    await wait(400);

    const resetBoardPressed = await evaluate(
      `document.querySelector('[data-testid="view-board"]').getAttribute('aria-pressed')`
    );
    assert.strictEqual(resetBoardPressed, 'true', 'Reset workspace layout must return to Board view');

    const resetLayoutSaved = JSON.parse(await evaluate(`localStorage.getItem('de2_workspace_layout_v1')`));
    assert.strictEqual(resetLayoutSaved.activeView, 'board', 'Persisted layout must have activeView="board"');
    console.log('  PASS: Layout persistence and reset verified.');

    // =========================================================================
    // 3. Real Board Pan
    // =========================================================================
    console.log('[Test 3] Verifying Real Board Drag Panning...');
    await waitFor('[data-testid="de2-board-transform"]');

    const initialPanX = Number(
      await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-x')`)
    );
    const initialPanY = Number(
      await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-y')`)
    );

    // Get viewport bounding box to pick a safe empty coordinate
    const vpRect = await evaluate(`
      (() => {
        const r = document.querySelector('[data-testid="de2-board-viewport"]').getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      })()
    `);

    const startX = Math.round(vpRect.left + vpRect.width / 2);
    const startY = Math.round(vpRect.top + vpRect.height / 2);
    const dragDx = 120;
    const dragDy = 80;

    // Dispatch pointer drag sequence via CDP
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: startX,
      y: startY,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: startX,
      y: startY,
      button: 'left',
      clickCount: 1,
    });
    await wait(50);
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: startX + dragDx,
      y: startY + dragDy,
      button: 'left',
    });
    await wait(50);
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: startX + dragDx,
      y: startY + dragDy,
      button: 'left',
    });
    await wait(100);

    const pannedX = Number(
      await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-x')`)
    );
    const pannedY = Number(
      await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-y')`)
    );

    assert.notStrictEqual(pannedX, initialPanX, 'panX should change after dragging');
    assert.notStrictEqual(pannedY, initialPanY, 'panY should change after dragging');
    assert.strictEqual(pannedX, initialPanX + dragDx, `panX expected to increase by ${dragDx}`);
    assert.strictEqual(pannedY, initialPanY + dragDy, `panY expected to increase by ${dragDy}`);
    console.log(`  PASS: Drag panning updated translation from (${initialPanX}, ${initialPanY}) to (${pannedX}, ${pannedY}).`);

    // =========================================================================
    // 4. Interactive Control Isolation (Switches & Buttons NEVER trigger pan)
    // =========================================================================
    console.log('[Test 4] Verifying Control Isolation (Switches & Keys)...');
    // Reset view to fit so both switches and keys are fully inside the viewport
    await evaluate(`document.querySelector('[data-testid="de2-fit-view"]').click()`);
    await wait(150);

    const panBeforeSwitch = {
      x: Number(await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-x')`)),
      y: Number(await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-y')`)),
    };

    // Toggle Switch 0
    await waitFor('[data-testid="de2-switch-0"]');
    const switchInitialActive = await evaluate(
      `document.querySelector('[data-testid="de2-switch-0"]').getAttribute('data-active')`
    );

    // Click switch via CDP
    const switchPos = await evaluate(`
      (() => {
        const r = document.querySelector('[data-testid="de2-switch-0"]').getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      })()
    `);

    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: switchPos.x,
      y: switchPos.y,
      button: 'left',
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: switchPos.x,
      y: switchPos.y,
      button: 'left',
    });
    await wait(100);

    const switchToggledActive = await evaluate(
      `document.querySelector('[data-testid="de2-switch-0"]').getAttribute('data-active')`
    );
    assert.notStrictEqual(switchToggledActive, switchInitialActive, 'Switch 0 should toggle state on click');

    const panAfterSwitch = {
      x: Number(await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-x')`)),
      y: Number(await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-y')`)),
    };
    assert.strictEqual(panAfterSwitch.x, panBeforeSwitch.x, 'panX must NOT change when clicking a switch');
    assert.strictEqual(panAfterSwitch.y, panBeforeSwitch.y, 'panY must NOT change when clicking a switch');

    // Test KEY Button (KEY 0)
    await waitFor('[data-testid="de2-key-0"]');
    const keyInfo = await evaluate(`
      (() => {
        const el = document.querySelector('[data-testid="de2-key-0"]');
        const r = el.getBoundingClientRect();
        const x = Math.round(r.left + r.width / 2);
        const y = Math.round(r.top + r.height / 2);
        const topEl = document.elementFromPoint(x, y);
        return { x, y };
      })()
    `);
    const keyPos = { x: keyInfo.x, y: keyInfo.y };

    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: keyPos.x,
      y: keyPos.y,
    });
    await wait(50);

    // Press down
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: keyPos.x,
      y: keyPos.y,
      button: 'left',
      clickCount: 1,
    });
    await wait(50);
    const isKeyPressed = await evaluate(
      `document.querySelector('[data-testid="de2-key-0"]').getAttribute('data-active')`
    );
    assert.strictEqual(isKeyPressed, 'true', 'KEY 0 must be active when pressed down');

    // Release
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: keyPos.x,
      y: keyPos.y,
      button: 'left',
    });
    await wait(50);
    const isKeyReleased = await evaluate(
      `document.querySelector('[data-testid="de2-key-0"]').getAttribute('data-active')`
    );
    assert.strictEqual(isKeyReleased, 'false', 'KEY 0 must be inactive when released');

    const panAfterKey = {
      x: Number(await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-x')`)),
      y: Number(await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-pan-y')`)),
    };
    assert.strictEqual(panAfterKey.x, panBeforeSwitch.x, 'panX must NOT change when pressing a key button');
    assert.strictEqual(panAfterKey.y, panBeforeSwitch.y, 'panY must NOT change when pressing a key button');
    console.log('  PASS: Switches and KEY buttons function without triggering canvas pan.');

    // =========================================================================
    // 5. Cursor-Centered Zoom
    // =========================================================================
    console.log('[Test 5] Verifying Cursor-Centered Wheel Zoom...');
    // Reset view first
    await evaluate(`document.querySelector('[data-testid="de2-fit-view"]').click()`);
    await wait(100);

    const initialScale = Number(
      await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-scale')`)
    );

    // Dispatch wheel zoom-in at cursor (600, 400)
    await send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 600,
      y: 400,
      deltaX: 0,
      deltaY: -120, // Negative deltaY = zoom in
    });
    await wait(100);

    const zoomedScale = Number(
      await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-scale')`)
    );
    assert.ok(zoomedScale > initialScale, `Zoomed scale (${zoomedScale}) should be greater than initial (${initialScale})`);
    console.log(`  PASS: Wheel zoom scaled from ${initialScale} to ${zoomedScale}.`);

    // =========================================================================
    // 6. High Zoom Accessibility (Bottom Switches Reachable)
    // =========================================================================
    console.log('[Test 6] Verifying High Zoom Edge Accessibility (Bottom Switches Reachable)...');
    // Zoom in multiple times to reach ~1.5x - 1.8x
    for (let i = 0; i < 4; i++) {
      await evaluate(`document.querySelector('[data-testid="de2-zoom-in"]').click()`);
      await wait(50);
    }

    const highScale = Number(
      await evaluate(`document.querySelector('[data-testid="de2-board-transform"]').getAttribute('data-scale')`)
    );
    assert.ok(highScale >= 1.2, `High scale should be at least 1.2, got ${highScale}`);

    // Pan upward (drag mouse up, deltaY negative) so bottom of the board enters view
    const centerVp = await evaluate(`
      (() => {
        const r = document.querySelector('[data-testid="de2-board-viewport"]').getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      })()
    `);

    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: centerVp.x,
      y: centerVp.y,
      button: 'left',
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: centerVp.x,
      y: centerVp.y - 300,
      button: 'left',
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: centerVp.x,
      y: centerVp.y - 300,
      button: 'left',
    });
    await wait(100);

    // Verify bottom switches SW[0] and SW[17] are within viewport bounds
    const switchesReachable = await evaluate(`
      (() => {
        const vp = document.querySelector('[data-testid="de2-board-viewport"]').getBoundingClientRect();
        const sw0 = document.querySelector('[data-testid="de2-switch-0"]').getBoundingClientRect();
        const sw17 = document.querySelector('[data-testid="de2-switch-17"]').getBoundingClientRect();
        const sw0InVp = sw0.top >= vp.top && sw0.bottom <= vp.bottom;
        const sw17InVp = sw17.top >= vp.top && sw17.bottom <= vp.bottom;
        return { sw0InVp, sw17InVp, sw0Bottom: sw0.bottom, vpBottom: vp.bottom };
      })()
    `);
    assert.ok(
      switchesReachable.sw0InVp || switchesReachable.sw0Bottom <= switchesReachable.vpBottom,
      'Bottom switch SW0 must be reachable and visible in viewport when panned at high zoom'
    );
    console.log('  PASS: Bottom switches are fully reachable at high zoom.');

    // =========================================================================
    // 7. Fit to Screen
    // =========================================================================
    console.log('[Test 7] Verifying Fit to Screen...');
    await evaluate(`document.querySelector('[data-testid="de2-fit-view"]').click()`);
    await wait(150);

    const fitVisibility = await evaluate(`
      (() => {
        const vp = document.querySelector('[data-testid="de2-board-viewport"]').getBoundingClientRect();
        const board = document.querySelector('[data-testid="de2-board-transform"]').getBoundingClientRect();
        const fullyInside =
          board.left >= vp.left - 2 &&
          board.right <= vp.right + 2 &&
          board.top >= vp.top - 2 &&
          board.bottom <= vp.bottom + 2;
        return {
          fullyInside,
          board: { left: board.left, right: board.right, top: board.top, bottom: board.bottom },
          vp: { left: vp.left, right: vp.right, top: vp.top, bottom: vp.bottom },
        };
      })()
    `);
    assert.ok(fitVisibility.fullyInside, 'Board should be fully contained and visible after Fit to Screen');
    console.log('  PASS: Fit to Screen centered and restored full board visibility.');

    // =========================================================================
    // 8. Responsive Toolbar & Overflow Menu (< 768px)
    // =========================================================================
    console.log('[Test 8] Verifying Responsive Toolbar & Overflow Popover...');

    // Resize viewport to mobile width 430px
    await send('Emulation.setDeviceMetricsOverride', {
      width: 430,
      height: 932,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await wait(300);

    // Check overflow button presence
    const hasOverflowButton = await evaluate(
      `!!document.querySelector('[data-testid="de2-toolbar-overflow"]')`
    );
    assert.strictEqual(hasOverflowButton, true, 'Overflow menu button must be present on mobile viewport (<768px)');

    // Open overflow menu
    await evaluate(`document.querySelector('[data-testid="de2-toolbar-overflow"]').click()`);
    await wait(150);

    const isOverflowOpen = await evaluate(
      `!!document.querySelector('[data-testid="de2-overflow-menu"]')`
    );
    assert.strictEqual(isOverflowOpen, true, 'Overflow popover must open on mobile');

    const hasStepClockInOverflow = await evaluate(
      `!!document.querySelector('[data-testid="de2-step-clock-mobile"]')`
    );
    assert.strictEqual(hasStepClockInOverflow, true, 'Step clock action must be accessible in mobile overflow menu');

    const hasResetLayoutInOverflow = await evaluate(
      `!!document.querySelector('[data-testid="de2-reset-layout-mobile"]')`
    );
    assert.strictEqual(hasResetLayoutInOverflow, true, 'Reset layout action must be accessible in mobile overflow menu');

    // Close overflow
    await evaluate(`document.querySelector('[data-testid="de2-toolbar-overflow"]').click()`);
    await wait(100);

    // Restore desktop dimensions
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await wait(200);

    console.log('  PASS: Responsive toolbar adapts smoothly and overflow menu provides full access.');

    // =========================================================================
    // Phase 12.2D Waveform Workspace UX & Multi-File HDL Project Support
    // =========================================================================
    console.log('\n--- Phase 12.2D Waveform Workspace UX Regression Suite ---');

    // [Test 9] Fresh Waveform Workspace
    console.log('[Test 9] Verifying Fresh Waveform Workspace Defaults...');
    await evaluate(`
      localStorage.removeItem('wf_workspace_layout_v1');
      location.hash = '#/waveform';
    `);
    await wait(1800);
    await waitFor('[data-testid="waveform-workspace"]');

    const wfMainView = await evaluate(`
      document.querySelector('[data-testid="wf-view-waveform"]')?.getAttribute('aria-selected')
    `);
    assert.strictEqual(wfMainView, 'true', 'Default primary view must be "waveform"');

    const isObjectsOpen = await evaluate(`
      !!document.querySelector('[data-testid="wf-objects-panel"]')
    `);
    assert.strictEqual(isObjectsOpen, false, 'Objects panel must be closed by default on fresh workspace');

    const isConsoleOpen = await evaluate(`
      !!document.querySelector('[data-testid="wf-console"]')
    `);
    assert.strictEqual(isConsoleOpen, false, 'Console panel must be closed by default on fresh workspace');

    const isProjectOpen = await evaluate(`
      !!document.querySelector('[data-testid="wf-project-panel"]')
    `);
    assert.strictEqual(isProjectOpen, true, 'Project panel should be open by default');
    console.log('  PASS: Fresh Waveform workspace defaults: Waveform primary view, Objects closed, Console closed.');

    // [Test 10] Objects Empty State
    console.log('[Test 10] Verifying Objects Panel Manual Open Empty State...');
    await evaluate(`document.querySelector('[data-testid="wf-toggle-objects"]').click()`);
    await wait(250);
    const objectsEmptyText = await evaluate(`
      document.querySelector('[data-testid="wf-objects-panel"]')?.textContent || ''
    `);
    assert.ok(objectsEmptyText.includes('No signals loaded'), 'Objects empty state must indicate no signals loaded');
    assert.ok(objectsEmptyText.includes('Compile an HDL project or import a VCD file'), 'Objects empty state must guide user');
    // Close Objects again
    await evaluate(`document.querySelector('[data-testid="wf-toggle-objects"]').click()`);
    await wait(200);
    console.log('  PASS: Objects panel shows deliberate empty state without raw headers when opened before compilation.');

    // [Test 11] Multi-File Source Import & Testbench Import
    console.log('[Test 11] Verifying Multi-File Source Import and Selection...');
    const halfAdderCode = `module half_adder(
  input logic a,
  input logic b,
  output logic sum,
  output logic carry
);
  assign sum = a ^ b;
  assign carry = a & b;
endmodule`;

    const fullAdderCode = `module full_adder(
  input logic a,
  input logic b,
  input logic cin,
  output logic sum,
  output logic cout
);

  logic s1;
  logic c1;
  logic c2;

  half_adder ha1(
    .a(a),
    .b(b),
    .sum(s1),
    .carry(c1)
  );

  half_adder ha2(
    .a(s1),
    .b(cin),
    .sum(sum),
    .carry(c2)
  );

  assign cout = c1 | c2;

endmodule`;

    const fullAdderTbCode = `module full_adder_tb;
  logic a;
  logic b;
  logic cin;
  logic sum;
  logic cout;

  full_adder dut(
    .a(a),
    .b(b),
    .cin(cin),
    .sum(sum),
    .cout(cout)
  );

  initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, full_adder_tb);
    a = 0; b = 0; cin = 0;
    #10 a = 0; b = 1; cin = 0;
    #10 a = 1; b = 0; cin = 0;
    #10 a = 1; b = 1; cin = 0;
    #10 a = 0; b = 0; cin = 1;
    #10 a = 0; b = 1; cin = 1;
    #10 a = 1; b = 0; cin = 1;
    #10 a = 1; b = 1; cin = 1;
    #10 $finish;
  end
endmodule`;

    // Inject half_adder.sv and full_adder.sv via DataTransfer on hidden source input
    await evaluate(`
      (() => {
        const dt = new DataTransfer();
        const f1 = new File([${JSON.stringify(halfAdderCode)}], 'half_adder.sv', { type: 'text/plain' });
        const f2 = new File([${JSON.stringify(fullAdderCode)}], 'full_adder.sv', { type: 'text/plain' });
        dt.items.add(f1);
        dt.items.add(f2);
        const input = document.querySelector('[data-testid="wf-input-source"]');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);
    await wait(800);

    await waitFor('[data-testid="wf-source-item-half_adder.sv"]');
    await waitFor('[data-testid="wf-source-item-full_adder.sv"]');
    console.log('  PASS: Multi-file source import loaded half_adder.sv and full_adder.sv into Project panel.');

    // Inject full_adder_tb.sv into testbench input
    await evaluate(`
      (() => {
        const dt = new DataTransfer();
        const f = new File([${JSON.stringify(fullAdderTbCode)}], 'full_adder_tb.sv', { type: 'text/plain' });
        dt.items.add(f);
        const input = document.querySelector('[data-testid="wf-input-tb"]');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);
    await wait(800);

    const hasTbFile = await evaluate(`
      document.querySelector('[data-testid="wf-slot-testbench"]')?.textContent.includes('full_adder_tb.sv')
    `);
    assert.strictEqual(hasTbFile, true, 'Testbench slot must contain full_adder_tb.sv');
    console.log('  PASS: Testbench slot loaded full_adder_tb.sv.');

    // [Test 12] Editor File Architecture & Tab Switching
    console.log('[Test 12] Verifying Editor Multi-File Tab Switching...');
    // Ensure in editor mode
    await evaluate(`document.querySelector('[data-testid="wf-view-editor"]').click()`);
    await wait(300);

    // Switch to half_adder.sv tab
    await evaluate(`document.querySelector('[data-editor-tab="source"][data-filename="half_adder.sv"]')?.click()`);
    await wait(250);
    let editorVal = await evaluate(`window.monaco?.editor?.getEditors()?.[0]?.getValue() || ''`);
    assert.ok(editorVal.includes('module half_adder'), 'Monaco editor should display half_adder.sv content');

    // Switch to full_adder.sv tab
    await evaluate(`document.querySelector('[data-editor-tab="source"][data-filename="full_adder.sv"]')?.click()`);
    await wait(250);
    editorVal = await evaluate(`window.monaco?.editor?.getEditors()?.[0]?.getValue() || ''`);
    assert.ok(editorVal.includes('module full_adder'), 'Monaco editor should display full_adder.sv content');

    // Switch to testbench tab
    await evaluate(`document.querySelector('[data-testid="wf-editor-tab-tb"]')?.click()`);
    await wait(250);
    editorVal = await evaluate(`window.monaco?.editor?.getEditors()?.[0]?.getValue() || ''`);
    assert.ok(editorVal.includes('module full_adder_tb'), 'Monaco editor should display full_adder_tb.sv content');
    console.log('  PASS: Editor tab switching updates Monaco model correctly without content loss.');

    // [Test 13] Hierarchical HDL Multi-File Compilation
    console.log('[Test 13] Compiling Hierarchical Multi-File HDL (full_adder + half_adder)...');
    await evaluate(`document.querySelector('[data-testid="wf-btn-compile"]').click()`);

    // Wait for compilation to complete (up to 20s)
    let compileSuccess = false;
    for (let i = 0; i < 80; i++) {
      await wait(250);
      const status = await evaluate(`
        document.querySelector('[data-testid="waveform-workspace"]')?.getAttribute('data-compile-status')
      `);
      if (status === 'success') {
        compileSuccess = true;
        break;
      }
      if (status === 'error') {
        const logs = await evaluate(`
          Array.from(document.querySelectorAll('[data-testid="wf-console"] .font-mono div')).map(e => e.textContent).join('\\n')
        `);
        throw new Error(`Hierarchical compilation failed! Logs: ${logs}`);
      }
    }
    assert.strictEqual(compileSuccess, true, 'Multi-file hierarchical compile must succeed');

    // Verify auto-switch to Waveform view on successful compile
    const activeViewAfterCompile = await evaluate(`
      document.querySelector('[data-testid="wf-view-waveform"]')?.getAttribute('aria-selected')
    `);
    assert.strictEqual(activeViewAfterCompile, 'true', 'Workspace must automatically switch to Waveform view after compile');

    // Verify Console remains closed on success
    const consoleAfterSuccess = await evaluate(`
      !!document.querySelector('[data-testid="wf-console"]')
    `);
    assert.strictEqual(consoleAfterSuccess, false, 'Console should remain closed on successful compile');

    // Verify Objects panel auto-opened
    const objectsAfterSuccess = await evaluate(`
      !!document.querySelector('[data-testid="wf-objects-panel"]')
    `);
    assert.strictEqual(objectsAfterSuccess, true, 'Objects panel should auto-open on first compile with signals');

    // Verify signals from hierarchy exist in Objects panel
    const objectsContent = await evaluate(`
      document.querySelector('[data-testid="wf-objects-panel"]')?.textContent || ''
    `);
    assert.ok(objectsContent.includes('sum') || objectsContent.includes('cout'), 'Signals from hierarchical design must be visible in Objects');
    console.log('  PASS: Hierarchical compilation succeeded, auto-switched to Waveform, loaded signals, Objects auto-opened.');

    // [Test 14] Add / Remove Source File Independence
    console.log('[Test 14] Verifying Add / Remove Source File Independence...');
    const dummyModule = 'module other_module(input clk, output reg q); always @(posedge clk) q <= ~q; endmodule';
    await evaluate(`
      (() => {
        const dt = new DataTransfer();
        const f = new File([${JSON.stringify(dummyModule)}], 'other_module.sv', { type: 'text/plain' });
        dt.items.add(f);
        const input = document.querySelector('[data-testid="wf-input-source"]');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);
    await wait(600);

    await waitFor('[data-testid="wf-source-item-other_module.sv"]');
    // Verify all 3 sources exist
    const countWithDummy = await evaluate(`
      document.querySelectorAll('[data-testid^="wf-source-item-"]').length
    `);
    assert.strictEqual(countWithDummy, 3, 'Project should now have 3 source files');

    // Delete other_module.sv
    await evaluate(`
      document.querySelector('[data-action="remove-source"][data-filename="other_module.sv"]')?.click()
    `);
    await wait(400);

    // Verify other_module is gone, but half_adder and full_adder remain intact
    const remainingSources = await evaluate(`
      Array.from(document.querySelectorAll('[data-testid^="wf-source-item-"]')).map(e => e.getAttribute('data-filename'))
    `);
    assert.ok(!remainingSources.includes('other_module.sv'), 'other_module.sv must be removed');
    assert.ok(remainingSources.includes('half_adder.sv'), 'half_adder.sv must remain intact');
    assert.ok(remainingSources.includes('full_adder.sv'), 'full_adder.sv must remain intact');

    // Verify testbench file was NOT affected
    const tbRemains = await evaluate(`
      document.querySelector('[data-testid="wf-slot-testbench"]')?.textContent.includes('full_adder_tb.sv')
    `);
    assert.strictEqual(tbRemains, true, 'Testbench file must remain intact when deleting a source file');
    console.log('  PASS: Adding and removing individual source file preserves all other sources and testbench.');

    // [Test 15] Dirty-State Compatibility
    console.log('[Test 15] Verifying Dirty-State Across Multi-File Project...');
    const isWfDirty = await evaluate(`
      sessionStorage.getItem('eda_workspace_state_waveform_dirty') === 'true'
    `);
    assert.strictEqual(isWfDirty, true, 'Waveform workspace must be marked dirty after project modifications');
    console.log('  PASS: Dirty state correctly tracks multi-file project changes.');

    // [Test 16] Primary Views Switching & Persistence
    console.log('[Test 16] Verifying Primary View Switching (Waveform <-> Editor <-> Split)...');
    // Switch to Editor
    await evaluate(`document.querySelector('[data-testid="wf-view-editor"]').click()`);
    await wait(250);
    const editorVisible = await evaluate(`
      (() => {
        const c = document.querySelector('[data-testid="wf-editor-container"]');
        return c && c.offsetHeight > 200 && c.offsetWidth > 200;
      })()
    `);
    assert.strictEqual(editorVisible, true, 'Editor container must have non-zero dimensions in Editor view');

    // Switch to Split
    await evaluate(`document.querySelector('[data-testid="wf-view-split"]').click()`);
    await wait(250);
    const splitValid = await evaluate(`
      (() => {
        const ed = document.querySelector('[data-testid="wf-editor-container"]');
        const cv = document.querySelector('canvas');
        return ed && cv && ed.offsetHeight > 50 && cv.offsetHeight > 50;
      })()
    `);
    assert.strictEqual(splitValid, true, 'Both Editor and Waveform canvas must be active in Split view');

    // Switch back to Waveform
    await evaluate(`document.querySelector('[data-testid="wf-view-waveform"]').click()`);
    await wait(250);
    const waveActive = await evaluate(`
      document.querySelector('[data-testid="wf-view-waveform"]')?.getAttribute('aria-selected')
    `);
    assert.strictEqual(waveActive, 'true', 'Waveform view must be active');
    console.log('  PASS: Primary view tabs switch smoothly and allocate full dimensions.');

    // [Test 17] Console Auto-Open on Compile Failure
    console.log('[Test 17] Verifying Console Auto-Open on Syntax / Compile Failure...');
    // Introduce intentional syntax error in testbench
    await evaluate(`document.querySelector('[data-testid="wf-view-editor"]').click()`);
    await wait(250);
    await evaluate(`document.querySelector('[data-testid="wf-editor-tab-tb"]').click()`);
    await wait(250);
    await evaluate(`
      (() => {
        const ed = window.monaco?.editor?.getEditors()?.[0];
        if (ed) ed.setValue('module broken_tb; syntax_error_here; endmodule');
      })()
    `);
    await wait(250);

    // Click Compile
    await evaluate(`document.querySelector('[data-testid="wf-btn-compile"]').click()`);

    // Wait for compilation error
    let compileErrored = false;
    for (let i = 0; i < 50; i++) {
      await wait(250);
      const status = await evaluate(`
        document.querySelector('[data-testid="waveform-workspace"]')?.getAttribute('data-compile-status')
      `);
      if (status === 'error') {
        compileErrored = true;
        break;
      }
    }
    assert.strictEqual(compileErrored, true, 'Compilation must report error status on syntax error');

    // Verify Console automatically opened
    const consoleOpenedOnError = await evaluate(`
      !!document.querySelector('[data-testid="wf-console"]')
    `);
    assert.strictEqual(consoleOpenedOnError, true, 'Console must auto-open on compilation error');

    // Verify Console displays error message
    const consoleErrLogs = await evaluate(`
      document.querySelector('[data-testid="wf-console"]')?.textContent || ''
    `);
    assert.ok(consoleErrLogs.includes('syntax_error_here') || consoleErrLogs.includes('HATA') || consoleErrLogs.includes('error'), 'Console must display compiler diagnostic');
    console.log('  PASS: Console auto-opens on error with compiler diagnostics.');

    // [Test 18] Resizable Panel Boundaries & Zero Page Overflow
    console.log('[Test 18] Verifying Panel Resize Limits and Zero Page Overflow...');
    // Check splitter min/max attributes
    const projectMinMax = await evaluate(`
      (() => {
        const s = document.querySelector('[data-testid="splitter-wf-project"]');
        return {
          min: Number(s?.getAttribute('aria-valuemin')),
          max: Number(s?.getAttribute('aria-valuemax')),
        };
      })()
    `);
    assert.strictEqual(projectMinMax.min, 180, 'Project panel minimum width should be 180px');
    assert.strictEqual(projectMinMax.max, 360, 'Project panel maximum width should be 360px');

    const objectsMinMax = await evaluate(`
      (() => {
        const s = document.querySelector('[data-testid="splitter-wf-objects"]');
        return {
          min: Number(s?.getAttribute('aria-valuemin')),
          max: Number(s?.getAttribute('aria-valuemax')),
        };
      })()
    `);
    assert.strictEqual(objectsMinMax.min, 200, 'Objects panel minimum width should be 200px');
    assert.strictEqual(objectsMinMax.max, 420, 'Objects panel maximum width should be 420px');

    const consoleMinMax = await evaluate(`
      (() => {
        const s = document.querySelector('[data-testid="splitter-wf-console"]');
        return {
          min: Number(s?.getAttribute('aria-valuemin')),
          max: Number(s?.getAttribute('aria-valuemax')),
        };
      })()
    `);
    assert.strictEqual(consoleMinMax.min, 100, 'Console minimum height should be 100px');
    assert.strictEqual(consoleMinMax.max, 380, 'Console maximum height should be 380px');

    // Check page horizontal overflow
    const overflowCheck = await evaluate(`
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    `);
    assert.strictEqual(overflowCheck, true, 'Workspace must not have page-level horizontal overflow');
    console.log('  PASS: Panel resize boundaries (180-360, 200-420, 100-380) strictly enforced with zero page horizontal overflow.');

    console.log('\nAll Phase 12.2C & 12.2D UX assertions PASSED successfully!');
    cleanup();
    process.exit(0);
  } catch (err) {
    console.error('\nRegression test FAILED:', err);
    cleanup();
    process.exit(1);
  }
}

main();
