import { GuildScheduledEvent } from "discord.js";
import { client } from "..";
import { recordRaidStarted } from "../features/raid-schedule-info/raid-started";
import { updateRaidSchedule } from "../features/raid-schedule-info/update-action";
import { updateOptions } from "./ready-listener";

const actions = [updateRaidSchedule];

export const guildScheduledEventListener = async () => {
  actions.forEach((a) => a(client, updateOptions));
};

export const guildScheduledEventStartedListener = async (
  before: GuildScheduledEvent,
  after: GuildScheduledEvent
) => {
  if (before.status === after.status || after.status !== "ACTIVE") {
    return;
  }
  recordRaidStarted(client, after);
};
