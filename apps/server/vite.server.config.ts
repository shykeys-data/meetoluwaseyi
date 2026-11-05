import { defineConfig } from 'vite';

// Bundles the server (and the shared package's TypeScript) into one ESM file for production.
// npm dependencies stay external and are installed on the host with `npm ci --omit=dev`.
export default defineConfig({
  build: {
    ssr: 'src/index.ts',
    outDir: 'dist',
    target: 'node22',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'index.js' } },
  },
  ssr: { noExternal: ['@meetoluwaseyi/shared'] },
});
