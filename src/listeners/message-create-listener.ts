import { Message } from "discord.js";
import { tryCreateRaidReportThreadAction } from "../features/dkp-records/create/create-raid-report-thread";
import { tryRaidBonusMessageAction } from "../features/dkp-records/request-bonus/request-bonus-message-action";
import { tryRaidReportRevisionMessageAction } from "../features/dkp-records/request-revision/raid-report-revision-message-action";
import { tryParseInventoryAction } from "../features/bank-inventory/actions/inventory-file-action";
const messageActions = [
  tryCreateRaidReportThreadAction,
  tryRaidReportRevisionMessageAction,
  tryRaidBonusMessageAction,
  tryParseInventoryAction,
];

export const messageCreateListener = async (reaction: Message) => {
  messageActions.forEach((ma) => ma(reaction));
};
