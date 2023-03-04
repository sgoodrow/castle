import { some } from "lodash";
import { RaidReport } from "../raid-report";
import { Action } from "./action";

export class ReplaceAction extends Action {
  public execute(raid: RaidReport) {
    const { replacer, replaced, tickNumbers } = this.validateArgs();
    raid.replacePlayer(replacer, replaced, tickNumbers);
  }

  public validateArgs() {
    const [replacer, on, replaced, ...ticks] = this.args;
    if (!replacer) {
      throw this.getFormatError("missing replacer name");
    }
    if (on !== "on") {
      throw this.getFormatError("missing on keyword");
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
