// @ts-check
import astarEslint from '@ansearch/config/linters/eslint.config.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...astarEslint,
  {
    files: ['services/packages/oauth/src/**/*.ts'],
    rules: {
      camelcase: [
        'error',
        { allow: ['client_id', 'client_secret', 'redirect_uri', 'grant_type'] },
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
