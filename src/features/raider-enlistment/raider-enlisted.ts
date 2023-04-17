import { ChannelType, Client, GuildMember } from "discord.js";
import { raiderEnlistedThreadId } from "../../config";

export const recordRaiderEnlisted = async (
  client: Client,
  member: GuildMember
) => {
  const channel = await client.channels.fetch(raiderEnlistedThreadId);
  if (!channel) {
    throw new Error("Could not locate the raider enlisted dump channel");
  }
  if (channel.type !== ChannelType.PublicThread) {
    throw new Error(`${raiderEnlistedThreadId} is not a text channel.`);
  }

  const name = `**${member.displayName}** (<@${member.id}>) is now a raider.`;

  // send message
  const message = await channel.send("New raider added!");

  // edit in roles (silent)
  await message.edit(`${name}`);
};
