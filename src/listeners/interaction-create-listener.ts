import {
  ButtonInteraction,
  CacheType,
  ChatInputCommandInteraction,
  Interaction,
  MessageFlags,
} from "discord.js";
import { getButton, getCommand } from "./register-commands";
import { log } from "../shared/logger"

// Errors can happen before the interaction was deferred (e.g. unknown command)
const replyWithError = async (
  interaction:
    | ButtonInteraction<CacheType>
    | ChatInputCommandInteraction<CacheType>,
  content: string
) => {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content });
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
};

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
      await replyWithError(interaction, String(error));
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
      await replyWithError(interaction, String(error));
    }
  }
};
