import { GuildMember, PartialGuildMember } from "discord.js";
import { greenRoleId, removedChannelId } from "../../config";

export const guildMemberLeaveListener = async (
  member: GuildMember | PartialGuildMember
) => {
  console.log("detected leaver");

  // Verify they're a green member
  if (!member.roles.cache.has(greenRoleId)) {
    console.log("not green");
    return;
  }

  const channel = member.guild.channels.cache.get(removedChannelId);
  if (!channel?.isText()) {
    throw new Error(`${removedChannelId} is not a text channel.`);
  }

  const name = `**${member.displayName}** (<@${member.id}>) has left the Discord.`;

  // get info
  member.roles.cache.map((r) => console.log(r.name));

  const roles = member.roles.cache
    .filter((r) => r.name !== "@everyone")
    .map((r) => `<@&${r.id}>`)
    .join(", ");

  // post it
  const message = await channel.send(name);
  await message.edit(`${name}
${roles}`);

  // turn message into a thread
  await message.startThread({
    name: `${member.displayName}`,
    autoArchiveDuration: 60,
  });
};
