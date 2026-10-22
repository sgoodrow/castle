// Each .feature runs from its own <name>.test.ts (see runFeature.ts); one without it would never run.
import { readdirSync, readFileSync } from "fs";
import path from "path";

const features = readdirSync(__dirname).filter((f) => f.endsWith(".feature"));

test.each(features)("%s has a test file that runs it", (feature) => {
  const testFile = path.join(
    __dirname,
    feature.replace(/\.feature$/, ".test.ts")
  );
  let text = `no ${testFile}`;
  try {
    text = readFileSync(testFile, "utf-8");
  } catch {
    // The expectation below names the missing file.
  }
  expect(text).toContain(`runFeature("./${feature}")`);
});
