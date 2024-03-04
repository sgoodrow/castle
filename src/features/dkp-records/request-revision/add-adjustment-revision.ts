import { capitalize } from "lodash";
import { castledkp } from "../../../services/castledkp";
import { RaidReport } from "../raid-report";
import { RaidReportRevision } from "./raid-report-revision";

export class AddAdjustmentRevision extends RaidReportRevision {
  protected async execute(raid: RaidReport) {
    const { player, value, reason } = await this.validateArgs();
    raid.addAdjustment({ player, value, reason });
  }

  protected async validateArgs() {
    const [valueString, playerRaw, ...reasonWords] = this.args;
    if (!playerRaw) {
      throw this.getFormatError("missing player name");
    }
    const value = Number(valueString);
    if (Number.isNaN(value)) {
      throw this.getFormatError("invalid adjustment value");
    }
    const reason = reasonWords.join(" ");
    if (!reason) {
      throw this.getFormatError("missing reason");
    }
    const player = capitalize(playerRaw);
    await castledkp.getCharacter(player);
    return {
      player,
      value,
      reason,
    };
  }
}
