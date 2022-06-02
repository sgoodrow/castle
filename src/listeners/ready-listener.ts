import { Client } from "discord.js";
import { updateBankRequestInfo } from "src/features/bank-request-info/update-action";
import { updateGuardInfo } from "src/features/invite-list/update-guard-action";
import { updateInviteListInfo } from "src/features/invite-list/update-invite-action";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

const updateOptions = { repeatDuration: 1 * HOURS };

export const readyListener = async (client: Client) => {
  [
    updateBankRequestInfo(client, updateOptions),
    updateGuardInfo(client, updateOptions),
    updateInviteListInfo(client, updateOptions),
  ];
};
