/* v8 ignore start */
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/.trunk/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      clean: true,
      cleanOnRerun: true,
      exclude: [
        '**/mocks/**',
        '**/__mocks__/**',
        '**/migrations/**',
        '**/test/**',
        '**/tests/**',
        '**/eslint*',
        '**/.prettier*',
        '**/drizzle*',
        '**/tsup*',
        '**/vite*',
        '**/tailwind*',
        '**/postcss*',
        '**/node_modules/**',
        '**/.yarn/**',
        '**/.wrangler/**',
        '**/services/apps/api/src/development.ts',
        '**/services/packages/database/src/config/database-postgresql-schemas.ts',
      ],
      reporter: ['text', 'json-summary', 'json'], // cSpell: disable-line
    },
    clearMocks: true,
    env: loadEnv('', process.cwd(), ''),
    setupFiles: ['./services/packages/database/tests/database-test-setup.ts'],
    fileParallelism: false,
  },
});
