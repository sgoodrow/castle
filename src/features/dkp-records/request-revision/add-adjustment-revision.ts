import { capitalize } from "lodash";
import { RaidReport } from "../raid-report";
import { AdjustmentData } from "../raid-tick";
import { RaidReportRevision } from "./raid-report-revision";
import { openDkpService } from "../../../services/openDkpService";

export class AddAdjustmentRevision extends RaidReportRevision<AdjustmentData> {
  protected execute(raid: RaidReport, adjustment: AdjustmentData) {
    raid.addAdjustment(adjustment);
  }

  // an adjustment isn't attendance; it's added to OpenDKP on its own when the raid is uploaded
  protected attendees() {
    return [];
  }

  protected async validateArgs() {
    const [playerRaw, valueString, ...reasonWords] = this.args;
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
    await openDkpService.getCharacter(player);
    return {
      player,
      value,
      reason,
    };
  }
}
