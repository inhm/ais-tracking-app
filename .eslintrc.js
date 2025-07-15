module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  rules: {
    'no-unused-vars': 'off',
    'no-console': 'warn',
    'no-undef': 'off',
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
};