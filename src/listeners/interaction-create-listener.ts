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
      await getButton(interaction).execute(interaction);
      console.log(`/${interaction.customId} succeeded`);
    } catch (error) {
      console.error(`/${interaction.customId} ${error}`);
      await interaction.reply({ content: String(error), ephemeral: true });
    }
    return;
  }

  if (interaction.isCommand()) {
    try {
      await interaction.deferReply({ ephemeral: true });
      await getCommand(interaction).execute(interaction);
      console.log(`/${interaction.commandName} succeeded`);
    } catch (error) {
      console.error(`/${interaction.commandName} ${error}`);
      await interaction.editReply(String(error));
    }
  }
};
