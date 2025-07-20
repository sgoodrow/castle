import { ChannelType, GuildMember, PartialGuildMember } from "discord.js";
import moment from "moment";
import { membersAndAlliesRoleId, removedChannelId } from "../../config";

export const guildMemberLeaveListener = async (member: GuildMember | PartialGuildMember) => {
  // Verify they're a member
  if (!member.roles.cache.has(membersAndAlliesRoleId)) {
    return;
  }

  const channel = member.guild.channels.cache.get(removedChannelId);
  if (channel?.type !== ChannelType.GuildText) {
    throw new Error(`${removedChannelId} is not a text channel.`);
  }

  const duration = moment(member.joinedAt).fromNow(true);
  const name = `**${member.displayName}** (<@${member.id}>) left Discord after ${duration}.`;

  // get info
  const roles = member.roles.cache
    .filter((r) => r.name !== "@everyone")
    .map((r) => `<@&${r.id}>`)
    .join(", ");

  // post it
  const message = await channel.send(name);
  await message.edit(`${name}
${roles}`);

  // turn message into a threadgit pul
  await message.startThread({
    name: `${member.displayName}`,
    autoArchiveDuration: 60,
  });
};
