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
  // run on status changes
  if (before.status === after.status) {
    return;
  }
  // run when its completed or canceled
  if (["COMPLETED", "CANCELED"].includes(after.status)) {
    recordRaidStarted(client, after);
  }
};
