import {
  ApplicationCommandOptionChoiceData,
  CacheType,
  CommandInteraction,
  Message,
} from "discord.js";
import {
  auctionChannelId,
  bankerRoleId,
  raiderRoleId,
} from "src/shared/config";
import { Subcommand } from "src/shared/command/subcommand";
import { requireInteractionMemberRole } from "src/shared/command/util";
import { Item, itemsMap } from "src/shared/items";
import { spellsMap } from "src/shared/spells";
import { AuctionThreadBuilder } from "./auction-thread-builder";

const MESSAGE_CHAR_LIMIT = 1800;

export enum Option {
  Name = "name",
  Count = "count",
  Raid = "raid",
  HeldBy = "heldby",
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
    const threadMessage = await thread.send(builder.message);

    // add members of role to thread
    await this.addRaidersToThread(threadMessage, interaction);
    await interaction.editReply(`Started auction thread: ${thread}`);
  }

  public get command() {
    return super.command
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
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Count)
          .setMinValue(1)
          .setDescription("The number of items available. Defaults to 1")
      );
  }

  public async getOptionAutocomplete(
    option: string
  ): Promise<ApplicationCommandOptionChoiceData[] | undefined> {
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

  private async addRaidersToThread(
    message: Message<boolean>,
    interaction: CommandInteraction<CacheType>
  ) {
    const roles = await this.getRaiderRole(interaction);

    const content = message.content;
    const everyone = await interaction.guild?.members.fetch();
    const members = everyone?.filter((m) => m.roles.cache.has(raiderRoleId));
    const usersToAdd = members
      ?.filter((m) => m.roles.cache.has(raiderRoleId))
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

    // Edit the message back to normal
    await message.edit(content);
  }

  private async authorize(interaction: CommandInteraction<CacheType>) {
    const auctionChannel = await this.getAuctionChannel(interaction);
    if (!auctionChannel?.isText()) {
      throw new Error("The auction channel is not a text channel.");
    }

    requireInteractionMemberRole(bankerRoleId, interaction);

    return auctionChannel;
  }

  private async getRaiderRole(interaction: CommandInteraction<CacheType>) {
    const roles = await interaction.guild?.roles.fetch();
    const raiderRole = roles?.filter((r) => r.id === raiderRoleId);
    if (!raiderRole) {
      throw new Error("Could not find the raider role.");
    }
    return raiderRole;
  }
}

export const spellSubcommand = new AuctionSubcommand(
  "spell",
  "Creates a new spell auction thread.",
  spellsMap
);

export const itemSubcommand = new AuctionSubcommand(
  "item",
  "Creates a new item DKP auction thread.",
  itemsMap
);
