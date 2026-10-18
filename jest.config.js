// Dates in tests read the same on every machine as in CI.
process.env.TZ = "UTC";

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'], // bank/web has its own tests, run by vitest
  // Count every file, not just the ones a test imports, so the total is honest.
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/web/features/**'],
  coverageReporters: ['text-summary', 'text'],
  // Files with tests can't lose coverage. Raise these as tests grow; add a file here once it has tests.
  coverageThreshold: {
    './src/db/bank-hour.ts': { lines: 81, branches: 0, functions: 50 },
    './src/features/dkp-records/raid-report.ts': { lines: 28, branches: 24, functions: 20 },
    './src/features/dkp-records/raid-tick.ts': { lines: 61, branches: 40, functions: 41 },
    './src/features/dkp-records/create/credit-parser.ts': { lines: 96, branches: 86, functions: 100 },
    './src/features/dkp-records/create/pilot-checks.ts': { lines: 100, branches: 100, functions: 100 },
    './src/features/dkp-records/create/sheet-parser.ts': { lines: 69, branches: 53, functions: 84 },
    './src/features/eqnotify/matcher.ts': { lines: 100, branches: 100, functions: 100 },
    './src/features/spawn-timers/commands/prefix-adapter.ts': { lines: 90, branches: 71, functions: 71 },
    './src/features/spawn-timers/commands/helpers/duration.ts': { lines: 89, branches: 70, functions: 66 },
    './src/features/spawn-timers/commands/helpers/ended-timers.ts': { lines: 100, branches: 83, functions: 100 },
    './src/features/spawn-timers/commands/helpers/timer.ts': { lines: 83, branches: 57, functions: 66 },
    './src/features/spawn-timers/commands/parsers/argument-parser.ts': { lines: 96, branches: 88, functions: 100 },
    './src/features/spawn-timers/commands/parsers/time-parser.ts': { lines: 100, branches: 81, functions: 100 },
    './src/shared/error-reports.ts': { lines: 89, branches: 77, functions: 100 },
    './src/web/auth.ts': { lines: 100, branches: 100, functions: 100 },
    './src/web/bank-api.ts': { lines: 100, branches: 92, functions: 100 },
    './src/web/respond.ts': { lines: 100, branches: 100, functions: 100 },
    './src/web/server.ts': { lines: 100, branches: 93, functions: 100 },
    './src/web/bank-post.ts': { lines: 100, branches: 100, functions: 100 },
    './src/web/wiki-cache.ts': { lines: 97, branches: 80, functions: 100 },
  },
};
