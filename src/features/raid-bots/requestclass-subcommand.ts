import { CacheType, CommandInteraction } from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { sharedCharacters } from "../../services/shared-characters";
import { Class } from "../../shared/classes";
import { capitalize } from "../../shared/util";

export enum Option {
  Class = "class",
  Location = "location",
}

export class RequestClassSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const raidBotClass = capitalize(
      this.getOption(Option.Class, interaction)?.value as string
    );
    const raidBotLocation = this.getOption(Option.Location, interaction)
      ?.value as string;

    await sharedCharacters.takeAccount({
      type: "byClass",
      raidBotClass,
      raidBotLocation,
      interaction,
    });
  }

  public get command() {
    const command = super.command
      .addStringOption((o) =>
        o
          .setName(Option.Class)
          .setDescription("The class of a bot you want to checkout")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Location)
          .setDescription("The location of bot")
          .setAutocomplete(true)
          .setRequired(false)
      );
    return command;
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Class:
        return Object.values(Class).map((val) => ({
          name: val,
          value: val,
        }));
      case Option.Location:
        return sharedCharacters.getParkOptions();
      default:
        return;
    }
  }
}

export const requestClassSubcommand = new RequestClassSubcommand(
  "requestclass",
  "Request the credentials for the first available character of specified class."
);
