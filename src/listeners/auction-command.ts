import {
  CacheType,
  Collection,
  CommandInteraction,
  Message,
  Role,
} from "discord.js";
import { raiderRoleId } from "../config";
import { Command } from "./command";

const EMBED_CHAR_LIMIT = 6000;
const USER_ID_CHAR_SIZE = 18;
const SPACE_CHAR_SIZE = 1;
const BUFFER_CHAR_SIZE = 4;
const USER_MENTION_CHAR_SIZE =
  USER_ID_CHAR_SIZE + SPACE_CHAR_SIZE + BUFFER_CHAR_SIZE;

export enum AuctionOption {
  Name = "name",
  Count = "count",
}

export abstract class AuctionCommand extends Command {
  protected async addRoleMembersToThread(
    message: Message<boolean>,
    interaction: CommandInteraction<CacheType>,
    roles: Collection<string, Role>,
    requireRaiders: boolean
  ) {
    const content = message.content;
    const everyone = await interaction.guild?.members.fetch();
    const members = requireRaiders
      ? everyone?.filter((m) => m.roles.cache.has(raiderRoleId))
      : everyone;
    const usersToAdd = members
      ?.filter((m) => m.roles.cache.has(raiderRoleId))
      .filter((m) => m.roles.cache.hasAny(...roles.map((r) => r.id)));

    if (!usersToAdd) {
      return;
    }

    // Iteratively edit user mentions into the thread in batches that do
    // not exceed the embed character limit.
    const ids = usersToAdd.map((f) => f.id);
    const batchSize = Math.floor(
      EMBED_CHAR_LIMIT - content.length / USER_MENTION_CHAR_SIZE
    );
    for (let i = 0; i < ids.length; i += batchSize) {
      await message.edit(`${content}
${ids
  .slice(i, i + batchSize)
  .map((userId) => `<@${userId}>`)
  .join(" ")}`);
    }

    // Edit the message back to normal
    await message.edit(content);
  }
}
