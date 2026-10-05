import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // `@/*` → `src/*`, read from tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // The real package throws outside a React Server Components build.
      'server-only': fileURLToPath(new URL('./src/test/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
    unstubEnvs: true,
  },
});
