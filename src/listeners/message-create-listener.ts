import { Message } from "discord.js";
import { tryCreateRaidReportThreadAction } from "../features/dkp-records/create/create-raid-report-thread";
import { tryRaidReportRevisionMessageAction } from "../features/dkp-records/request-revision/raid-report-revision-message-action";

const messageActions = [
  tryCreateRaidReportThreadAction,
  tryRaidReportRevisionMessageAction,
];

export const messageCreateListener = async (reaction: Message) => {
  messageActions.forEach((ma) => ma(reaction));
};
