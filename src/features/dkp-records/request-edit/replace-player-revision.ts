import { some } from "lodash";
import { RaidReport } from "../raid-report";
import { RaidReportRevision } from "./raid-report-revision";

const verbs = ["on", "with"];

export class ReplacePlayerRevision extends RaidReportRevision {
  protected execute(raid: RaidReport) {
    const { replacer, replaced, tickNumbers } = this.validateArgs();
    raid.replacePlayer(replacer, replaced, tickNumbers);
  }

  protected validateArgs() {
    const [replacer, verb, replaced, ...ticks] = this.args;
    if (!replacer) {
      throw this.getFormatError("missing replacer name");
    }
    if (!verbs.includes(verb)) {
      throw this.getFormatError("missing 'with' keyword");
    }
    if (!replaced) {
      throw this.getFormatError("missing replacement name");
    }
    const tickNumbers = ticks.map((t) => Number(t.replace(",", "")));
    if (tickNumbers.length > 0 && some(tickNumbers, (t) => Number.isNaN(t))) {
      throw this.getFormatError("invalid tick numbers");
    }
    return { replacer, replaced, tickNumbers };
  }
}
