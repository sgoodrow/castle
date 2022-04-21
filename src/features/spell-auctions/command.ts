import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ApplicationCommandOptionChoice,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { getAuctionChannel } from "../../shared/channels";
import { bankerRoleId } from "../../config";
import { SpellAuctionThreadBuilder } from "./thread-builder";
import { ForbiddenSpells } from "../../shared/forbidden-spells";
import { Command } from "../../listeners/command";

export enum Option {
  Player = "player",
  Name = "name",
  Level = "level",
  ClassRole = "class",
  Count = "count",
}

class SpellAuctionCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const auctionChannel = await this.authorize(interaction);

    const builder = new SpellAuctionThreadBuilder(interaction);
    const thread = await auctionChannel.threads.create(builder.options);

    thread.send(builder.message);

    interaction.reply({
      content: `Started spell auction thread: ${thread}`,
      ephemeral: true,
    });
  }

  public get builder() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Creates a new Forbidden Spell auction thread.")
      .addUserOption((o) =>
        o
          .setName(Option.Player)
          .setDescription("The name of the player who requested the auction")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Name)
          .setDescription("The name of the spell")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Count)
          .setMinValue(1)
          .setDescription("The number of scrolls available")
      );
  }

  protected async getOptionAutocomplete(
    option: string
  ): Promise<ApplicationCommandOptionChoice[] | undefined> {
    switch (option) {
      case Option.Name:
        return await this.autocompleteName();
      default:
        return;
    }
  }

  private async autocompleteName() {
    return ForbiddenSpells.map((spell) => ({
      name: `[${spell.className}] ${spell.name} (${spell.level})`,
      value: spell.name,
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

export const auctionCommand = new SpellAuctionCommand("spellauc");
