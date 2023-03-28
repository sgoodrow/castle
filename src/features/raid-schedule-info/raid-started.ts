import { Client, GuildScheduledEvent, MessageEmbed } from "discord.js";
import { startedRaidsDumpThreadId } from "../../config";
import { EventRenderer } from "./event-renderer";

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

  await channel.send({
    embeds: [
      new MessageEmbed({
        description: new EventRenderer(raid).toString(),
      }),
    ],
  });
};
