import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Entities, value objects and services stay plain TypeScript: only the
    // repositories, queries and routes of a feature may touch Drizzle, pg or Express.
    files: ['src/features/**/*.ts'],
    ignores: [
      'src/features/**/*-repository.ts',
      'src/features/**/*-query.ts',
      'src/features/**/*-routes.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['drizzle-orm', 'pg', 'express'],
          patterns: ['drizzle-orm/*', '**/database/*'],
        },
      ],
    },
  },
  prettier,
);
