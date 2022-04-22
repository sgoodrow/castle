import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ApplicationCommandOptionChoice,
  CacheType,
  CommandInteraction,
  ThreadChannel,
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

class ItemAuctionCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const auctionChannel = await this.authorize(interaction);

    const builder = new ItemAuctionThreadBuilder(interaction);

    // this could go in the builder
    const filteredRoles = await this.getFilteredRolesString(interaction);
    const messageContent = `${filteredRoles}`;
    const message = await auctionChannel.send(messageContent);
    const thread = await message.startThread(builder.options);
    await thread.send(builder.message);
    await message.edit(`${messageContent}: ${thread}`);

    interaction.reply({
      content: `Started item auction thread: ${thread}`,
      ephemeral: true,
    });
  }

  private async getFilteredRolesString(
    interaction: CommandInteraction<CacheType>
  ) {
    const roles = await this.getFilteredRoles(interaction);
    return roles
      .map((r) => r.id)
      .filter(Boolean)
      .map((r) => `<@&${r}>`)
      .join(" ");
  }

  private async getFilteredRoles(interaction: CommandInteraction<CacheType>) {
    const classRoleNames = classes.reduce((included, c) => {
      if (getOption(c.toLowerCase(), interaction)?.value) {
        included.push(c);
      }
      return included;
    }, [] as string[]);

    const allRoles = await interaction.guild?.roles.fetch();
    const filteredRoles = allRoles
      ?.filter((r) => classRoleNames.includes(r.name))
      .filter(Boolean);

    if (!filteredRoles) {
      throw new Error("No class roles were found");
    }
    return filteredRoles;
  }

  // this is very noisey currently
  private async addClassRaidersToThread(
    thread: ThreadChannel,
    interaction: CommandInteraction<CacheType>
  ) {
    const filteredRoles = await this.getFilteredRoles(interaction);

    const everyone = await interaction.guild?.members.fetch();
    const filteredMembers = everyone
      ?.filter((m) => m.roles.cache.has(raiderRoleId))
      .filter((m) => m.roles.cache.hasAny(...filteredRoles.map((r) => r.id)));

    filteredMembers?.forEach((m) => thread.members.add(m.id));
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
            "The player holding the item(s). If empty, they are assumed to be in the guild bank"
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
        o.setName(c.toLowerCase()).setDescription(`Add ${c}s to the thread`)
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
