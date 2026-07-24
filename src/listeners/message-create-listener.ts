import { Message } from "discord.js";
import { tryCreateRaidReportThreadAction } from "../features/dkp-records/create/create-raid-report-thread";
import { tryRaidBonusMessageAction } from "../features/dkp-records/request-bonus/request-bonus-message-action";
import { tryRaidReportRevisionMessageAction } from "../features/dkp-records/request-revision/raid-report-revision-message-action";
import { tryParseInventoryAction } from "../features/bank-inventory/actions/inventory-file-action";
import { buildTodAdapter } from "../features/spawn-timers/commands/prefix-adapter";
import { todCommand } from "../features/spawn-timers/commands/tod";
import { tryEqnotifyDispatchAction } from "../features/eqnotify/eqnotify-message-action";

const messageActions = [
  tryCreateRaidReportThreadAction,
  tryRaidReportRevisionMessageAction,
  tryRaidBonusMessageAction,
  tryParseInventoryAction,
];

export const messageCreateListener = async (message: Message) => {
  // EQNotify must run before the bot-author guard: castle posts batphones
  // itself (via /bp send), so the watched messages are bot-authored.
  tryEqnotifyDispatchAction(message);

  if (message.author.bot) {
    return;
  }

  const lowerContent = message.content.toLowerCase();
  if (lowerContent === "!tod" || lowerContent.startsWith("!tod ")) {
    try {
      const adapter = buildTodAdapter(message);
      await todCommand.execute(adapter as any);
    } catch (error) {
      console.error(`!tod ${error}`);
      await message.reply(String(error));
    }
    return;
  }

  messageActions.forEach((ma) => ma(message));
};
