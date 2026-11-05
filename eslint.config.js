import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'scripts/*.py'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Used deliberately after explicit length/existence checks (noUncheckedIndexedAccess is on).
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['src/server/**/*.ts', 'src/shared/**/*.ts', 'test/**/*.ts', 'e2e/**/*.ts', '*.js', '*.cjs', '*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['app.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    // Generated from the approved mockup by scripts/dc2jsx.py; regenerate rather than hand-lint.
    files: ['src/web/mockup/*View.tsx', 'src/web/mockup/page-css.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['src/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
