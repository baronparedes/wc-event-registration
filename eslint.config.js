import js from '@eslint/js';
import importXPlugin from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const jsxConditionalRestrictions = [
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
];

const testDataRestrictions = [
  {
    selector:
      "Property[key.name=/^(full_?name|first_?name|last_?name|middle_?name|nick_?name|fullName|firstName|lastName|middleName|nickName|displayName|display_name)$/][value.type='Literal'][value.value=/\\S/]:not([value.value=/^(Test|Sample)\\b/])",
    message:
      'Use faker/factories for person names in tests. Literal names must start with "Test" or "Sample".',
  },
  {
    selector:
      "Property[key.name=/(^|_)email$|Email$/][value.type='Literal'][value.value=/@/]:not([value.value=/@example\\.(com|org|net|test)$/i])",
    message: 'Use faker.internet.exampleEmail() or an @example.com address in tests.',
  },
  {
    selector:
      "JSXAttribute[name.name=/^(name|fullName|displayName|memberName)$/][value.type='Literal'][value.value=/^[A-Z][a-z]+\\\\s+[A-Z]/]:not([value.value=/^(Test|Sample)\\\\b/])",
    message:
      'Use faker/factories for person names in tests. Literal names must start with \"Test\" or \"Sample\".',
  },
];

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
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
      'no-restricted-syntax': ['error', ...jsxConditionalRestrictions],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/__tests__/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...jsxConditionalRestrictions, ...testDataRestrictions],
    },
  },
]);
