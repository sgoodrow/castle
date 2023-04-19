import {
  AutocompleteInteraction,
  ButtonInteraction,
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  PermissionResolvable,
  ThreadChannel,
} from "discord.js";
import { getMembers, getRoles } from "../..";

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

export const fetchRole = async (
  interaction: CommandInteraction<CacheType>,
  roleId: string
) => {
  const roles = await interaction.guild?.roles.fetch();
  const role = roles?.filter((r) => r.id === roleId);
  if (!role) {
    throw new Error("Could not find the specified role.");
  }
  return role;
};

const MESSAGE_CHAR_LIMIT = 1800;

export const listThreadMembers = async (
  interaction: CommandInteraction<CacheType>
) => {
  if (!interaction.channel?.isThread()) {
    throw new Error(`Channel is not a thread.`);
  }

  const membersManager = interaction.channel.members;
  await membersManager.fetch();

  const everyone = await interaction.guild?.members.fetch();
  const usersToList = everyone?.filter((m) => membersManager.cache.has(m.id));

  if (!usersToList) {
    return;
  }

  // Iteratively send messages into the thread in batches that do
  // not exceed the message character limit.
  const names = usersToList.map((f) => ` @${f.displayName}`);
  const ids = usersToList.map((f) => ` <@${f.id}>`);
  let i = 0;

  // Both the message sent (with IDs) and the message drawn (with display names) must
  // be under 2000 characters (I think). Ensure it is.
  let contentActual = "";
  let contentSent = "";
  while (i < names.length) {
    const actual = names[i].length > ids[i].length ? names[i] : ids[i];
    if (contentActual.length + actual.length < MESSAGE_CHAR_LIMIT - 2) {
      contentActual += actual;
      contentSent += ids[i];
    } else {
      const message = await interaction.channel.send("Temporary message");
      await message.edit(`\`${contentSent}\``);
      contentActual = actual;
      contentSent = ids[i];
    }
    i++;
  }

  // Final add
  const message = await interaction.channel.send("Temporary message");
  await message.edit(`\`${contentSent}\``);

  return names.length;
};

export const addRoleToThread = async (
  roleId: string,
  channel: ThreadChannel
) => {
  const roles = await getRoles();
  const everyone = await getMembers();
  const message = await channel.send("Temporary message.");

  const members = everyone?.filter((m) => m.roles.cache.has(roleId));
  const usersToAdd = members
    ?.filter((m) => m.roles.cache.has(roleId))
    .filter((m) => m.roles.cache.hasAny(...roles.map((r) => r.id)));

  if (!usersToAdd) {
    return;
  }

  // Iteratively edit user mentions into the thread in batches that do
  // not exceed the message character limit.
  const names = usersToAdd.map((f) => ` @${f.displayName}`);
  const ids = usersToAdd.map((f) => ` <@${f.id}>`);
  let i = 0;

  // Both the message sent (with IDs) and the message drawn (with display names) must
  // be under 2000 characters (I think). Ensure it is.
  let contentActual = "";
  let contentSent = "";
  while (i < names.length) {
    const actual = names[i].length > ids[i].length ? names[i] : ids[i];
    if (contentActual.length + actual.length < MESSAGE_CHAR_LIMIT) {
      contentActual += actual;
      contentSent += ids[i];
    } else {
      await message.edit(`${contentSent}`);
      contentActual = actual;
      contentSent = ids[i];
    }
    i++;
  }

  // Final add
  await message.edit(`${contentSent}`);

  // Delete the message
  await message.delete();

  return names.length;
};
