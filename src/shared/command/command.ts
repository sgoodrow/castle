import {
  AutocompleteInteraction,
  CacheType,
  ChatInputCommandInteraction,
} from "discord.js";
import { BaseCommand } from "./base-command";
import { Subcommand } from "./subcommand";
import { SlashCommandBuilder } from "@discordjs/builders";
import { commandSuffix } from "../../config";

export class Command extends BaseCommand {
  public readonly command: SlashCommandBuilder;

  public constructor(
    name: string,
    description: string,
    private readonly _subcommands: Subcommand[],
    ephemeral = true
  ) {
    super(`${name}${commandSuffix || ""}`, description, ephemeral);
    this.command = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description);
    this._subcommands.forEach((s) => this.command.addSubcommand(s.command));
  }

  protected get subcommands() {
    return this._subcommands.reduce((m, s) => {
      m[s.name] = s;
      return m;
    }, {} as { [name: string]: Subcommand });
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const subcommand = interaction.options.getSubcommand(true);
    await this.subcommands[subcommand].execute(interaction);
  }

  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ) {
    const subcommand = interaction.options.getSubcommand(true);
    return this.subcommands[subcommand].getOptionAutocomplete(
      option,
      interaction
    );
  }
}
