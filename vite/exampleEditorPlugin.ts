/**
 * Dev-only example editor API.
 *
 * `npm run dev` exposes a tiny local API so the in-app example editor
 * (#/dev/examples) can read and save the files in src/examples/source.
 * Vite picks the saved file up through its `?raw` import and hot-reloads it,
 * so the change is visible at once; commit and push to publish it.
 *
 * Never part of a production build (`apply: 'serve'`). Requests must carry
 * the X-LogicLab-Dev header, which a browser can only send cross-origin after
 * a CORS preflight this server does not approve, so other websites cannot
 * write files through it. Only plain .sv/.v file names inside the example
 * folder are accepted.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const PREFIX = '/__logiclab/examples';
const MAX_BYTES = 256 * 1024;
const NAME_RE = /^[A-Za-z0-9_-]+\.(sv|v)$/;

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BYTES) {
        reject(new Error('File too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createExampleEditorHandler(dir: string) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith(PREFIX)) return next();
    if (req.headers['x-logiclab-dev'] !== '1') return send(res, 403, { error: 'Missing X-LogicLab-Dev header' });

    const rest = decodeURIComponent(url.pathname.slice(PREFIX.length).replace(/^\/+/, ''));
    try {
      if (!rest) {
        if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
        const names = (await fs.readdir(dir)).filter((n) => NAME_RE.test(n)).sort();
        const files = await Promise.all(names.map(async (name) => ({ name, size: (await fs.stat(path.join(dir, name))).size })));
        return send(res, 200, { files });
      }
      if (!NAME_RE.test(rest)) return send(res, 400, { error: 'Invalid file name' });
      const file = path.join(dir, rest);
      if (path.dirname(file) !== dir) return send(res, 400, { error: 'Invalid path' });

      if (req.method === 'GET') {
        return send(res, 200, { name: rest, content: await fs.readFile(file, 'utf8') });
      }
      if (req.method === 'PUT') {
        const exists = await fs.stat(file).then(() => true, () => false);
        const create = url.searchParams.get('create') === '1';
        if (!exists && !create) return send(res, 404, { error: 'No such example file' });
        if (exists && create) return send(res, 409, { error: 'File already exists' });
        const content = await readBody(req);
        // Write-then-rename so a crash never leaves a half-written file.
        const tmp = `${file}.${process.pid}.tmp`;
        await fs.writeFile(tmp, content.replace(/\r\n/g, '\n'), 'utf8');
        await fs.rename(tmp, file);
        return send(res, 200, { name: rest, saved: true, bytes: Buffer.byteLength(content) });
      }
      return send(res, 405, { error: 'Method not allowed' });
    } catch (err) {
      return send(res, 500, { error: (err as Error).message });
    }
  };
}

export function exampleEditorPlugin(root: string): Plugin {
  const dir = path.resolve(root, 'src/examples/source');
  return {
    name: 'logiclab-example-editor',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(createExampleEditorHandler(dir));
    },
  };
}
