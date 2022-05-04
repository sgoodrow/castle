import { GuildMember } from "discord.js";
import { gatehouseChannelId } from "../config";

export const guildMemberAddListener = async (member: GuildMember) => {
  const channel = member.guild.channels.cache.get(gatehouseChannelId);
  if (!channel?.isText()) {
    throw new Error(`${gatehouseChannelId} is not a text channel.`);
  }

  channel.send(
    `Hello ${member}! Please set your nickname to your in-game name and tell us your server and guild (if you have one).`
  );
};
