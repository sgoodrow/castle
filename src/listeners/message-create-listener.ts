import { Message } from "discord.js";
import { tryCreateRaidReportThreadAction } from "../features/dkp-records/create/create-raid-report-thread";
import { tryVerifyRaidEditMessageAction } from "../features/dkp-records/request-edit/verify-action";

const messageActions = [
  tryCreateRaidReportThreadAction,
  tryVerifyRaidEditMessageAction,
];

export const messageCreateListener = async (reaction: Message) => {
  messageActions.forEach((ma) => ma(reaction));
};
