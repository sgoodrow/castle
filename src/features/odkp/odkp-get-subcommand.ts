import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import {
  openDkpService,
  odkpCharacterCache,
} from "../../services/openDkpService";
import { capitalize } from "../../shared/util";

export class OdkpGetSubcommand extends Subcommand {
  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<ApplicationCommandOptionChoiceData[]> {
    switch (option) {
      case "character": {
        const focused =
          this.getOptionValue<string>("character", interaction) ?? "";

        return [...odkpCharacterCache.values()]
          .filter((char) =>
            char.Name.toLowerCase().includes(focused.toLowerCase())
          )
          .slice(0, 25)
          .map((char) => ({ name: char.Name, value: char.Name }));
      }

      default:
        return [];
    }
  }

  public async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<void> {
    try {
      const character = this.getRequiredOptionValue<string>(
        "character",
        interaction
      );
      await interaction.editReply({
        content: `Looking up character ${character}...`,
      });

      const dkp = await openDkpService.getCharacterDkp(character);
      if (!character) {
        await interaction.editReply(`Character "${character}" not found.`);
        return;
      }

      await interaction.editReply(
        `${character} currently has ${dkp} DKP${dkp > 1000 ? " 🐋" : ""}`
      );
    } catch (err: unknown) {
      await interaction.editReply(`Error: ${err}`);
    }
  }

  public get command() {
    const command = super.command.addStringOption((o) =>
      o
        .setName("character")
        .setDescription("Character to lookup")
        .setAutocomplete(true)
        .setRequired(true)
    );
    return command;
  }
}

export const odkpGetSubcommand = new OdkpGetSubcommand(
  "get",
  "Gets DKP details for a character",
  false
);
