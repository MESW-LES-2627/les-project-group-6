// Mutation testing (make mutation). Stryker changes the code on purpose and
// checks that a Vitest test fails. Only TypeScript with logic is mutated
// (stores, services, utils, router guards); Vue templates are covered by the
// component tests and mutating markup only produces noise.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  // Named explicitly: pnpm's isolated node_modules hides it from Stryker's auto-discovery
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: { configFile: 'vitest.config.ts' },
  mutate: [
    'src/stores/**/*.ts',
    'src/services/**/*.ts',
    'src/utils/**/*.ts',
    'src/router/**/*.ts',
    '!src/**/__tests__/**',
  ],
  ignorePatterns: ['coverage', 'reports', 'dist', 'e2e', 'playwright-report', 'test-results'],
  reporters: ['clear-text', 'html', 'json', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  incremental: true,
  incrementalFile: 'reports/stryker-incremental.json',
  concurrency: 2,
  thresholds: { high: 85, low: 70, break: null },
  // The sandbox goes in <repo>/.stryker-tmp/sandbox-*, two levels below the
  // root, so tsconfig's "../../tsconfig.base.json" still resolves. Never use
  // inPlace: an interrupted run leaves mutated files in src/.
  tempDirName: '../../.stryker-tmp',
};
