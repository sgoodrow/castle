import { CacheType, CommandInteraction } from "discord.js";
import moment from "moment";
import { Subcommand } from "../../shared/command/subcommand";
import { IPublicAccountService } from "../../services/bot/public-accounts.i";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";
import { BOT_SPREADSHEET_COLUMNS } from "../../services/sheet-updater/public-sheet";
import { requireInteractionMemberRole } from "../../shared/command/util";
import { raiderRoleId } from "../../config";
import { getMember } from "../..";
import { SheetPublicAccountService } from "../../services/bot/public-accounts-sheet";
import { log } from "../../shared/logger";

export enum Option {
  Name = "name",
  Faction = "faction",
}

// EverQuest faction-standing levels, best (Max Ally) to worst (KOS), plus
// Unknown for bots whose standing hasn't been checked.
export const FACTION_LEVELS = [
  "Max Ally",
  "Ally",
  "Warmly",
  "Kindly",
  "Amiable",
  "Indifferent",
  "Apprehensive",
  "Dubious",
  "Threatening",
  "Scowling",
  "KOS",
  "Unknown",
];

// Sheet cell colors (0-1 RGBA) applied to the CoV Faction cell by standing.
const RED = { red: 0.918, green: 0.6, blue: 0.6, alpha: 1 };
const GREEN = { red: 0.576, green: 0.769, blue: 0.49, alpha: 1 };
const YELLOW = { red: 1, green: 0.898, blue: 0.6, alpha: 1 };

const factionBackgroundColor = (faction: string) => {
  if (["KOS", "Scowling", "Threatening"].includes(faction)) {
    return RED;
  }
  if (["Max Ally", "Ally", "Warmly"].includes(faction)) {
    return GREEN;
  }
  return YELLOW;
};

export class SetFactionSubcommand extends Subcommand {
  publicAccountService: IPublicAccountService;
  public constructor(name: string, description: string) {
    super(name, description);
    this.publicAccountService = PublicAccountsFactory.getService();
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    requireInteractionMemberRole(raiderRoleId, interaction);

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

    // The server display name (nickname) of whoever set it.
    const member = await getMember(interaction.user.id);
    const setter = member.displayName;

    // Stored with the date and who set it, e.g. "Amiable (08/29) - Pumped".
    const value = `${faction} (${moment().format("MM/DD")}) - ${setter}`;

    try {
      await this.publicAccountService.updateBotRowDetails(name, {
        [BOT_SPREADSHEET_COLUMNS.Faction]: value,
      });
    } catch (error) {
      await interaction.editReply(`Failed to set faction: ${error}`);
      return;
    }

    // Color-code the CoV Faction cell by standing. Failure here shouldn't fail
    // the whole command since the value was already recorded.
    let colorNote = "";
    try {
      await SheetPublicAccountService.getInstance().setBotCellBackground(
        name,
        BOT_SPREADSHEET_COLUMNS.Faction,
        factionBackgroundColor(faction)
      );
    } catch (error) {
      log(`Failed to color CoV Faction cell for ${name}: ${error}`);
      colorNote = " (couldn't update the cell color)";
    }

    await interaction.editReply(
      `${name}'s faction was set to **${value}**.${colorNote}`
    );
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
