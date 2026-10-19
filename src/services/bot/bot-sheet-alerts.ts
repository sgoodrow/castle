// Tells the knights, who edit the "Bot Info" sheet, when the bots can't be loaded from it or some of
// its rows are skipped. It posts only when that changes: once when it breaks, once for each new set
// of skipped rows, and once when it's fixed, not on every 15-minute refresh. Without
// knightChannelId set, it only logs.
import { knightChannelId } from "../../config";
import { log } from "../../shared/logger";
import { getTextChannel } from "../..";

const SHEET = `the "Bot Info" sheet`;

const postToKnights = async (message: string) => {
  if (!knightChannelId) return;
  await (await getTextChannel(knightChannelId)).send(message);
};

export class BotSheetAlerts {
  private problem = ""; // what was last posted; "" while the sheet loads cleanly

  constructor(
    private post: (message: string) => Promise<void> = postToKnights
  ) {}

  // The sheet loaded; `skipped` says which rows were left out, and why.
  loaded(skipped: string[]) {
    return this.report(
      skipped.length
        ? `Some rows of ${SHEET} were skipped, so those bots can't be requested until they're fixed:\n${skipped
            .map((s) => `• ${s}`)
            .join("\n")}`
        : ""
    );
  }

  failed(error: unknown) {
    return this.report(
      `The bots couldn't be loaded from ${SHEET}, so bot commands are using the bots as of the last good load. ` +
        `The bot tries again every 15 minutes. The error: ${String(error).slice(0, 500)}`
    );
  }

  private async report(problem: string) {
    if (problem === this.problem) return;
    const message = problem || `The bots load from ${SHEET} again.`;
    this.problem = problem;
    log(`bot sheet: ${message}`);
    try {
      await this.post(message.slice(0, 2000)); // Discord's limit for one message
    } catch (err) {
      log(`bot sheet: couldn't tell the knights: ${err}`);
    }
  }
}
