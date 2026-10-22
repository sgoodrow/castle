// Each .feature runs from its own <name>.test.ts (see runFeature.ts); one without it would never run.
import { expectEveryFeatureRuns } from "../../testing/gherkin";

expectEveryFeatureRuns(__dirname);
