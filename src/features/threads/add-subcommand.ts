import { CacheType, CommandInteraction } from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { addRoleToThread } from "../../shared/command/util";

enum Option {
  RoleId = "roleid",
}

class Add extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const roleId = this.getOption(Option.RoleId, interaction)?.role?.id;
    if (!roleId) {
      throw new Error(`A Role ID is required.`);
    }

    await interaction.guild?.channels.fetch(interaction.channelId);

    if (!interaction.channel) {
      throw new Error(`Channel (${interaction.channelId}) is falsy.`);
    }

    if (!interaction.channel?.isThread()) {
      throw new Error(`Channel (${interaction.channelId}) is not a thread.`);
    }

    const count = await addRoleToThread(roleId, interaction.channel);

    await interaction.editReply({
      content: `Added all (${count}) members of <@&${roleId}> to thread!`,
    });
  }

  public get command() {
    return super.command.addRoleOption((o) =>
      o
        .setName(Option.RoleId)
        .setDescription("The Discord role to add")
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete() {
    return [];
  }
}

export const addSubcommand = new Add(
  "add",
  "Add all members of a role to the thread."
);
