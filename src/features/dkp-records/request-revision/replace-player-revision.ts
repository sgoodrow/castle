import { capitalize, some } from "lodash";
import { RaidReport } from "../raid-report";
import { RaidReportRevision } from "./raid-report-revision";
import { openDkpService } from "../../../services/openDkpService";

const verbs = ["on", "with"];

export class ReplacePlayerRevision extends RaidReportRevision {
  protected async execute(raid: RaidReport) {
    const { replacer, replaced, tickNumbers } = await this.validateArgs();
    raid.replacePlayer(replacer, replaced, tickNumbers);
  }

  protected async validateArgs() {
    const [replacedRaw, verb, replacerRaw, ...ticks] = this.args;
    if (!replacerRaw) {
      throw this.getFormatError("missing replacer name");
    }
    if (!verbs.includes(verb)) {
      throw this.getFormatError("missing 'with' keyword");
    }
    if (!replacedRaw) {
      throw this.getFormatError("missing replacement name");
    }
    const tickNumbers = ticks.map((t) => Number(t.replace(",", "")));
    if (tickNumbers.length > 0 && some(tickNumbers, (t) => Number.isNaN(t))) {
      throw this.getFormatError("invalid tick numbers");
    }
    const replaced = capitalize(replacedRaw);
    await openDkpService.getCharacter(replaced, false);
    const replacer = capitalize(replacerRaw);
    await openDkpService.getCharacter(replacer, false);
    return {
      replacer,
      replaced,
      tickNumbers,
    };
  }
}
