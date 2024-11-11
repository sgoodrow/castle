import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";

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
    await interaction.reply({
      content: "OK",
    });
  }
}

export const getSubCommand = new GetSubcommand(
  "get",
  "Get a user's last 10 Drusella Sathir time records"
);
