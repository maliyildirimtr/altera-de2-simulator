import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
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
  }
});
