import { Message } from "discord.js";
import { tryCreateRaidReportThreadAction } from "../features/dkp-records/create-raid-report-thread";

const messageActions = [tryCreateRaidReportThreadAction];

export const messageCreateListener = async (reaction: Message) => {
  messageActions.forEach((ma) => ma(reaction));
};
