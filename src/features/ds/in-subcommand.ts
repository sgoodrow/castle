import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { DrusellaService } from "../../services/ds/ds-service";

export class InSubcommand extends Subcommand {
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
      const inRec = await dsService.in(guildUser);
      const inMsg = `${
        guildUser?.nickname ?? interaction.user.username
      } **IN** at ${inRec.timeIn.toString()}`;
      await interaction.editReply({
        content: inMsg,
      });
    } else {
      await interaction.editReply({
        content: "User not found",
      });
    }
  }
}

export const inSubCommand = new InSubcommand(
  "in",
  "Check-in to Drusella Sathir camp"
);