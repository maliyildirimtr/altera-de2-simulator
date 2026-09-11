import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const distTestDir = path.join(projectRoot, 'dist_test');

console.log('--- Phase 7 Security Regression Runner ---');

// 1. Clean dist_test safely using Node fs
console.log('Cleaning test directory...');
if (fs.existsSync(distTestDir)) {
  fs.rmSync(distTestDir, { recursive: true, force: true });
}
fs.mkdirSync(distTestDir, { recursive: true });
fs.writeFileSync(path.join(distTestDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));

// 2. Compile tests using local TypeScript
console.log('Compiling tests...');
try {
  execSync('npx tsc src/core/simulator/expression/__tests__/security.test.ts --ignoreConfig --esModuleInterop --skipLibCheck --target es2022 --module commonjs --moduleResolution node --ignoreDeprecations 6.0 --outDir dist_test --types node', { cwd: projectRoot, stdio: 'inherit' });
} catch (err) {
  console.error('Compilation failed!');
  process.exit(1);
}

// 3. Run the compiled security test
console.log('Running security assertions...');
const testRunner = path.join(distTestDir, 'security.test.js');

let targetRunner = testRunner;
if (!fs.existsSync(targetRunner)) {
  // Fallback if tsc preserves directory structure
  targetRunner = path.join(distTestDir, 'expression', '__tests__', 'security.test.js');
}

if (!fs.existsSync(targetRunner)) {
  console.error(`Test file not found at ${targetRunner}`);
  process.exit(1);
}

try {
  execSync(`node ${targetRunner}`, { cwd: projectRoot, stdio: 'inherit' });
} catch (err) {
  console.error('Security regression tests FAILED!');
  process.exit(1);
}

console.log('--- Security Regression: PASS ---');
