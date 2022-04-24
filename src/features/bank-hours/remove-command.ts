import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { bankerRoleId } from "../../config";
import { Command, getOption } from "../../shared/command/command";
import { dataSource } from "../../db/data-source";
import { updateBankRequestInfo } from "../bank-request-info/update-action";
import { BankHour } from "../../db/bank-hour";

enum Option {
  BankHourID = "hourid",
}

class RemoveBankHourCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    await this.authorize(interaction);

    const bankHourId = Number(getOption(Option.BankHourID, interaction)?.value);

    const bankHour = await dataSource
      .getRepository(BankHour)
      .findOneByOrFail({ id: bankHourId });

    await dataSource.manager.remove(bankHour);

    interaction.editReply(`Removed **bank hour**: ${bankHour.richLabel}.`);

    await updateBankRequestInfo(interaction.client);
  }

  public get builder() {
    return this.command.addIntegerOption((o) =>
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
    const weeklyBankAvailabilities = dataSource.getRepository(BankHour);
    const bankHour = await weeklyBankAvailabilities.findBy({});
    await Promise.all(
      bankHour.map(async (h) => interaction.guild?.members.fetch(h.userId))
    );
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

export const removeBankHour = new RemoveBankHourCommand(
  "removebankhour",
  "Removes a banker hour."
);
