import { CacheType, CommandInteraction } from "discord.js";
import { SpellThreadBuilder } from "./spell-thread-builder";
import { BaseSubcommand, BaseSubcommandOption } from "./base-subcommand";
import { spellsList } from "../../shared/spells";

class Spell extends BaseSubcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const auctionChannel = await this.authorize(interaction);

    // send message to notify role
    const builder = new SpellThreadBuilder(this.name, interaction);
    const message = await auctionChannel.send(builder.options.name);

    // turn message into a thread
    const thread = await message.startThread(builder.options);
    await message.edit(`${thread}`);

    // add auction message to thread
    const threadMessage = await thread.send(builder.message);

    // add members to thread
    await this.addRaidersToThread(threadMessage, interaction);
    await interaction.editReply(`Started spell auction thread: ${thread}`);
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(BaseSubcommandOption.Name)
          .setDescription("The name of the spell")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(BaseSubcommandOption.Raid)
          .setDescription("The raid to restrict bidders to")
      )
      .addStringOption((o) =>
        o
          .setName(BaseSubcommandOption.HeldBy)
          .setDescription(
            "The player holding the spell(s). If empty, spells(s) are assumed to be in the guild bank"
          )
      )
      .addIntegerOption((o) =>
        o
          .setName(BaseSubcommandOption.Count)
          .setMinValue(1)
          .setDescription("The number of scrolls available. Defaults to 1")
      );
  }

  protected get itemsList() {
    return spellsList;
  }
}

export const spellSubcommand = new Spell(
  "spell",
  "Creates a new spell auction thread."
);
