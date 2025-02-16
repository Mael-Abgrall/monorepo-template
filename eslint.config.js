// @ts-check
import astarEslint from '@ansearch/config/linters/eslint.config.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(...astarEslint, {
  files: ['services/packages/oauth/src/**/*.ts'],
  rules: {
    camelcase: [
      'error',
      { allow: ['client_id', 'client_secret', 'redirect_uri', 'grant_type'] },
    ],
  },
});
