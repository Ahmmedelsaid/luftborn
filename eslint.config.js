// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = tseslint.config(
  {
    // Build output, dependencies and generated fixtures are not linted.
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'data-fetching/*.json', '.angular/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // --- Angular style guide ---------------------------------------------
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // Every component in this app is either presentational or a signal-driven
      // container, so `OnPush` is never wrong and forgetting it silently costs
      // performance. Enforced rather than left to review.
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',

      // Prefer the modern `input()` / `output()` / host-object APIs.
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-native': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-host-metadata-property': 'off',

      // --- Type safety ------------------------------------------------------
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-non-null-assertion': 'error',

      // --- Correctness ------------------------------------------------------
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },
  {
    // Specs mock heavily; a few strict rules are counter-productive there.
    files: ['**/*.spec.ts', 'src/testing/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      // Keeping every `it` async is a consistency choice in specs, not an error.
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // Node/CommonJS tooling: the mock API server and this config file itself.
    files: ['server/**/*.js', 'eslint.config.js'],
    extends: [eslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // The assignment explicitly asks for a11y compliance, so the
      // accessibility rules are errors rather than the default warnings.
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/elements-content': 'error',
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/valid-aria': 'error',
      '@angular-eslint/template/no-positive-tabindex': 'error',

      // `@for` without `track` de-optimises list rendering; this is the lint
      // counterpart of the assignment's "TrackFunction" requirement.
      '@angular-eslint/template/use-track-by-function': 'error',
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/no-any': 'error',
    },
  },
  // Must stay last: turns off stylistic rules that would fight Prettier.
  prettierConfig,
);
