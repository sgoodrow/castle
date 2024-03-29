import { CacheType, CommandInteraction } from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { listThreadMembers } from "../../shared/command/util";

class List extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    await interaction.guild?.channels.fetch(interaction.channelId);

    if (!interaction.channel) {
      throw new Error(`Channel (${interaction.channelId}) is falsy.`);
    }

    if (!interaction.channel?.isThread()) {
      throw new Error(`Channel (${interaction.channelId}) is not a thread.`);
    }

    const count = await listThreadMembers(interaction);

    await interaction.editReply({
      content: `Listed all (${count}) members of the thread!`,
    });
  }

  public async getOptionAutocomplete() {
    return [];
  }
}

export const listSubcommand = new List("list", "List all users in the thread.");
