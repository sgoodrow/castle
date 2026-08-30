import { CacheType, CommandInteraction } from "discord.js";
import moment from "moment";
import { Subcommand } from "../../shared/command/subcommand";
import { IPublicAccountService } from "../../services/bot/public-accounts.i";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";
import { BOT_SPREADSHEET_COLUMNS } from "../../services/sheet-updater/public-sheet";

export enum Option {
  Name = "name",
  Faction = "faction",
}

// Standard EverQuest faction-standing levels, best (Ally) to worst (Scowling),
// plus Unknown for bots whose standing hasn't been checked.
export const FACTION_LEVELS = [
  "Scowling",
  "Threatening",
  "Dubious",
  "Indifferent",
  "Amiable",
  "Kindly",
  "Warmly",
  "Ally",
  "Unknown",
];

export class SetFactionSubcommand extends Subcommand {
  publicAccountService: IPublicAccountService;
  public constructor(name: string, description: string) {
    super(name, description);
    this.publicAccountService = PublicAccountsFactory.getService();
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const name = this.getRequiredOptionValue(
      Option.Name,
      interaction
    ) as string;
    const faction = this.getRequiredOptionValue(
      Option.Faction,
      interaction
    ) as string;

    if (!FACTION_LEVELS.includes(faction)) {
      await interaction.editReply(
        `\`${faction}\` is not a valid faction level. Choose one of: ${FACTION_LEVELS.join(
          ", "
        )}.`
      );
      return;
    }

    // Stored alongside the date it was set, e.g. "Amiable (08/29)".
    const value = `${faction} (${moment().format("MM/DD")})`;

    try {
      await this.publicAccountService.updateBotRowDetails(name, {
        [BOT_SPREADSHEET_COLUMNS.Faction]: value,
      });
      await interaction.editReply(`${name}'s faction was set to **${value}**.`);
    } catch (error) {
      await interaction.editReply(`Failed to set faction: ${error}`);
    }
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(Option.Name)
          .setDescription("The name of the character")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Faction)
          .setDescription("The character's current faction standing")
          .setAutocomplete(true)
          .setRequired(true)
      );
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Name:
        return await this.publicAccountService.getBotOptions();
      case Option.Faction:
        return FACTION_LEVELS.map((f) => ({ name: f, value: f }));
      default:
        return;
    }
  }
}

export const setFactionSubcommand = new SetFactionSubcommand(
  "setfaction",
  "Set a bot's current faction standing"
);
