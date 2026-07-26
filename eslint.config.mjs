import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/*.tsbuildinfo'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,tsx,jsx}'],
    plugins: {
      import: importPlugin
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      'import/no-unresolved': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '**/infrastructure/*.service.js',
            '!**/infrastructure/observability/*.service.js',
            '!**/infrastructure/security/*.service.js',
            '!**/infrastructure/integration/*.gateway.js',
            '!**/infrastructure/persistence/**/*.js'
          ]
        }
      ]
    }
  },
  eslintConfigPrettier
];
