import { CacheType, CommandInteraction } from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { sharedCharacters } from "../../services/shared-characters";

export enum Option {
  Name = "name",
  Location = "location",
}

export class ParkSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description);
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
      await sharedCharacters.updateBotPilot(name, "");
      await sharedCharacters.updateBotCheckoutTime(name, null);
      if (location) {
        await sharedCharacters.updateBotLocation(name, location);
        await interaction.editReply(
          `Sheet was updated to show ${name} was released and moved to ${location}`
        );
      } else {
        await interaction.editReply(
          `Sheet was updated to show ${name} was released in its previous location`
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
        return await sharedCharacters.getBotOptions();
      case Option.Location:
        return await sharedCharacters.getParkOptions();
      default:
        return;
    }
  }
}

export const parkSubCommand = new ParkSubcommand(
  "park",
  "Check out of a guild bot, optionally updating its location"
);
