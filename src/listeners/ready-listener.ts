import { Client } from "discord.js";
import { updateBankRequestInfo } from "../features/bank-request-info/update-action";
import { updateInviteListInfo } from "../features/invite-list/update-invite-action";
import { updateJewelryRequestInfo } from "../features/jewelry-request-info/update-action";
import { updateRaiderInfo } from "../features/raider-enlistment/update-raider-action";
import { updateReinforcementInfo } from "../features/raider-enlistment/update-reinforcement-action";
import { updateApplicationInfo as updateApplicationInfo } from "../features/applications/update-applications";
import { updateRaidSchedule } from "../features/raid-schedule-info/update-action";
import {
  updateBankBotInfo,
  updateGuardBotInfo,
  updateRaidBotsInfo,
} from "../features/raid-bots/update-bots";
import { HOURS } from "../shared/time";

export const updateOptions = { repeatDuration: 1 * HOURS };

export const readyListener = async (client: Client) => {
  [
    updateRaidSchedule(client, updateOptions),
    updateBankRequestInfo(client, updateOptions),
    updateApplicationInfo(client, updateOptions),
    updateRaidBotsInfo(updateOptions),
    updateBankBotInfo(updateOptions),
    updateGuardBotInfo(updateOptions),
    updateInviteListInfo(client, updateOptions),
    updateJewelryRequestInfo(client, updateOptions),
    updateRaiderInfo(client, updateOptions),
    updateReinforcementInfo(client, updateOptions),
  ];
};
