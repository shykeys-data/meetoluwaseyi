import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: { include: ['apps/*/test/**/*.test.ts', 'packages/*/test/**/*.test.ts'], environment: 'node' },
});
