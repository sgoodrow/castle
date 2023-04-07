import { CacheType, Interaction } from "discord.js";
import { getButton, getCommand } from "./register-commands";

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
      console.log(`/${interaction.customId} succeeded`);
    } catch (error) {
      console.error(`/${interaction.customId} ${error}`);
      await interaction.editReply({ content: String(error) });
    }
    return;
  }

  if (interaction.isCommand()) {
    try {
      const command = getCommand(interaction);
      await interaction.deferReply({ ephemeral: command.ephemeral });
      await getCommand(interaction).execute(interaction);
      console.log(`/${interaction.commandName} succeeded`);
    } catch (error) {
      console.error(`/${interaction.commandName} ${error}`);
      await interaction.editReply(String(error));
    }
  }
};
