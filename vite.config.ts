import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
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
