import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * Offline support: emits /sw.js from pwa/sw.template.js with the build's own
 * file list, so every release gets a new service worker and cache.
 * Files over 6 MB (large compiler WASM) are cached on first use instead.
 */
function logiclabPwa(): Plugin {
  return {
    name: 'logiclab-pwa',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.values(bundle)
        .filter((f) => !f.fileName.endsWith('.map') && !f.fileName.endsWith('.html'))
        .filter((f) => ((f.type === 'chunk' ? f.code : f.source) ?? '').length < 6 * 1024 * 1024)
        .map((f) => `/${f.fileName}`);
      const precache = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png', ...files];
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);
      const template = fs.readFileSync(path.resolve(__dirname, 'pwa/sw.template.js'), 'utf8');
      const source = `const VERSION = ${JSON.stringify(version)};\nconst PRECACHE = ${JSON.stringify(precache)};\n${template}`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    logiclabPwa(),
    {
      name: 'yosys2digitaljs-topsort-vite-plugin',
      transform(code, id) {
        if (id.includes('yosys2digitaljs') && code.includes('const toporder = topsort(')) {
          return {
            code: code.replace(
              'const toporder = topsort(',
              'const toporder = (typeof topsort === "function" ? topsort : (topsort.default || topsort))('
            ),
            map: null,
          };
        }
      },
    },
  ],
  resolve: {
    alias: {
      topsort: path.resolve(__dirname, 'src/shims/topsort.ts'),
    },
    // Explicit extension order so Vite always finds .tsx service files
    // without needing the extension in import statements.
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  server: {
    fs: {
      strict: false
    }
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@yowasp/yosys'],
    include: ['memfs'],
    esbuildOptions: {
      plugins: [
        {
          name: 'yosys2digitaljs-topsort-esbuild-plugin',
          setup(build) {
            build.onLoad({ filter: /yosys2digitaljs[/\\]dist[/\\]core\.js$/ }, async (args) => {
              const fs = await import('node:fs');
              let contents = await fs.promises.readFile(args.path, 'utf8');
              contents = contents.replace(
                'const toporder = topsort(',
                'const toporder = (typeof topsort === "function" ? topsort : (topsort.default || topsort))('
              );
              return { contents, loader: 'js' };
            });
          }
        }
      ]
    }
  }
});
