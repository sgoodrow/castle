import { capitalize, some } from "lodash";
import { castledkp } from "../../../services/castledkp";
import { RaidReport } from "../raid-report";
import { RaidReportRevision } from "./raid-report-revision";

export class RemovePlayerRevision extends RaidReportRevision {
  protected async execute(raid: RaidReport) {
    const { player, tickNumbers } = await this.validateArgs();
    raid.removePlayer(player, tickNumbers);
  }

  protected async validateArgs() {
    const [playerRaw, ...ticks] = this.args;
    if (!playerRaw) {
      throw this.getFormatError("missing player name");
    }
    const tickNumbers = ticks.map((t) => Number(t.replace(",", "")));
    if (tickNumbers.length > 0 && some(tickNumbers, (t) => Number.isNaN(t))) {
      throw this.getFormatError("invalid tick numbers");
    }
    const player = capitalize(playerRaw);
    await castledkp.getCharacter(player, false);
    return { player, tickNumbers };
  }
}
