import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { rteService } from "../../../services/rteService";
import { refreshRteStatusEmbed } from "../status-embed";

export class StopSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description, true);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const sessions = await rteService.getActiveSessionsForUser(interaction.user.id);

    if (sessions.length === 0) {
      await interaction.editReply("You don't have any active RTE sessions.");
      return;
    }

    const errors: string[] = [];
    for (const session of sessions) {
      try {
        await rteService.endSessionById(session.id, interaction.user.id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`- ${session.target} (${session.characterName}): ${message}`);
      }
    }

    await refreshRteStatusEmbed();

    if (errors.length === 0) {
      await interaction.editReply(`Ended **${sessions.length}** active session(s). Check your DMs for summaries.`);
    } else {
      const endedCount = sessions.length - errors.length;
      await interaction.editReply(
        `Ended **${endedCount}** session(s). **${errors.length}** session(s) could not be ended:\n${errors.join("\n")}`
      );
    }
  }

  public async getOptionAutocomplete(_option: string, _interaction: AutocompleteInteraction<CacheType>) {
    return undefined;
  }
}

export const stopSubcommand = new StopSubcommand("stop", "End all of your active RTE sessions.");
