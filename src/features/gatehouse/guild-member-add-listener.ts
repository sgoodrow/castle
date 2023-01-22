import { GuildMember } from "discord.js";
import { gatehouseChannelId } from "../../config";

export const guildMemberAddListener = async (member: GuildMember) => {
  const channel = member.guild.channels.cache.get(gatehouseChannelId);
  if (!channel?.isText()) {
    throw new Error(`${gatehouseChannelId} is not a text channel.`);
  }

  // ensure the user has loaded in before sending the message, since they can't
  // see channel history by default
  await new Promise((r) => setTimeout(r, 1000));

  channel.send(
    `Hail ${member}! Well met. ${greetingActivity}`
  );
};

export const greetingActivity = `Do the following:
1. Set your nickname to your in-game name (right-click your own name to set it).
2. Tell us your current guild (or none if you're joining)`
