import { SlashCommandBuilder, type SlashCommandOptionsOnlyBuilder } from "@discordjs/builders";
import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  CacheType,
  ChatInputCommandInteraction,
} from "discord.js";
import { BaseCommand } from "./base-command";

export abstract class SimpleCommand extends BaseCommand {
  public get command(): SlashCommandBuilder | SlashCommandOptionsOnlyBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description);
  }

  public readonly subcommands: Record<string, any> = {};

  public async getOptionAutocomplete(
    _option: string,
    _interaction: AutocompleteInteraction<CacheType>
  ): Promise<ApplicationCommandOptionChoiceData[] | undefined> {
    return [];
  }

  public abstract execute(
    interaction: ChatInputCommandInteraction<CacheType>
  ): Promise<void>;
}
