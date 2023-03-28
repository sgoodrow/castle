import { Message } from "discord.js";
import { tryCreateRaidReportThreadAction } from "../features/dkp-records/create/create-raid-report-thread";
import { tryRaidBonusMessageAction } from "../features/dkp-records/request-bonus/request-bonus-message-action";
import { tryRaidReportRevisionMessageAction } from "../features/dkp-records/request-revision/raid-report-revision-message-action";

const messageActions = [
  tryCreateRaidReportThreadAction,
  tryRaidReportRevisionMessageAction,
  tryRaidBonusMessageAction,
];

export const messageCreateListener = async (reaction: Message) => {
  messageActions.forEach((ma) => ma(reaction));
};
