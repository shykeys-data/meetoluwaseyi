/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One config for both builds:
//   vite build                        -> dist/client (browser bundle + hashed assets)
//   vite build --ssr src/server/...   -> dist/server and dist/jobs (Node 20, deps stay external)
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  publicDir: 'public',
  build: isSsrBuild
    ? { target: 'node20', emptyOutDir: true, sourcemap: true }
    : {
        outDir: 'dist/client',
        emptyOutDir: true,
        manifest: 'manifest.json',
        target: 'es2020',
        rollupOptions: {
          input: { main: 'src/web/entry-client.tsx', admin: 'src/web/admin/entry-admin.tsx' },
        },
      },
  ssr: { target: 'node' },
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
}));
