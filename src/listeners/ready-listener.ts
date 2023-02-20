import { Client } from "discord.js";
import { updateBankRequestInfo } from "../features/bank-request-info/update-action";
import { updateInviteListInfo } from "../features/invite-list/update-invite-action";
import { updateJewelryRequestInfo } from "../features/jewelry-request-info/update-action";
import { updateKnightInfo } from "../features/raider-enlistment/update-knight-action";
import { updateRaiderInfo } from "../features/raider-enlistment/update-raider-action";
import { updateReinforcementInfo } from "../features/raider-enlistment/update-reinforcement-action";
import { updateGuardInfo } from "../features/applications/update-guard-action";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

const updateOptions = { repeatDuration: 1 * HOURS };

export const readyListener = async (client: Client) => {
  [
    updateBankRequestInfo(client, updateOptions),
    updateGuardInfo(client, updateOptions),
    updateInviteListInfo(client, updateOptions),
    updateJewelryRequestInfo(client, updateOptions),
    updateKnightInfo(client, updateOptions),
    updateRaiderInfo(client, updateOptions),
    updateReinforcementInfo(client, updateOptions),
  ];
};
