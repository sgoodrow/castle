import { capitalize } from "lodash";
import { RaidReport } from "../raid-report";
import { RaidReportRevision } from "./raid-report-revision";

export class AddAdjustmentRevision extends RaidReportRevision {
  protected execute(raid: RaidReport) {
    const { player, value, reason } = this.validateArgs();
    raid.addAdjustment({ player, value, reason });
  }

  protected validateArgs() {
    const [player, valueString, ...reasonWords] = this.args;
    if (!player) {
      throw this.getFormatError("missing player name");
    }
    const value = Number(valueString);
    if (value !== 0 || Number.isNaN(value)) {
      throw this.getFormatError("invalid adjustment value");
    }
    const reason = reasonWords.join(" ");
    if (!reason) {
      throw this.getFormatError("missing reason");
    }
    return {
      player: capitalize(player),
      value,
      reason,
    };
  }
}
