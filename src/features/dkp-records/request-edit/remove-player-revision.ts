import { some } from "lodash";
import { RaidReport } from "../raid-report";
import { RaidReportRevision } from "./raid-report-revision";

export class RemovePlayerRevision extends RaidReportRevision {
  protected execute(raid: RaidReport) {
    const { player, tickNumbers } = this.validateArgs();
    raid.removePlayer(player, tickNumbers);
  }

  protected validateArgs() {
    const [player, ...ticks] = this.args;
    if (!player) {
      throw this.getFormatError("missing player name");
    }
    const tickNumbers = ticks.map((t) => Number(t.replace(",", "")));
    if (tickNumbers.length > 0 && some(tickNumbers, (t) => Number.isNaN(t))) {
      throw this.getFormatError("invalid tick numbers");
    }
    return { player, tickNumbers };
  }
}
