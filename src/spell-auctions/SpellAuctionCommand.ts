import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { getAuctionChannel } from "../shared/channels";
import { Command } from "../shared/Command";
import { bankerRoleId } from "../config";
import { SpellAuctionThreadBuilder } from "./SpellAuctionThreadBuilder";

export enum Option {
  Player = "player",
  Name = "name",
  Level = "level",
  ClassRole = "class",
  Count = "count",
}

class SpellAuctionCommand extends Command {
  public async listen(interaction: CommandInteraction<CacheType>) {
    try {
      const auctionChannel = await this.authorize(interaction);

      const builder = new SpellAuctionThreadBuilder(interaction);
      const thread = await auctionChannel.threads.create(builder.options);

      thread.send(builder.message);

      interaction.reply({
        content: `Started spell auction thread: ${thread}`,
        ephemeral: true,
      });
      return true;
    } catch (error) {
      await interaction.reply({
        content: String(error),
        ephemeral: true,
      });
      return false;
    }
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
      .addRoleOption((o) =>
        o
          .setName(Option.ClassRole)
          .setDescription("The class required for the spell")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Name)
          .setDescription("The name of the spell")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Level)
          .setDescription("The level required to scribe the spell")
          .setRequired(true)
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Count)
          .setDescription("The number of scrolls available")
      );
  }

  private async authorize(interaction: CommandInteraction<CacheType>) {
    const auctionChannel = await getAuctionChannel(interaction);
    if (!auctionChannel?.isText()) {
      throw new Error("The auction channel is not a text channel.");
    }

    this.requireRole(bankerRoleId, interaction);

    return auctionChannel;
  }
}

export const auctionCommand = new SpellAuctionCommand("spellauc");
