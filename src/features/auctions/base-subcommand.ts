import {
  ApplicationCommandOptionChoice,
  CacheType,
  CommandInteraction,
  Message,
} from "discord.js";
import { auctionChannelId, bankerRoleId, raiderRoleId } from "../../config";
import { Subcommand } from "../../shared/command/subcommand";
import { requireInteractionMemberRole } from "../../shared/command/util";
import { Item } from "../../shared/items";

const MESSAGE_CHAR_LIMIT = 1800;

export enum BaseSubcommandOption {
  Name = "name",
  Count = "count",
  Raid = "raid",
  HeldBy = "heldby",
}

export abstract class BaseSubcommand extends Subcommand {
  public async getOptionAutocomplete(
    option: string
  ): Promise<ApplicationCommandOptionChoice[] | undefined> {
    switch (option) {
      case BaseSubcommandOption.Name:
        return await this.autocompleteName();
      default:
        return;
    }
  }

  protected async autocompleteName() {
    return this.itemsList.map(({ name, id }) => ({
      name,
      value: id,
    }));
  }

  protected abstract get itemsList(): Item[];

  protected async getAuctionChannel(
    interaction: CommandInteraction<CacheType>
  ) {
    return await interaction.guild?.channels.fetch(auctionChannelId);
  }

  protected async addRaidersToThread(
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
    let extraContentNames = "";
    let extraContentIds = "";
    while (i < names.length) {
      const size = Math.max(names[i].length, ids[i].length);
      if (
        content.length + extraContentNames.length + size <
        MESSAGE_CHAR_LIMIT
      ) {
        extraContentNames += names[i];
        extraContentIds += ids[i];
      } else {
        console.log(`${content}${extraContentIds}`);
        console.log(`${content}${extraContentIds}`.length);
        await message.edit(`${content}${extraContentIds}`);
        extraContentNames = names[i];
        extraContentIds = ids[i];
      }
      i++;
    }

    // Final add
    console.log(`${content}${extraContentIds}`.length);
    console.log(`${content}${extraContentIds}`);
    await message.edit(`${content}${extraContentIds}`);

    // Edit the message back to normal
    await message.edit(content);
  }

  protected async authorize(interaction: CommandInteraction<CacheType>) {
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
