// Runs one .feature here: each step is matched against the step library in steps.ts. Each feature has
// its own <name>.test.ts that calls this, so vitest runs the features side by side in its workers.
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { reset, runStep } from "./steps";

type Outline = { examples?: unknown; getStepDocStrings(step: unknown, example: Record<string, string>): string | null };
const fill = (s: string, ex?: Record<string, string>) => (ex ? s.replace(/<([^<>]+)>/g, (m, k) => ex[k] ?? m) : s);

// The path is relative to this folder.
export async function runFeature(path: string) {
  const feature = await loadFeature(path);
  describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario }) => {
    BeforeEachScenario(reset);
    for (const scenario of feature.scenarii) {
      const outline = "examples" in scenario ? (scenario as unknown as Outline) : null;
      const define = outline ? ScenarioOutline : Scenario;
      define(scenario.description, (steps, example?: Record<string, string>) => {
        for (const step of scenario.steps) {
          steps[step.type](step.details, () => runStep(fill(step.details, example), {
            table: step.dataTables.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, fill(v, example)]))),
            doc: outline && example ? outline.getStepDocStrings(step, example) : step.docStrings,
          }));
        }
      });
    }
  });
}
