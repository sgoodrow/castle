import { Client } from "discord.js";
import { updateBankRequestInfo } from "../features/bank-request-info/update-action";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

const updateOptions = { repeatDuration: 1 * HOURS };

export const readyListener = async (client: Client) => {
  [updateBankRequestInfo(client, updateOptions)];
};
