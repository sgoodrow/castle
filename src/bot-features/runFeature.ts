// Runs one .feature here: each step is matched against the step library in steps.ts. Each feature has
// its own <name>.test.ts that calls this, so vitest runs the features side by side in their own
// processes, each on its own real Postgres database (database.ts). Only what's outside the bot is
// stood in for: Discord (the bot's src/index.ts, which would log in), Google Sheets and dotenv, so a
// developer's .env never leaks into a run.
import path from "path";
import { describeFeature, library } from "../testing/gherkin";

// Before any of the bot's modules load, since its config reads the environment as it loads.
const { drop } = await vi.hoisted(async () => {
  const { createDatabase } = await import("./database");
  const db = await createDatabase();
  const { ENV } = await import("./world");
  Object.assign(process.env, ENV, { DATABASE_URL: db.url });
  return db;
});

vi.mock("..", async () => (await import("./world")).discord());
vi.mock("google-spreadsheet", async () => (await import("./world")).sheets());
vi.mock("dotenv", () => {
  const config = vi.fn();
  return { default: { config }, config };
});

const { reset, teardown } = await import("./world");
const { steps } = await import("./steps");

// The feature is relative to the folder of the test that calls this, which passes its own __dirname.
export function runFeature(dir: string, file: string) {
  vi.setConfig({ testTimeout: 20000 });
  // The bot's TypeORM connection opens as its code loads; let it open, so the feature doesn't end
  // while it's still connecting.
  beforeAll(async () => {
    const { dataSource } = await import("../db/data-source");
    await vi.waitUntil(() => dataSource.isInitialized, { timeout: 10000 });
  });
  beforeEach(reset);
  afterEach(teardown);
  afterAll(async () => {
    const { prismaClient } = await import("..");
    const { dataSource } = await import("../db/data-source");
    await prismaClient.$disconnect();
    await dataSource.destroy();
    await drop();
  });
  describeFeature(path.join(dir, file), library(steps));
}
