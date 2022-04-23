import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ApplicationCommandOptionChoice,
  CacheType,
  Collection,
  CommandInteraction,
  Message,
  Role,
} from "discord.js";
import { getAuctionChannel } from "../../shared/channels";
import { bankerRoleId, raiderRoleId } from "../../config";
import { ItemAuctionThreadBuilder } from "./thread-builder";
import { Command, getOption } from "../../listeners/command";
import { itemsList } from "../../shared/items";
import { classes } from "../../shared/roles";

export enum Option {
  ItemId = "itemid",
  Count = "count",
  HeldBy = "heldby",
}

const EMBED_CHAR_LIMIT = 6000;
const USER_ID_CHAR_SIZE = 18;
const SPACE_CHAR_SIZE = 1;
const BUFFER_CHAR_SIZE = 4;
const USER_MENTION_CHAR_SIZE =
  USER_ID_CHAR_SIZE + SPACE_CHAR_SIZE + BUFFER_CHAR_SIZE;

class ItemAuctionCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    await interaction.deferReply({ ephemeral: true });
    const auctionChannel = await this.authorize(interaction);

    // send message to notify roles
    const roles = await this.getNotifyRoles(interaction);
    const message = await auctionChannel.send(
      roles.map((r) => String(r)).join(" ")
    );

    // turn message into a thread
    const builder = new ItemAuctionThreadBuilder(interaction);
    const thread = await message.startThread(builder.options);
    await message.edit(`${message.content} ${thread}`);

    // add auction message to thread
    const threadMessage = await thread.send(builder.message);

    // add raiders to thread
    await this.addRoleMembersToThread(threadMessage, interaction, roles);

    await interaction.editReply(`Started item auction thread: ${thread}`);
  }

  private async getNotifyRoles(interaction: CommandInteraction<CacheType>) {
    const roles = await interaction.guild?.roles.fetch();

    const classRoleNames = classes.filter(
      (c) => getOption(c.toLowerCase(), interaction)?.value
    );

    const notifyRoles = roles
      ?.filter((r) => classRoleNames.includes(r.name))
      .filter(Boolean);
    if (notifyRoles?.size) {
      return notifyRoles;
    }

    const raiderRole = roles?.filter((r) => r.id === raiderRoleId);
    if (!raiderRole) {
      throw new Error("No roles ");
    }
    return raiderRole;
  }

  private async addRoleMembersToThread(
    message: Message<boolean>,
    interaction: CommandInteraction<CacheType>,
    roles: Collection<string, Role>
  ) {
    const content = message.content;
    const everyone = await interaction.guild?.members.fetch();
    const members = everyone
      ?.filter((m) => m.roles.cache.has(raiderRoleId))
      .filter((m) => m.roles.cache.hasAny(...roles.map((r) => r.id)));

    if (!members) {
      return;
    }

    // Iteratively edit user mentions into the thread in batches that do
    // not exceed the embed character limit.
    const ids = members.map((f) => f.id);
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

  public get builder() {
    const command = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Creates a new item DKP auction thread.")
      .addStringOption((o) =>
        o
          .setName(Option.ItemId)
          .setDescription("The ID of the item")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addUserOption((o) =>
        o
          .setName(Option.HeldBy)
          .setDescription(
            "The player holding the item(s). If empty, item(s) are assumed to be in the guild bank"
          )
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Count)
          .setMinValue(1)
          .setDescription("The number of items available")
      );
    classes.map((c) =>
      command.addBooleanOption((o) =>
        o
          .setName(c.toLowerCase())
          .setDescription(
            `Add ${c}s to the thread. If no classes are specified, all raiders are added.`
          )
      )
    );
    return command;
  }

  protected async getOptionAutocomplete(
    option: string
  ): Promise<ApplicationCommandOptionChoice[] | undefined> {
    switch (option) {
      case Option.ItemId:
        return await this.autocompleteName();
      default:
        return;
    }
  }

  private async autocompleteName() {
    return itemsList.map(({ name, id }) => ({
      name,
      value: id,
    }));
  }

  private async authorize(interaction: CommandInteraction<CacheType>) {
    const auctionChannel = await getAuctionChannel(interaction);
    if (!auctionChannel?.isText()) {
      throw new Error("The auction channel is not a text channel.");
    }

    this.requireInteractionMemberRole(bankerRoleId, interaction);

    return auctionChannel;
  }
}

export const itemAuctionCommand = new ItemAuctionCommand("itemauc");
