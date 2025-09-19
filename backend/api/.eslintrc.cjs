module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'unused-imports'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:unused-imports/recommended', 'prettier'],
  rules: {
    'unused-imports/no-unused-imports': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  },
};
