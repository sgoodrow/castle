// Runs the web process's features. The database and dotenv are the only modules stood in for:
// the bank's slots come from each scenario, and a developer's .env never leaks into a run.
import { autoBindSteps, loadFeatures } from "jest-cucumber";
import { exit, findMany, outside, reset, steps, teardown } from "./steps";

const mockFindMany = () => findMany();
jest.mock("@prisma/client", () => ({ PrismaClient: jest.fn(() => ({ slot: { findMany: () => mockFindMany() } })) }));
jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.setTimeout(20000);

const savedEnv = { ...process.env };
beforeAll(() => {
  jest.spyOn(global, "fetch").mockImplementation(outside);
  jest.spyOn(process, "exit").mockImplementation(exit as typeof process.exit);
});
beforeEach(reset);
afterAll(async () => {
  await teardown();
  process.env = savedEnv;
});

autoBindSteps(loadFeatures("src/web/features/*.feature"), [steps]);
