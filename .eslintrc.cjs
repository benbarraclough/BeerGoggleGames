/* eslint-env node */
module.exports = {
  root: true,
  ignorePatterns: [
    'dist/',
    '.astro/',
    'node_modules/'
  ],
  overrides: [
    {
      files: ['**/*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
        sourceType: 'module'
      },
      extends: [
        'plugin:astro/recommended'
      ],
      rules: {}
    },
    {
      files: ['**/*.{ts,tsx,js,jsx}'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
      }
    }
  ]
};
