import { SlashCommandSubcommandBuilder } from "@discordjs/builders";
import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { BaseCommand } from "./base-command";

export const getOption = (
  subcommandName: string,
  option: string,
  interaction:
    | CommandInteraction<CacheType>
    | AutocompleteInteraction<CacheType>
) => {
  const subcommand = interaction.options.data.find(
    (d) => d.name === subcommandName
  );
  if (!subcommand || !subcommand.options) {
    throw new Error("Subcommand has no options");
  }
  return subcommand.options.find((o) => o.name === option);
};

export abstract class Subcommand extends BaseCommand {
  public get command() {
    return new SlashCommandSubcommandBuilder()
      .setName(this.name)
      .setDescription(this.description);
  }

  protected getOption(
    name: string,
    interaction:
      | CommandInteraction<CacheType>
      | AutocompleteInteraction<CacheType>
  ) {
    return getOption(this.name, name, interaction);
  }
}
