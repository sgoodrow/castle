import { capitalize } from "lodash";
import { castledkp } from "../../../services/castledkp";
import { RaidBonusRequest } from "./raid-bonus-request";

export class AddAdjustmentBonus extends RaidBonusRequest {
  protected async execute(raidId: number) {
    const adjustment = await this.validateArgs();
    await castledkp.addAdjustment(raidId, adjustment);
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
    await castledkp.getCharacter(player);
    return {
      player,
      value,
      reason,
    };
  }
}
