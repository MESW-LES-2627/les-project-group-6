// Mutation testing (make mutation). Stryker changes the code on purpose and
// checks that a unit test fails. Only the domain model and services are mutated:
// that is where the business rules live. Repositories, routes and DTOs are
// checked by the integration tests, which need Postgres and are too slow to
// re-run for every mutant.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'command',
  commandRunner: { command: 'npx tsx --test "tests/unit/**/*.test.ts"' },
  mutate: [
    'src/features/**/*.ts',
    '!src/features/**/*-{routes,repository,dto,query,socket,notifier,announcer}.ts',
    '!src/features/auth/**',
    '!src/features/book/{open-library-catalog,query-cache,book-catalog}.ts',
    '!src/features/library-folder/library-membership.ts',
    'src/utils/calendar.ts',
  ],
  ignorePatterns: ['coverage', 'reports', 'dist'],
  reporters: ['clear-text', 'html', 'json', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  incremental: true,
  incrementalFile: 'reports/stryker-incremental.json',
  concurrency: 6,
  thresholds: { high: 85, low: 70, break: null },
  tempDirName: '.stryker-tmp',
};
