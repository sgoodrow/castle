import { capitalize, some } from "lodash";
import { RaidReport } from "../raid-report";
import { PlayerArgs, RaidReportRevision } from "./raid-report-revision";
import { openDkpService } from "../../../services/openDkpService";

export class AddPlayerRevision extends RaidReportRevision<PlayerArgs> {
  protected execute(raid: RaidReport, { player, tickNumbers }: PlayerArgs) {
    raid.addPlayer(player, tickNumbers);
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
    await openDkpService.getCharacter(playerRaw, false);
    return {
      player,
      tickNumbers,
    };
  }
}
