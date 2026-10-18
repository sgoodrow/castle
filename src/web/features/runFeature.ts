// Runs one .feature here: each step is matched against the step library in steps.ts. Each feature has
// its own <name>.test.ts that calls this, so vitest runs the features side by side in their own
// processes. The database and dotenv are the only modules stood in for: the bank's slots come from
// each scenario, and a developer's .env never leaks into a run.
import {
  AstBuilder,
  GherkinClassicTokenMatcher,
  Parser,
  compile,
} from "@cucumber/gherkin";
import { IdGenerator, type PickleStep } from "@cucumber/messages";
import { readFileSync } from "fs";
import path from "path";
import {
  exit,
  findMany,
  outside,
  reset,
  steps,
  teardown,
  type Step,
} from "./steps";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({ slot: { findMany: () => findMany() } })),
}));
vi.mock("dotenv", () => {
  const config = vi.fn();
  return { default: { config }, config };
});

const library: [RegExp, Step][] = [];
steps({ defineStep: (re, fn) => void library.push([re, fn]) });

// A step's arguments are its pattern's groups, then its table (one object per row, keyed by the
// header) or doc string, if it has one.
async function runStep({ text, argument }: PickleStep) {
  const hits = library.flatMap(([re, fn]) => {
    const m = text.match(re);
    return m ? [{ fn, args: m.slice(1) }] : [];
  });
  const [hit, ...more] = hits;
  if (!hit || more.length)
    throw new Error(
      `${hit ? "More than one step matches" : "No step matches"}: ${text}`
    );
  const [header = [], ...rows] = (argument?.dataTable?.rows ?? []).map((r) =>
    r.cells.map((c) => c.value)
  );
  const table = rows.map((r) =>
    Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""]))
  );
  const doc = argument?.docString?.content;
  // Text can only say what a step takes at run time: a step given the wrong arguments fails its scenario.
  await (hit.fn as (...args: unknown[]) => unknown)(
    ...hit.args,
    ...(argument?.dataTable ? [table] : []),
    ...(doc != null ? [doc] : [])
  );
}

// Each scenario, with its Background and each row of its Examples, is one test. The path is
// relative to this folder.
export function runFeature(file: string) {
  vi.setConfig({ testTimeout: 20000 });
  const uri = path.join(__dirname, file);
  const newId = IdGenerator.uuid();
  const doc = new Parser(
    new AstBuilder(newId),
    new GherkinClassicTokenMatcher()
  ).parse(readFileSync(uri, "utf-8"));
  const pickles = compile(doc, uri, newId);

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

  describe(`Feature: ${doc.feature?.name}`, () => {
    const seen: Record<string, number> = {};
    for (const pickle of pickles) {
      const n = (seen[pickle.name] = (seen[pickle.name] ?? 0) + 1);
      test(n > 1 ? `${pickle.name} (example ${n})` : pickle.name, async () => {
        for (const step of pickle.steps) await runStep(step);
      });
    }
  });
}
