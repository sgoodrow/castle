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
import { Day, Days } from "../bank-request-info/types";
import { BankHour } from "../../db/bank-hour";

enum Option {
  Banker = "banker",
  Day = "day",
  Hour = "hour",
  PM = "pm",
}

const EST_UTC_TIMEZONE_OFFSET = 4;

const dayChoices: [name: string, value: string][] = Days.map((d) => [d, d]);

class AddBankHourCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    await this.authorize(interaction);

    const userId = String(getOption(Option.Banker, interaction)?.value);

    this.requireUserRole(userId, bankerRoleId, interaction);

    const bankHour = new BankHour();
    bankHour.userId = userId;
    bankHour.day = String(getOption(Option.Day, interaction)?.value) as Day;
    const pm = Boolean(getOption(Option.PM, interaction)?.value);
    bankHour.hour =
      Number(getOption(Option.Hour, interaction)?.value) +
      (pm ? 12 : 0) +
      EST_UTC_TIMEZONE_OFFSET;

    await dataSource.manager.save(bankHour);

    interaction.reply({
      content: `Added **banker bankHour** ${bankHour.richLabel}`,
      ephemeral: true,
    });

    await updateBankRequestInfo(interaction.client);
  }

  public get builder() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Creates or updates a banker hour. Specify time in EST.")
      .addStringOption((o) =>
        o
          .setName(Option.Banker)
          .setDescription("The name of the banker fulfilling the hour")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Day)
          .setDescription("The day of the week")
          .setChoices(dayChoices)
          .setRequired(true)
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Hour)
          .setMinValue(0)
          .setMaxValue(12)
          .setDescription("The hour of the day")
          .setRequired(true)
      )
      .addBooleanOption((o) =>
        o
          .setName(Option.PM)
          .setDescription("Whether or not the time is in AM or PM")
          .setRequired(true)
      );
  }

  protected async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ) {
    switch (option) {
      case Option.Banker:
        return await this.autocompleteBankerOption(interaction);
      default:
        return;
    }
  }

  // todo: not dry, see remove-commands.ts
  private async autocompleteBankerOption(
    interaction: AutocompleteInteraction<CacheType>
  ) {
    return this.role(bankerRoleId, interaction)?.members.map((b) => ({
      name: b.displayName,
      value: b.user.id,
    }));
  }

  private async authorize(interaction: CommandInteraction<CacheType>) {
    this.requireInteractionMemberRole(bankerRoleId, interaction);
  }
}

export const setBankHourCommand = new AddBankHourCommand("addbankhour");
