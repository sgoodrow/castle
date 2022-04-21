import { Client } from "discord.js";
import { updateBankRequestInfo } from "../features/bank-request-info/update-action";

export const readyListener = async (client: Client) => {
  [updateBankRequestInfo(client)];
};
