import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { DrusellaService } from "../../services/ds/service";

export class OutSubcommand extends Subcommand {
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
    const outRec = await dsService.out(interaction.user);

    const guildUser = await interaction.guild?.members.fetch(
      interaction.user.id
    );

    const outMsg = `${
      guildUser?.nickname ?? interaction.user.username
    } **OUT** at ${outRec.timeOut!.toString()} (${outRec.minutes} minutes)`;
    await interaction.editReply({
      content: outMsg,
    });
  }
}

export const outSubCommand = new OutSubcommand(
  "out",
  "Check-out of Drusella Sathir camp"
);
