import { GuildMember, PartialGuildMember } from "discord.js";
import { recordRaiderEnlisted } from "../features/raider-enlistment/raider-enlisted";
import { raiderRoleId } from "../config";

export const guildMemberUpdateListener = async (
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember
) => {
  const wasRaider = oldMember.roles.cache.has(raiderRoleId);
  const isRaider = newMember.roles.cache.has(raiderRoleId);
  if (!wasRaider && isRaider) {
    recordRaiderEnlisted(newMember.client, newMember);
  }
};
