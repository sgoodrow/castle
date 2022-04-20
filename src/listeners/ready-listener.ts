import { Client } from "discord.js";
import { bankRequestReadyListener } from "../features/bank-request-info/ready-listener";

export const readyListener = async (client: Client) => {
  [bankRequestReadyListener(client)];
};
