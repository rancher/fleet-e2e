const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const cypressPlugin = require('eslint-plugin-cypress');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    files: ['cypress/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      ecmaVersion: 2015,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      cypress: cypressPlugin,
      ...prettierRecommended.plugins,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...cypressPlugin.configs.recommended.rules,
      ...prettierRecommended.rules,
      'cypress/no-unnecessary-waiting': 'off',
      'cypress/unsafe-to-chain-command': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
