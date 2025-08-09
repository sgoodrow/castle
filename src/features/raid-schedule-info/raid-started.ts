import { Client, GuildScheduledEvent, EmbedBuilder, ChannelType } from "discord.js";
import { startedRaidsDumpThreadId } from "../../config";
import { EventRenderer } from "./event-renderer";

export const recordRaidStarted = async (client: Client, raid: GuildScheduledEvent) => {
  const channel = await client.channels.fetch(startedRaidsDumpThreadId);
  if (!channel) {
    throw new Error("Could not locate the started raids dump channel");
  }
  if (channel.type !== ChannelType.PublicThread) {
    throw new Error(`${startedRaidsDumpThreadId} is not a text channel.`);
  }

  await channel.send({
    embeds: [
      new EmbedBuilder({
        description: new EventRenderer(raid).toString(),
      }),
    ],
  });
};
