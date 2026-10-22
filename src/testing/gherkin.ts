// Runs a .feature as vitest tests: each scenario, with its Background and each row of its Examples,
// is one test, and each step is matched against a step library. The bot's features
// (src/bot-features) and the bank web server's (src/web/features) each bring their own library,
// stand-ins and hooks.
import {
  AstBuilder,
  GherkinClassicTokenMatcher,
  Parser,
  compile,
} from "@cucumber/gherkin";
import { IdGenerator, type PickleStep } from "@cucumber/messages";
import { readdirSync, readFileSync } from "fs";
import path from "path";

// A step gets its pattern's groups, then its table (one object per row, keyed by the header) or doc
// string, if it has one.
export type Step = (...args: never[]) => unknown;
export type DefineStep = (pattern: RegExp, fn: Step) => void;
export type Library = [RegExp, Step][];

export const library = (steps: (s: { defineStep: DefineStep }) => void) => {
  const found: Library = [];
  steps({ defineStep: (re, fn) => void found.push([re, fn]) });
  return found;
};

async function runStep(steps: Library, { text, argument }: PickleStep) {
  const hits = steps.flatMap(([re, fn]) => {
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

// The feature at this absolute path, as a describe of its scenarios.
export function describeFeature(uri: string, steps: Library) {
  const newId = IdGenerator.uuid();
  const doc = new Parser(
    new AstBuilder(newId),
    new GherkinClassicTokenMatcher()
  ).parse(readFileSync(uri, "utf-8"));
  const pickles = compile(doc, uri, newId);

  describe(`Feature: ${doc.feature?.name}`, () => {
    const seen: Record<string, number> = {};
    for (const pickle of pickles) {
      const n = (seen[pickle.name] = (seen[pickle.name] ?? 0) + 1);
      test(n > 1 ? `${pickle.name} (example ${n})` : pickle.name, async () => {
        for (const step of pickle.steps) await runStep(steps, step);
      });
    }
  });
}

// Every .feature under dir, at any depth, as paths relative to it.
const featuresUnder = (dir: string, within = ""): string[] =>
  readdirSync(path.join(dir, within), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(within, e.name);
    if (e.isDirectory())
      return e.name === "node_modules" ? [] : featuresUnder(dir, rel);
    return e.name.endsWith(".feature") ? [rel] : [];
  });

// Each .feature under dir runs from a <name>.test.ts beside it; one without it would never run.
export function expectEveryFeatureRuns(dir: string) {
  test.each(featuresUnder(dir))(
    "%s has a test file that runs it",
    (feature) => {
      const testFile = path.join(
        dir,
        feature.replace(/\.feature$/, ".test.ts")
      );
      let text = `no ${testFile}`;
      try {
        text = readFileSync(testFile, "utf-8");
      } catch {
        // The expectation below names the missing file.
      }
      expect(text).toContain(`"./${path.basename(feature)}"`);
    }
  );
}
