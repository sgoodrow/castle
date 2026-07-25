import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import {
  openDkpService,
  odkpCharacterCache,
} from "../../services/openDkpService";
import { raiderRoleId } from "../../config";

export class OdkpGetRaidAttendanceSubcommand extends Subcommand {
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
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(raiderRoleId))) {
      throw new Error("Must be a raider to use this command");
    }
    try {
      const character = this.getRequiredOptionValue<string>(
        "character",
        interaction
      );
      await interaction.editReply({
        content: `Looking up raid attendance for ${character}...`,
      });

      const output = await openDkpService.getRaidAttendence(character);
      await interaction.editReply(output);
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

export const odkpGetRaidAttendanceSubcommand =
  new OdkpGetRaidAttendanceSubcommand(
    "getraidattendance",
    "Gets 30/60/90 day and lifetime raid attendance for a character",
    false
  );
