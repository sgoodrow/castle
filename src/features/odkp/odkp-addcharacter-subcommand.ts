import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { openDkpService } from "../../services/openDkpService";

export class OdkpAddCharacterSubcommand extends Subcommand {
  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<ApplicationCommandOptionChoiceData[] | undefined> {
    const characters = await openDkpService.getCharacters();
    switch (option) {
      case "existing":
        return characters.map((char) => {
          return { name: char.Name, value: char.Name };
        });
      default:
        return;
    }
  }
  public async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<void> {
    try {
      const characters = await openDkpService.getCharacters();
      await interaction.editReply("Checking a few things...");
      const newCharOption = this.getOption("new", interaction)?.value as string;
      const existingCharOption = this.getOption("existing", interaction)
        ?.value as string;

      const newChar = characters.find((c) => c.Name === newCharOption);
      const existingChar = characters.find(
        (c) => c.Name === existingCharOption
      );
      if (newChar) {
        await interaction.editReply(
          `${newCharOption} already exists in OpenDKP`
        );
        return;
      }
      if (!existingChar) {
        await interaction.editReply(
          `${existingCharOption} doesn't exist in OpenDKP`
        );
        return;
      }
      await interaction.editReply(`Adding character ${newCharOption}...`);
      const newCharacterData = await openDkpService.addPlayer(newCharOption);
      await interaction.editReply(
        "Linking character to existing characters..."
      );
      const providedCharacterId =
        existingChar.ParentId || existingChar.CharacterId;
      await openDkpService.linkCharacter({
        ChildId: newCharacterData.CharacterId,
        ParentId: providedCharacterId,
      });
      await interaction.editReply(
        `Done! Please CLAIM ${newCharacterData.Name} on OpenDKP and edit it with the relevant details`
      );
    } catch (err: unknown) {
      interaction.editReply(`Error: ${err}`);
    }
  }

  public get command() {
    const command = super.command
      .addStringOption((o) =>
        o
          .setName("existing")
          .setDescription("Name of any your EXISTING characters")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("new")
          .setDescription("Name of the NEW character you are creating")
          .setAutocomplete(false)
          .setRequired(true)
      );
    return command;
  }
}

export const odkpAddCharacterSubcommand = new OdkpAddCharacterSubcommand(
  "addcharacter",
  "Add a character to an existing account"
);
