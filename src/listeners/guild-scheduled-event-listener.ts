import { client } from "..";
import { updateRaidSchedule } from "../features/raid-schedule-info/update-action";
import { updateOptions } from "./ready-listener";

const actions = [updateRaidSchedule];

export const guildScheduledEventListener = async () => {
  actions.forEach((a) => a(client, updateOptions));
};
