/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    webextensions: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  ignorePatterns: ['dist/', 'coverage/', 'node_modules/', 'webpack.config.js', 'mock-server/'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // Chrome extension event handlers often fire-and-forget async work intentionally.
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: {
          attributes: false,
          arguments: false,
        },
      },
    ],
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/await-thenable': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    'no-console': 'off',
    'no-case-declarations': 'off',
  },
  overrides: [
    {
      files: ['tests/**/*.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-misused-promises': 'off',
      },
    },
    {
      files: ['src/background/**/*.ts', 'src/modules/**/*.ts'],
      env: {
        serviceworker: true,
      },
    },
  ],
};
