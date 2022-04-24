import { CacheType, Interaction } from "discord.js";
import { getCommand } from "./register-commands";

export const interactionCreateListener = async (
  interaction: Interaction<CacheType>
) => {
  if (interaction.isAutocomplete()) {
    getCommand(interaction)?.autocomplete(interaction).catch(console.error);
    return;
  }

  if (interaction.isCommand()) {
    try {
      await interaction.deferReply({ ephemeral: true });
      await getCommand(interaction)?.execute(interaction);
      console.log(`/${interaction.commandName} succeded`);
    } catch (error) {
      console.log(`/${interaction.commandName} failed: ${error}`);
      await interaction.editReply(String(error));
    }
  }
};
