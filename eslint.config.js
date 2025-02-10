// @ts-check
import astarEslint from '@ansearch/config/linters/eslint.config.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...astarEslint,
  {
    ignores: ['.prettierrc*'],
    rules: {
      'sonarjs/no-empty-test-file': 0, // duplicate of no-warning-comments
    },
  },
  {
    // disable some rules in test files
    files: ['**/tests/**'],
    rules: {
      'security/detect-non-literal-fs-filename': 0,
      'eslint/security/detect-non-literal-fs-filename': 0,
    },
  },
);
