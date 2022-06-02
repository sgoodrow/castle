import { GuildMember } from "discord.js";
import { gatehouseChannelId } from "../config";

export const guildMemberAddListener = async (member: GuildMember) => {
  const channel = member.guild.channels.cache.get(gatehouseChannelId);
  if (!channel?.isText()) {
    throw new Error(`${gatehouseChannelId} is not a text channel.`);
  }

  // ensure the user has loaded in before sending the message, since they can't
  // see channel history by default
  await new Promise((r) => setTimeout(r, 1000));

  channel.send(
    `Hello ${member}! Please right-click your own name to set your nickname to your in-game name and tell us both your server and guild (if you have one).`
  );
};
