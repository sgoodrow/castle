import { Client, GuildMember } from "discord.js";
import { raiderEnlistedThreadId } from "../../config";

export const recordRaiderEnlisted = async (
  client: Client,
  member: GuildMember
) => {
  const channel = await client.channels.fetch(raiderEnlistedThreadId);
  if (!channel) {
    throw new Error("Could not locate the raider enlisted dump channel");
  }
  if (!channel.isText()) {
    throw new Error(`${raiderEnlistedThreadId} is not a text channel.`);
  }

  const name = `**${member.displayName}** (<@${member.id}>) is now a raider.`;

  // get info
  const roles = member.roles.cache
    .filter((r) => r.name !== "@everyone")
    .map((r) => `<@&${r.id}>`)
    .join(", ");

  await channel.send(`${name}
${roles}`);
};
