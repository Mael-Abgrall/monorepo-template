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
            '$ai_input_tokens',
            '$ai_output_tokens',
            '$ai_model',
            '$ai_provider',
            '$ai_error',
            '$ai_is_error',
            '$ai_parent_id',
            '$ai_span_id',
            '$ai_pages_processed',
            '$ai_document_size',
            'input_type',
            'key_field',
            'api_version',
            'top_n',
            'input_schema',
            'include_image_base64',
            'document_url',
            'usage_info',
          ],
        },
      ],
      'sonarjs/todo-tag': 0, // already taken care of by "no-warning-comments"
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
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    files: ['**/*frontends/**', '**/*services/apps/**'],
    rules: {
      'drizzle/enforce-delete-with-where': 0,
    },
  },
);
