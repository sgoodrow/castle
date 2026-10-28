// Runs one .feature here: each step is matched against the step library in steps.ts. Each feature has
// its own <name>.test.ts that calls this, so vitest runs the features side by side in their own
// processes. The database and dotenv are the only modules stood in for: the bank's slots come from
// each scenario, and a developer's .env never leaks into a run.
import path from "path";
import { describeFeature, library } from "../../testing/gherkin";
import {
  exit,
  findMany,
  outside,
  reset,
  savePlan,
  steps,
  teardown,
} from "./steps";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    slot: { findMany: () => findMany() },
    bank_request_plan: { create: savePlan },
  })),
}));
vi.mock("dotenv", () => {
  const config = vi.fn();
  return { default: { config }, config };
});

// The path is relative to this folder.
export function runFeature(file: string) {
  vi.setConfig({ testTimeout: 20000 });
  const savedEnv = { ...process.env };
  beforeAll(() => {
    vi.spyOn(global, "fetch").mockImplementation(outside);
    vi.spyOn(process, "exit").mockImplementation(exit as typeof process.exit);
  });
  beforeEach(reset);
  afterAll(async () => {
    await teardown();
    process.env = savedEnv;
  });
  describeFeature(path.join(__dirname, file), library(steps));
}
