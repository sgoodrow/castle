// Tells raid chat, where the people who edit the "Bot Info" sheet are, when the bots can't be
// loaded from it. It posts only when that changes: once when it breaks and once when it's fixed,
// not on every retry. Without raidChatChannelId set, it only logs.
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

  loaded() {
    return this.report("");
  }

  failed(error: unknown) {
    return this.report(
      `The bots couldn't be loaded from ${SHEET}, so bot commands are off. Fix the sheet and restart the bot ` +
        `(it also tries again every minute). The error: ${String(error).slice(0, 1500)}`
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
