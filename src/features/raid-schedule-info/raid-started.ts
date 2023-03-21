import { Client, GuildScheduledEvent } from "discord.js";
import { startedRaidsDumpThreadId } from "../../config";
import { compactDescription } from "../../shared/util";

export const recordRaidStarted = async (
  client: Client,
  raid: GuildScheduledEvent
) => {
  const channel = await client.channels.fetch(startedRaidsDumpThreadId);
  if (!channel) {
    throw new Error("Could not locate the started raids dump channel");
  }
  if (!channel.isText()) {
    throw new Error(`${startedRaidsDumpThreadId} is not a text channel.`);
  }

  const description = raid.description
    ? ` ${compactDescription(raid.description)}`
    : "";

  await channel.send(
    `**${raid.name}** <t:${Math.floor(
      (raid.scheduledStartTimestamp || 0) / 1000
    )}:F> ${description}`
  );
};
