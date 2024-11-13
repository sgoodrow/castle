import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { DrusellaService } from "../../services/ds/ds-service";

export class GetSubcommand extends Subcommand {
  constructor(name: string, description: string) {
    super(name, description, false);
  }

  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<ApplicationCommandOptionChoiceData[] | undefined> {
    return;
  }
  public async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<void> {
    const dsService = new DrusellaService();
    const guildUser = await interaction.guild?.members.fetch(
      interaction.user.id
    );
    if (guildUser) {

      const logs = await dsService.getUserLog(guildUser);
      await interaction.editReply({
        content: logs,
      });
    } else {
      await interaction.editReply({
        content: "User not found",
      });
    }

    
  }
}

export const getSubCommand = new GetSubcommand(
  "get",
  "Get a user's last 10 Drusella Sathir time records"
);
