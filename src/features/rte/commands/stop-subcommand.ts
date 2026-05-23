import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { rteService } from "../../../services/rteService";
import { refreshRteStatusEmbed } from "../status-embed";
import { parseTime } from "../../../features/spawn-timers/commands/parsers/time-parser";

export enum Option {
  EndTime = "end_time",
}

export class StopSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description, true);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const endTimeStr = this.getOptionValue<string>(Option.EndTime, interaction);

    let endTime: Date | null = null;
    if (endTimeStr) {
      endTime = parseTime(endTimeStr);
      if (!endTime) {
        await interaction.editReply("I couldn't understand that end time. Try something like `30 minutes ago` or `3:30 PM`.");
        return;
      }
      if (endTime.getTime() > Date.now()) {
        await interaction.editReply("End time must be in the past.");
        return;
      }
    }

    const sessions = await rteService.getActiveSessionsForUser(interaction.user.id);

    if (sessions.length === 0) {
      await interaction.editReply("You don't have any active RTE sessions.");
      return;
    }

    const errors: string[] = [];
    for (const session of sessions) {
      if (endTime && endTime.getTime() < session.startTime.getTime()) {
        errors.push(`- ${session.target} (${session.characterName}): End time must be after the session start time.`);
        continue;
      }
      try {
        await rteService.endSessionById(session.id, interaction.user.id, endTime ?? undefined);
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

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.EndTime)
        .setDescription("When the session ended (e.g., '30 minutes ago'). Defaults to now.")
        .setRequired(false)
    );
  }

  public async getOptionAutocomplete(_option: string, _interaction: AutocompleteInteraction<CacheType>) {
    return undefined;
  }
}

export const stopSubcommand = new StopSubcommand("stop", "End all of your active RTE sessions.");
