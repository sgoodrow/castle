// Each .feature runs from its own <name>.test.ts (see runFeature.ts); one without it would never run.
import { expect, test } from "vitest";

const features = Object.keys(import.meta.glob("./*.feature"));
const tests = import.meta.glob<string>("./*.test.ts", { query: "?raw", import: "default", eager: true });

test.each(features)("%s has a test file that runs it", feature => {
  const testFile = feature.replace(/\.feature$/, ".test.ts");
  expect(tests[testFile] ?? `no ${testFile}`).toContain(`runFeature("${feature}")`);
});
