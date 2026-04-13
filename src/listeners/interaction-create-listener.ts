import { CacheType, Interaction, MessageFlags } from "discord.js";
import { getButton, getCommand } from "./register-commands";
import { log } from "../shared/logger"

export const interactionCreateListener = async (
  interaction: Interaction<CacheType>
) => {
  if (interaction.isAutocomplete()) {
    getCommand(interaction)?.autocomplete(interaction).catch(console.error);
    return;
  }

  if (interaction.isButton()) {
    try {
      await interaction.deferReply({ ephemeral: true });
      await getButton(interaction).execute(interaction);
      log(`/${interaction.customId} succeeded`);
    } catch (error) {
      console.error(`/${interaction.customId} ${error}`);
      await interaction.editReply({ content: String(error) });
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    try {
      const command = getCommand(interaction);
      const subcommandName = interaction.options.getSubcommand(false);

      const ephemeral = subcommandName
      ? (command.subcommands[subcommandName]?.ephemeral ?? command.ephemeral)
      : command.ephemeral;

      const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

      await interaction.deferReply({ flags });
      await getCommand(interaction).execute(interaction);
      log(`/${interaction.commandName} succeeded`);
    } catch (error) {
      console.error(`/${interaction.commandName} ${error}`);
      await interaction.editReply(String(error));
    }
  }
};
