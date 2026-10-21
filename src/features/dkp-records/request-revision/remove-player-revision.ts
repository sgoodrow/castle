import { capitalize, some } from "lodash";
import { RaidReport } from "../raid-report";
import { PlayerArgs, RaidReportRevision } from "./raid-report-revision";
import { openDkpService } from "../../../services/openDkpService";

export class RemovePlayerRevision extends RaidReportRevision<PlayerArgs> {
  protected execute(raid: RaidReport, { player, tickNumbers }: PlayerArgs) {
    raid.removePlayer(player, tickNumbers);
  }

  protected async validateArgs() {
    const [playerRaw, ...ticks] = this.args;
    if (!playerRaw) {
      throw this.getFormatError("missing player name");
    }
    const tickNumbers = ticks.map((t) => Number(t.replace(",", "")));
    if (!tickNumbers.length) {
      throw this.getFormatError("missing tick number(s)");
    }
    if (tickNumbers.length > 0 && some(tickNumbers, (t) => Number.isNaN(t))) {
      throw this.getFormatError("invalid tick numbers");
    }
    const player = capitalize(playerRaw);
    await openDkpService.getCharacter(player, false);
    return { player, tickNumbers };
  }
}
