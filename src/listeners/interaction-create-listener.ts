import { ButtonInteraction, CacheType, DiscordAPIError, ChatInputCommandInteraction, Interaction, MessageFlags } from "discord.js";
import { getButton, getCommand } from "./register-commands";
import { log } from "../shared/logger"
import { describeError, remember } from "../shared/error-reports";

// For error reports, which are public: the command and subcommand, or the button's registered id
// (a button's own id can carry a member's name). Never the options anyone typed.
const featureOf = (interaction: ButtonInteraction<CacheType> | ChatInputCommandInteraction<CacheType>) => {
  if (interaction.isButton()) {
    try {
      return `button ${getButton(interaction).customId}`;
    } catch {
      return "an unknown button";
    }
  }
  const o = interaction.options;
  return `/${[interaction.commandName, o.getSubcommandGroup(false), o.getSubcommand(false)].filter(Boolean).join(" ")}`;
};

// Kept for the report of any error that follows (see remember): what failed, how long after the
// member acted (Discord needs an answer within 3s), and whether the bot had answered yet. Discord's
// errors in full; for a command's own errors only their kind, since their text can name members.
const noteFailure = (interaction: ButtonInteraction<CacheType> | ChatInputCommandInteraction<CacheType>, error: unknown) =>
  remember(
    `${featureOf(interaction)} failed ${Date.now() - interaction.createdTimestamp}ms after the member acted ` +
      `(deferred: ${interaction.deferred}, replied: ${interaction.replied}): ` +
      (error instanceof DiscordAPIError ? describeError(error).message : `a ${error instanceof Error ? error.name : typeof error} from the command`)
  );

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
      noteFailure(interaction, error);
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
      noteFailure(interaction, error);
      await interaction.editReply(String(error));
    }
  }
};
