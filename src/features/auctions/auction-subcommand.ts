import {
  CacheType,
  ChannelType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import { auctionChannelId, bankerRoleId, raiderRoleId } from "../../config";
import { Subcommand } from "../../shared/command/subcommand";
import { addRoleToThread } from "../../shared/command/util";
import { Item, itemsMapById } from "../../shared/items";
import { spellsMapById } from "../../shared/spells";
import { AuctionThreadBuilder } from "./auction-thread-builder";

export enum Option {
  Name = "name",
  Raid = "raid",
  HeldBy = "heldby",
  RequireScribe = "requirescribe",
}

export class AuctionSubcommand extends Subcommand {
  public constructor(
    name: string,
    description: string,
    private readonly itemsMap: { [id: string]: Item }
  ) {
    super(name, description);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const auctionChannel = await this.authorize(interaction);

    // send message to notify roles
    const item = this.lookupItem(interaction);
    const builder = new AuctionThreadBuilder(this.name, interaction, item);
    const message = await auctionChannel.send(builder.options.name);

    // turn message into a thread
    const thread = await message.startThread(builder.options);
    await message.edit(`${thread}`);

    // add auction message to thread
    await thread.send(builder.message);

    // add members of role to thread
    await addRoleToThread(raiderRoleId, thread);
    await interaction.editReply(`Started auction thread: ${thread}`);
  }

  public get command() {
    const command = super.command
      .addStringOption((o) =>
        o
          .setName(Option.Name)
          .setDescription("The name of the item")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Raid)
          .setDescription(
            "The raid to restrict bidders to. Defaults to no restriction"
          )
      )
      .addStringOption((o) =>
        o
          .setName(Option.HeldBy)
          .setDescription(
            "The player holding the item(s). Defaults to assuming items are in the guild bank"
          )
      );
    if (this.name === "spell") {
      command.addBooleanOption((o) =>
        o
          .setName(Option.RequireScribe)
          .setDescription(
            "Add a rule that the bidders must be able to scribe the spell."
          )
      );
    }
    return command;
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Name:
        return await this.autocompleteName();
      default:
        return;
    }
  }

  private lookupItem(interaction: CommandInteraction<CacheType>) {
    const name = this.getOption(Option.Name, interaction)?.value as string;
    const item = this.itemsMap[name];
    if (!item) {
      throw new Error(`Could not find item named ${name}`);
    }
    return item;
  }

  private async autocompleteName() {
    return Object.values(this.itemsMap).map(({ name, id }) => ({
      name,
      value: id,
    }));
  }

  private async getAuctionChannel(interaction: CommandInteraction<CacheType>) {
    return await interaction.guild?.channels.fetch(auctionChannelId);
  }

  private async authorize(interaction: CommandInteraction<CacheType>) {
    const auctionChannel = await this.getAuctionChannel(interaction);
    if (auctionChannel?.type !== ChannelType.GuildText) {
      throw new Error("The auction channel is not a text channel.");
    }

    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!roles) {
      throw new Error("Could not determine your roles.");
    }

    if (!(roles.cache.has(bankerRoleId) || roles.cache.has(raiderRoleId))) {
      throw new Error("Must be either a banker or raider.");
    }

    return auctionChannel;
  }
}

export const spellSubcommand = new AuctionSubcommand(
  "spell",
  "Creates a new spell auction thread.",
  spellsMapById
);

export const itemSubcommand = new AuctionSubcommand(
  "item",
  "Creates a new item DKP auction thread.",
  itemsMapById
);
