import { CacheType, CommandInteraction } from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { sharedCharacters } from "../../services/shared-characters";

export enum Option {
  Name = "name",
  Location = "location",
}

export class ParkSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const name = this.getRequiredOptionValue(
      Option.Name,
      interaction
    ) as string;
    const location = this.getOptionValue(
      Option.Location,
      interaction
    ) as string;

    const raidBot = await sharedCharacters.getRaidBotByName(name);
    if (!raidBot) {
      throw new Error(`Failed to find a raid bot named ${raidBot}`);
    }

    await sharedCharacters.updateBotPilot(raidBot, "", null);
    if (!location) {
      await interaction.editReply(
        `Sheet was updated to show ${name} was released in its previous location`
      );
      return;
    }

    await sharedCharacters.updateBotLocation(name, location);
    await interaction.editReply(
      `Sheet was updated to show ${name} was released and moved to ${location}`
    );
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
