import { CacheType, CommandInteraction } from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { IPublicAccountService } from "../../services/bot/public-accounts.i";
import { LocationService } from "../../services/location";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";
import { BOT_SPREADSHEET_COLUMNS } from "../../services/sheet-updater/public-sheet";

export enum Option {
  Name = "name",
  Location = "location",
}

export class ParkSubcommand extends Subcommand {
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
    const location = this.getOptionValue(
      Option.Location,
      interaction
    ) as string;

    try {
      const parkDetails = {
        [BOT_SPREADSHEET_COLUMNS.CurrentPilot]: "",
        [BOT_SPREADSHEET_COLUMNS.CheckoutTime]: "",
        [BOT_SPREADSHEET_COLUMNS.CurrentLocation]: location ?? undefined,
      };

      await this.publicAccountService.updateBotRowDetails(name, parkDetails);
      if (location) {
        await interaction.editReply(
          `${name} was released and moved to ${location}`
        );
      } else {
        await interaction.editReply(
          `${name} was released in its previous location`
        );
      }
    } catch (error) {
      await interaction.editReply(`Failed to move bot: ${error}`);
    }
  }

  public get command() {
    const command = super.command
      .addStringOption((o) =>
        o
          .setName(Option.Name)
          .setDescription("The name of the character")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Location)
          .setDescription("The new location where the character is parked")
          .setAutocomplete(true)
          .setRequired(false)
      );
    return command;
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Name:
        return await this.publicAccountService.getBotOptions();
      case Option.Location:
        return await LocationService.getInstance().getLocationOptions();
      default:
        return;
    }
  }
}

export const parkSubCommand = new ParkSubcommand(
  "park",
  "Check-in of a guild bot, optionally updating its location"
);
