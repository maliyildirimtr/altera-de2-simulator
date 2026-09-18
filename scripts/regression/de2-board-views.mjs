/**
 * DE2 board renderer regression runner.
 *
 * Compiles `src/components/Board/__tests__/boardViews.test.tsx` with the
 * project's own TypeScript and runs it on Node, rendering both board renderers
 * with react-dom/server. This is the same compile-then-run pattern as
 * `security.mjs`, and it needs no browser — so it complements (rather than
 * duplicates) the Chrome-driven DE2 suites in `npm run test:de2`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const outDir = path.join(projectRoot, 'dist_test', 'board');
const entry = 'src/components/Board/__tests__/boardViews.test.tsx';

console.log('--- DE2 Board Renderer Regression Runner ---');

console.log('Cleaning test directory...');
try {
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
} catch (err) {
  // A locked or undeletable build artefact must not fail the run: tsc
  // overwrites its own output, so a stale directory is harmless.
  console.warn(`Could not fully clean ${outDir}: ${err.message}`);
}
fs.mkdirSync(outDir, { recursive: true });
// The package is ESM; the emitted test bundle is CommonJS.
fs.writeFileSync(
  path.join(outDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2),
);

console.log('Compiling board renderer tests...');
const tscArgs = [
  entry,
  '--ignoreConfig',
  '--esModuleInterop',
  '--skipLibCheck',
  '--jsx react-jsx',
  '--target es2022',
  '--module commonjs',
  '--moduleResolution node',
  '--ignoreDeprecations 6.0',
  '--outDir dist_test/board',
  '--types node',
].join(' ');

try {
  execSync(`npx tsc ${tscArgs}`, { cwd: projectRoot, stdio: 'inherit' });
} catch {
  console.error('Compilation failed!');
  process.exit(1);
}

/** tsc roots the output at the common source directory, so locate the entry. */
function findCompiledEntry(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      const found = findCompiledEntry(full);
      if (found) return found;
    } else if (name === 'boardViews.test.js') {
      return full;
    }
  }
  return null;
}

const runner = findCompiledEntry(outDir);
if (!runner) {
  console.error(`Compiled test not found under ${outDir}`);
  process.exit(1);
}

try {
  execSync(`node ${JSON.stringify(runner)}`, { cwd: projectRoot, stdio: 'inherit' });
} catch {
  console.error('DE2 board renderer regression FAILED!');
  process.exit(1);
}

console.log('--- DE2 Board Renderer Regression Runner: PASS ---');
