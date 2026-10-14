import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';

const hooksConfig = reactHooks.configs['recommended-latest'] ?? reactHooks.configs.recommended;

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '_bmad', '_bmad-output', '.agents', '.opencode'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...(hooksConfig?.rules ?? {}),
      'react-refresh/only-export-components': 'warn',
      'no-undef': 'off',
    },
  },
  eslintConfigPrettier,
);
