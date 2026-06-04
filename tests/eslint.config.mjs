import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '**/*.min.js', 'cypress/reports/**'],
  },
  {
    files: ['**/*.ts', '**/*.js'],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2015,
      },
      globals: {
        cy: 'readonly',
        Cypress: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        before: 'readonly',
        after: 'readonly',
      },
    },
    rules: {
      // Code quality (errors - must fix)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      'no-useless-escape': 'error',
      'no-constant-condition': 'warn',
      'no-extra-semi': 'error',
      'no-unexpected-multiline': 'error',

      // Indentation disabled - ESLint cannot handle the required pattern
      // '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }],
      '@stylistic/semi': ['warn', 'always'],
      '@stylistic/comma-dangle': ['warn', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
      }],
      '@stylistic/no-trailing-spaces': 'warn',
      '@stylistic/eol-last': ['warn', 'always'],
      '@stylistic/object-curly-spacing': ['warn', 'always'],
      '@stylistic/array-bracket-spacing': ['warn', 'never'],
      '@stylistic/arrow-spacing': ['warn', { before: true, after: true }],
      '@stylistic/keyword-spacing': ['warn', { before: true, after: true }],
      '@stylistic/space-before-blocks': ['warn', 'always'],
      '@stylistic/no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 0 }],
      '@stylistic/padding-line-between-statements': [
        'error',
        // Require blank line after variable declarations
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        // Require blank line after blocks
        { blankLine: 'always', prev: 'block-like', next: '*' },
        // Require blank line before return statements
        { blankLine: 'always', prev: '*', next: 'return' },
        // Require blank line after imports
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        // Require blank line after directives (like 'use strict')
        { blankLine: 'always', prev: 'directive', next: '*' },
      ],
    },
  }
);
