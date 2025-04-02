// @ts-check
import astarEslint from '@ansearch/config/linters/eslint.config.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...astarEslint,
  {
    files: ['**/*.ts'],
    rules: {
      camelcase: [
        'error',
        {
          allow: [
            'client_id',
            'client_secret',
            'redirect_uri',
            'grant_type',
            '$ai_latency',
            '$ai_span_name',
            '$ai_trace_id',
          ],
        },
      ],
    },
  },
  {
    rules: {
      'import-x/no-unresolved': [2, { ignore: ['~icons/*'] }],
    },
  },
  {
    ignores: ['**/.wrangler/**', '**/env.d.ts'],
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'fp/no-mutating-assign': 'off',
    },
  },
);
