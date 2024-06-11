import { CacheType, CommandInteraction } from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { IPublicAccountService } from "../../services/bot/public-accounts.i";
import { LocationService } from "../../services/location";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";

export enum Option {
  Name = "name",
  BindLocation = "bindlocation",
}

export class BindSubcommand extends Subcommand {
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
    const bindLocation = this.getOptionValue(
      Option.BindLocation,
      interaction
    ) as string;

    try {
      await this.publicAccountService.updateBotRowDetails(
        name,
        undefined,
        undefined,
        undefined,
        bindLocation
      );
      if (bindLocation) {
        await interaction.editReply(
          `Sheet was updated to show ${name} was bound at ${bindLocation}`
        );
      }
    } catch (error) {
      await interaction.editReply(`Failed to bind bot: ${error}`);
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
          .setName(Option.BindLocation)
          .setDescription("The new location where the character is bound")
          .setAutocomplete(true)
          .setRequired(false)
      );
    return command;
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Name:
        return await this.publicAccountService.getBotOptions();
      case Option.BindLocation:
        return await LocationService.getInstance().getLocationOptions();
      default:
        return;
    }
  }
}

export const bindSubCommand = new BindSubcommand(
  "bind",
  "Update a bot's bound location"
);
