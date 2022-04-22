import { SlashCommandBuilder } from "@discordjs/builders";
import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { bankerRoleId } from "../../config";
import { Command, getOption } from "../../listeners/command";
import { dataSource } from "../../db/data-source";
import { updateBankRequestInfo } from "../bank-request-info/update-action";
import { BankHour } from "../../db/bank-hour";

enum Option {
  Banker = "banker",
  BankHourID = "hourid",
}

class RemoveBankHourCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    await this.authorize(interaction);

    const banker = getOption(Option.Banker, interaction)?.user;
    if (!banker) {
      throw new Error(`Banker not found.`);
    }
    this.requireUserRole(banker.id, bankerRoleId, interaction);
    const bankHourId = Number(getOption(Option.BankHourID, interaction)?.value);

    const bankHour = await dataSource
      .getRepository(BankHour)
      .findOneByOrFail({ id: bankHourId });

    bankHour.canceled = true;

    await dataSource.manager.save(bankHour);

    interaction.reply({
      content: `Removed bank hour: ${bankHour.richLabel}.`,
      ephemeral: true,
    });

    await updateBankRequestInfo(interaction.client);
  }

  public get builder() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Removes a banker hour.")
      .addIntegerOption((o) =>
        o
          .setName(Option.BankHourID)
          .setDescription(
            "The bank hour ID. Set a banker to get a list of hours."
          )
          .setAutocomplete(true)
          .setRequired(true)
      );
  }

  protected async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ) {
    switch (option) {
      case Option.BankHourID:
        return await this.autocompleteBankHourIdOption(interaction);
      default:
        return;
    }
  }

  private async autocompleteBankHourIdOption(
    interaction: AutocompleteInteraction<CacheType>
  ) {
    const banker = getOption(Option.Banker, interaction)?.user?.id;
    const weeklyBankAvailabilities = dataSource.getRepository(BankHour);
    const bankHour = await weeklyBankAvailabilities.findBy({
      userId: banker,
      canceled: false,
    });
    return bankHour?.map((h) => ({
      name: `${
        interaction.guild?.members.cache.get(h.userId)?.displayName
      } ${h.nextBankerHour.toUTCString()}`,
      value: h.id,
    }));
  }

  private async authorize(interaction: CommandInteraction<CacheType>) {
    this.requireInteractionMemberRole(bankerRoleId, interaction);
  }
}

export const removeBankHour = new RemoveBankHourCommand("removebankhour");
