import {
  ApplicationCommandOptionChoice,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { bankerRoleId } from "../../config";
import { SpellThreadBuilder } from "./spell-thread-builder";
import { ForbiddenSpells } from "../../shared/forbidden-spells";
import { BaseSubcommand, BaseSubcommandOption } from "./base-subcommand";

enum SpellOption {
  Player = "player",
  Level = "level",
  ClassRole = "class",
}

export const Option = { ...SpellOption, ...BaseSubcommandOption };

class Spell extends BaseSubcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const auctionChannel = await this.authorize(interaction);

    // send message to notify role
    const builder = new SpellThreadBuilder(this.name, interaction);
    const message = await auctionChannel.send(
      builder.classRole.map((r) => String(r)).join(" ")
    );

    // turn message into a thread
    const thread = await message.startThread(builder.options);
    await message.edit(`${message.content} ${thread}`);

    // add auction message to thread
    const threadMessage = await thread.send(builder.message);

    // add members to thread
    await this.addRoleMembersToThread(
      threadMessage,
      interaction,
      builder.classRole,
      false
    );

    await interaction.editReply(`Started spell auction thread: ${thread}`);
  }

  public get command() {
    return super.command
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

  public async getOptionAutocomplete(
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
    const auctionChannel = await this.getAuctionChannel(interaction);
    if (!auctionChannel?.isText()) {
      throw new Error("The auction channel is not a text channel.");
    }

    this.requireInteractionMemberRole(bankerRoleId, interaction);

    return auctionChannel;
  }
}

export const spellSubcommand = new Spell(
  "spell",
  "Creates a new Forbidden Spell auction thread."
);
