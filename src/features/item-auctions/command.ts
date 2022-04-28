import {
  ApplicationCommandOptionChoice,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { bankerRoleId, raiderRoleId } from "../../config";
import { classes } from "../../shared/classes";
import {
  AuctionCommand,
  AuctionOption,
} from "../../shared/command/auction-command";
import { getOption } from "../../shared/command/command";
import { itemsList } from "../../shared/items";
import { ItemAuctionThreadBuilder } from "./thread-builder";

enum ItemOption {
  ItemId = "itemid",
  HeldBy = "heldby",
}

export const Option = { ...ItemOption, ...AuctionOption };

class ItemAuctionCommand extends AuctionCommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
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

    // add members to thread
    await this.addRoleMembersToThread(threadMessage, interaction, roles, true);

    await interaction.editReply(`Started item auction thread: ${thread}`);
  }

  public get builder() {
    const command = this.command
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

  protected async getOptionAutocomplete(
    option: string
  ): Promise<ApplicationCommandOptionChoice[] | undefined> {
    switch (option) {
      case ItemOption.ItemId:
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
    const auctionChannel = await this.getAuctionChannel(interaction);
    if (!auctionChannel?.isText()) {
      throw new Error("The auction channel is not a text channel.");
    }

    this.requireInteractionMemberRole(bankerRoleId, interaction);

    return auctionChannel;
  }
}

export const itemAuctionCommand = new ItemAuctionCommand(
  "itemauc",
  "Creates a new item DKP auction thread."
);
