/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { IPublicAccountService } from "../../services/bot/public-accounts.i";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";

export enum Option {
  Hours = "hours",
}

export class CleanupSubcommand extends Subcommand {
  publicAccountService: IPublicAccountService;
  public constructor(name: string, description: string) {
    super(name, description);
    this.publicAccountService = PublicAccountsFactory.getService();
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    try {
      const hours = this.getRequiredOptionValue(
        Option.Hours,
        interaction
      ) as number;
      await this.publicAccountService.cleanupCheckouts(hours);
      if (hours) {
        await interaction.editReply(
          `Checkouts older than ${hours} hour(s) have been cleaned up`
        );
      }
    } catch (error) {
      await interaction.editReply(`Failed to cleanup checkouts: ${error}`);
    }
  }

  public get command() {
    const command = super.command.addStringOption((o) =>
      o
        .setName(Option.Hours)
        .setDescription("Number of hours to cleanup stale checkouts")
        .setAutocomplete(false)
        .setRequired(true)
    );
    return command;
  }

  public getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<
    ApplicationCommandOptionChoiceData<string | number>[] | undefined
  > {
    throw new Error("Method not implemented.");
  }
}

export const cleanupSubCommand = new CleanupSubcommand(
  "cleanup",
  "Cleanup all checkouts older than X hours"
);
