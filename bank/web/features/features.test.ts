// Runs every .feature here: each step is matched against the step library in steps.ts.
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { reset, runStep } from "./steps";

type Outline = { examples?: unknown; getStepDocStrings(step: unknown, example: Record<string, string>): string | null };
const fill = (s: string, ex?: Record<string, string>) => (ex ? s.replace(/<([^<>]+)>/g, (m, k) => ex[k] ?? m) : s);

for (const path of Object.keys(import.meta.glob("./*.feature"))) {
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
