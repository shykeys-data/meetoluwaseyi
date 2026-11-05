import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ['development'] },
  ssr: { noExternal: ['@meetoluwaseyi/shared'], resolve: { conditions: ['development'] } },
  build: { target: 'es2022' },
});
