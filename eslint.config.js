import js from '@eslint/js';
import importXPlugin from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'node_modules',
    'public',
    'build',
    'vite.config.ts',
    './supabase/.temp',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'import-x': importXPlugin,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../**', '../../../**'],
              message:
                'Deep relative imports are forbidden. Use your `@/` alias for paths deeper than 1 level.',
            },
          ],
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/first': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXExpressionContainer > ConditionalExpression[alternate.type='Literal'][alternate.value=null]",
          message:
            'Use && for one-sided JSX conditional rendering instead of condition ? <Element /> : null.',
        },
        {
          selector:
            "JSXExpressionContainer > ConditionalExpression[consequent.type='Literal'][consequent.value=null]",
          message:
            'Use && for one-sided JSX conditional rendering instead of condition ? null : <Element />.',
        },
      ],
    },
  },
]);
