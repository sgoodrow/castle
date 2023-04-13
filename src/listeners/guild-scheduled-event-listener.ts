import { GuildScheduledEvent, GuildScheduledEventStatus } from "discord.js";
import { client } from "..";
import { recordRaidStarted } from "../features/raid-schedule-info/raid-started";
import { updateRaidSchedule } from "../features/raid-schedule-info/update-action";
import { updateOptions } from "./ready-listener";

const actions = [updateRaidSchedule];

export const guildScheduledEventListener = async () => {
  actions.forEach((a) => a(client, updateOptions));
};

export const guildScheduledEventStartedListener = async (
  before: GuildScheduledEvent | null,
  after: GuildScheduledEvent
) => {
  // run on status changes
  if (before?.status === after.status) {
    return;
  }
  // run when its completed or canceled
  if (
    [
      GuildScheduledEventStatus.Completed,
      GuildScheduledEventStatus.Canceled,
    ].includes(after.status)
  ) {
    recordRaidStarted(client, after);
  }
};
