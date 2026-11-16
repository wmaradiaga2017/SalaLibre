import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'src/generated'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
  {
    // Revisión de T04: `@IsOptional` deja pasar `null` hasta la base. Los campos opcionales usan `@OptionalNotNull()`.
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'class-validator',
              importNames: ['IsOptional'],
              message: 'Usa @OptionalNotNull() de common/validation/decorators (null → 400 con mensaje).',
            },
          ],
        },
      ],
    },
  },
);
