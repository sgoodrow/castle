import { CacheType, CommandInteraction } from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { sharedCharacters } from "../../services/shared-characters";

export enum Option {
  Name = "name",
}

export class RequestSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const characterName = this.getOption(Option.Name, interaction)
      ?.value as string;

    await sharedCharacters.takeAccount({
      type: "byName",
      characterName,
      interaction,
    });
  }

  public get command() {
    const command = super.command.addStringOption((o) =>
      o
        .setName(Option.Name)
        .setDescription("The name of the character")
        .setAutocomplete(true)
        .setRequired(true)
    );
    return command;
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Name:
        return await sharedCharacters.getAccountOptions();
      default:
        return;
    }
  }
}

export const requestSubcommand = new RequestSubcommand(
  "request",
  "Request the credentials for a character."
);
