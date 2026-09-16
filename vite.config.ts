import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // The old CAD/WASM assets are deliberately excluded from this local build.
  publicDir: 'static',
  server: { port: 3000, strictPort: true, watch: { ignored: ['**/outputs/**', '**/work/**'] } },
  build: { target: 'es2022', outDir: 'dist', emptyOutDir: true,
    rollupOptions: { input: { viewer: 'index.html', dashboard: 'dashboard.html', engines: 'engines.html' } },
  },
});
