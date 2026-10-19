// Tells raid chat, where the people who edit the "Bot Info" sheet are, when the bots can't be loaded from it or some of
// its rows are skipped. It posts only when that changes: once when it breaks, once for each new set
// of skipped rows, and once when it's fixed, not on every 15-minute refresh. Without
// raidChatChannelId set, it only logs.
import { raidChatChannelId } from "../../config";
import { log } from "../../shared/logger";
import { getTextChannel } from "../..";

const SHEET = `the "Bot Info" sheet`;

const postToRaidChat = async (message: string) => {
  if (!raidChatChannelId) return;
  await (await getTextChannel(raidChatChannelId)).send(message);
};

export class BotSheetAlerts {
  private problem = ""; // what was last posted; "" while the sheet loads cleanly

  constructor(
    private post: (message: string) => Promise<void> = postToRaidChat
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
      `The bots couldn't be loaded from ${SHEET}, so bot commands are off. Fix the sheet and restart the bot ` +
        `(it also tries again every minute). The error: ${String(error).slice(0, 500)}`
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
      log(`bot sheet: couldn't tell raid chat: ${err}`);
    }
  }
}
