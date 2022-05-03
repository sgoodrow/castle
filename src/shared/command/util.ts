import {
  AutocompleteInteraction,
  ButtonInteraction,
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  PermissionResolvable,
} from "discord.js";

export const requireInteractionMemberRole = (
  roleId: string,
  interaction:
    | ButtonInteraction<CacheType>
    | CommandInteraction<CacheType>
    | AutocompleteInteraction<CacheType>
) => {
  const roles = interaction.member?.roles as GuildMemberRoleManager;
  if (!roles) {
    throw new Error("Could not determine your roles.");
  }
  if (!roles.cache.get(roleId)) {
    throw new Error(`Must have <@&${roleId}> role to use this command.`);
  }
};

export const requireInteractionMemberPermission = (
  permission: PermissionResolvable,
  interaction:
    | ButtonInteraction<CacheType>
    | CommandInteraction<CacheType>
    | AutocompleteInteraction<CacheType>
) => {
  if (!interaction.memberPermissions?.has(permission)) {
    throw new Error("You do not have permission to do this.");
  }
};

export const getChannel = async (
  channelId: string,
  interaction: ButtonInteraction<CacheType>
) => {
  return await interaction.guild?.channels.fetch(channelId);
};

export const getRole = (
  roleId: string,
  interaction:
    | CommandInteraction<CacheType>
    | AutocompleteInteraction<CacheType>
) => {
  return interaction.guild?.roles.cache.get(roleId);
};

export const requireUserRole = (
  userId: string,
  roleId: string,
  interaction:
    | CommandInteraction<CacheType>
    | AutocompleteInteraction<CacheType>
) => {
  const role = getRole(roleId, interaction);
  if (!role?.members.get(userId)) {
    throw new Error(`<@${userId}> is not a ${role}.`);
  }
};
