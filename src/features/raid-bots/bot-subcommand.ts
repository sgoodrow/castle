import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { botUserRoleId } from "../../config";

export class BotSubcommand extends Subcommand {
  public getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<ApplicationCommandOptionChoiceData[] | undefined> {
    throw new Error("Method not implemented.");
  }
  public async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<void> {
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!roles.cache.has(botUserRoleId)) {
      throw new Error(
        "You do not have permission to access raid bot commands. Please request the 'Bot Pilot' role from raid leadership."
      );
    }
  }
}
