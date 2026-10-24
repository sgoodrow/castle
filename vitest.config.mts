import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Dates in tests read the same on every machine as in CI. Set before the test processes start.
process.env.TZ = "UTC";

// The bot and the bank web server. bank/web has its own tests and config (bank/web/vite.config.ts).
export default defineConfig({
  // SWC, not esbuild, compiles the code: TypeORM entities need the decorator metadata esbuild drops.
  plugins: [swc.vite()],
  test: {
    include: ["src/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      // Count every file, not just the ones a test imports, so the total is honest.
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/web/features/**", "src/bot-features/**", "src/testing/**"],
      reporter: ["text-summary", "text"],
      // Files with tests can't lose coverage. Raise these as tests grow; add a file here once it has tests.
      thresholds: {
        "src/db/bank-hour.ts": { lines: 77, branches: 0, functions: 50 },
        "src/features/dkp-records/raid-report.ts": { lines: 67, branches: 88, functions: 68 },
        "src/features/dkp-records/request-revision/raid-report-revision.ts": { lines: 96, branches: 94, functions: 83 },
        "src/features/dkp-records/request-revision/util.ts": { lines: 75, branches: 58, functions: 100 },
        "src/listeners/message-reaction-add-listener.ts": { lines: 100, branches: 100, functions: 100 },
        "src/features/dkp-records/raid-tick.ts": { lines: 54, branches: 40, functions: 34 },
        "src/features/dkp-records/create/credit-parser.ts": { lines: 96, branches: 86, functions: 100 },
        "src/features/dkp-records/create/pilot-checks.ts": { lines: 100, branches: 100, functions: 100 },
        "src/features/dkp-records/create/sheet-parser.ts": { lines: 69, branches: 53, functions: 84 },
        "src/features/eqnotify/matcher.ts": { lines: 100, branches: 100, functions: 100 },
        "src/features/spawn-timers/commands/prefix-adapter.ts": { lines: 86, branches: 71, functions: 71 },
        "src/features/spawn-timers/commands/helpers/duration.ts": { lines: 89, branches: 70, functions: 66 },
        "src/features/spawn-timers/commands/helpers/ended-timers.ts": { lines: 100, branches: 83, functions: 100 },
        "src/features/spawn-timers/commands/helpers/timer.ts": { lines: 79, branches: 57, functions: 66 },
        "src/features/spawn-timers/commands/parsers/argument-parser.ts": { lines: 91, branches: 84, functions: 100 },
        "src/features/spawn-timers/commands/parsers/time-parser.ts": { lines: 100, branches: 81, functions: 100 },
        "src/features/bank-inventory/actions/bank-request-complete-reaction.ts": { lines: 100, branches: 96, functions: 100 },
        "src/features/bank-request-info/bank-request.ts": { lines: 100, branches: 87, functions: 100 },
        "src/features/bank-request-info/dismissal.ts": { lines: 100, branches: 100, functions: 100 },
        "src/features/bank-request-info/expire-old-requests.ts": { lines: 100, branches: 94, functions: 100 },
        "src/features/bank-request-info/bank-plan.ts": { lines: 98, branches: 92, functions: 100 },
        "src/features/bank-request-info/bank-plan-button-command.ts": { lines: 100, branches: 91, functions: 100 },
        "src/shared/bank-location.ts": { lines: 81, branches: 75, functions: 100 },
        "src/shared/bank-plan-id.ts": { lines: 100, branches: 100, functions: 100 },
        "src/shared/bank-stock.ts": { lines: 100, branches: 100, functions: 100 },
        "src/shared/login-route.ts": { lines: 95, branches: 97, functions: 100 },
        "src/shared/channel-messages.ts": { lines: 92, branches: 80, functions: 100 },
        "src/services/bot/bot-prisma.ts": { lines: 23, branches: 95, functions: 38 },
        "src/services/bot/bot-sheet-alerts.ts": { lines: 100, branches: 92, functions: 100 },
        "src/services/sheet-updater/public-sheet.ts": { lines: 54, branches: 100, functions: 45 },
        "src/shared/error-reports.ts": { lines: 89, branches: 77, functions: 100 },
        "src/web/auth.ts": { lines: 100, branches: 100, functions: 100 },
        "src/web/bank-api.ts": { lines: 100, branches: 92, functions: 100 },
        "src/web/respond.ts": { lines: 100, branches: 100, functions: 100 },
        "src/web/server.ts": { lines: 99, branches: 93, functions: 100 },
        "src/web/bank-post.ts": { lines: 100, branches: 100, functions: 100 },
        "src/web/wiki-cache.ts": { lines: 96, branches: 80, functions: 100 },
      },
    },
  },
});
