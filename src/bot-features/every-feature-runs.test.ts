// Each .feature in src runs from its own <name>.test.ts (see runFeature.ts); the bot's features sit
// beside the code they describe, and the web's beside theirs. One without a test would never run.
import path from "path";
import { expectEveryFeatureRuns } from "../testing/gherkin";

expectEveryFeatureRuns(path.resolve(__dirname, ".."));
