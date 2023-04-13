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
    const button = getButton(interaction);
    try {
      if (button.defer) {
        await interaction.deferReply({ ephemeral: true });
      }
      await getButton(interaction).execute(interaction);
      console.log(`/${interaction.customId} succeeded`);
    } catch (error) {
      console.error(`/${interaction.customId} ${error}`);
      if (button.defer) {
        await interaction.editReply({ content: String(error) });
      } else {
        await interaction.reply({ content: String(error) });
      }
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
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
