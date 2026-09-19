/**
 * Renders the DE2 board views to standalone SVG files for design review.
 *
 * Useful when you want to look at the board without starting the dev server —
 * for example to compare a change against the reference photograph, or to
 * check what survives at a low zoom level.
 *
 * Usage:  node scripts/dev/render-board-preview.mjs
 * Output: dist_test/board-preview/board-{2d,25d}-{low,normal,high}.svg
 *
 * It reuses the compiled output of `npm run test:de2-views`, so it runs that
 * first if the compiled tree is missing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');
const compiledRoot = path.join(projectRoot, 'dist_test', 'board');
const outDir = path.join(projectRoot, 'dist_test', 'board-preview');

function findCompiled(dir, name) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      const found = findCompiled(full, name);
      if (found) return found;
    } else if (entry === name) {
      return full;
    }
  }
  return null;
}

let rendererPath = findCompiled(compiledRoot, 'DE2BoardRenderer.js');
if (!rendererPath) {
  console.log('Compiled board tree missing — running the renderer test first...');
  execSync('node scripts/regression/de2-board-views.mjs', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  rendererPath = findCompiled(compiledRoot, 'DE2BoardRenderer.js');
}
if (!rendererPath) {
  console.error('Could not locate the compiled DE2BoardRenderer.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const React = require('react');
// Static rendering reads the server snapshot, which is the store's creation
// state. Preview the live store instead.
React.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();
const { renderToStaticMarkup } = require('react-dom/server');

const { DE2BoardRenderer, boardRenderSize } = require(rendererPath);
const storePath = findCompiled(compiledRoot, 'boardStore.js');
const { useBoardStore } = require(storePath);

/** Active-low seven-segment patterns for 0-7, so the preview shows real digits. */
const DIGITS = [
  [0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 1],
  [0, 0, 1, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 1, 0],
  [1, 0, 0, 1, 1, 0, 0],
  [0, 1, 0, 0, 1, 0, 0],
  [0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1],
];

/*
 * Drive the LCD through the real controller rather than poking strings into
 * the store: the preview is for checking that text lands on the glass, and it
 * is only worth looking at if it went through the same command decode the
 * simulator uses.
 */
const lcdPath = findCompiled(compiledRoot, 'lcdController.js');
let previewLcd;
if (lcdPath) {
  const { createLcdState, lcdStep } = require(lcdPath);
  const write = (state, rs, data) => {
    const high = lcdStep(state, { rs, rw: 0, en: 1, data, on: 1, blon: 1 });
    return lcdStep(high, { rs, rw: 0, en: 0, data, on: 1, blon: 1 });
  };
  previewLcd = createLcdState();
  for (const byte of [0x38, 0x0c, 0x06, 0x01, 0x80]) previewLcd = write(previewLcd, 0, byte);
  for (const ch of 'ENGINEERING LAB') previewLcd = write(previewLcd, 1, ch.charCodeAt(0));
  previewLcd = write(previewLcd, 0, 0xc0);
  for (const ch of 'HELLO FPGA') previewLcd = write(previewLcd, 1, ch.charCodeAt(0));
}

useBoardStore.setState({
  switches: Array.from({ length: 18 }, (_, i) => (i % 3 === 0 ? 1 : 0)),
  keys: [0, 1, 1, 1],
  ledR: Array.from({ length: 18 }, (_, i) => (i % 2 === 0 ? 1 : 0)),
  ledG: Array.from({ length: 9 }, (_, i) => (i < 5 ? 1 : 0)),
  // hex[0] is HEX0, the right-most display, so reverse for a left-to-right 0-7.
  hex: DIGITS.slice().reverse().map((d) => d.slice()),
  ...(previewLcd ? { lcd: previewLcd } : {}),
});

fs.mkdirSync(outDir, { recursive: true });

for (const [mode, slug] of [
  ['2d', '2d'],
  ['2.5d', '25d'],
]) {
  for (const detail of ['low', 'normal', 'high']) {
    const size = boardRenderSize(mode);
    const svg = renderToStaticMarkup(React.createElement(DE2BoardRenderer, { mode, detail }))
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
      .replace('width="100%" height="100%"', `width="${size.width}" height="${size.height}"`);
    const file = path.join(outDir, `board-${slug}-${detail}.svg`);
    fs.writeFileSync(file, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
    console.log(`wrote ${path.relative(projectRoot, file)} (${fs.statSync(file).size} bytes)`);
  }
}
