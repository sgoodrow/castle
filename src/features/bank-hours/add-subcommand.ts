import { CacheType, CommandInteraction } from "discord.js";
import { bankerRoleId } from "src/shared/config";
import { dataSource } from "src/db/data-source";
import { updateBankRequestInfo } from "src/features/bank-request-info/update-action";
import { Day, Days } from "src/features/bank-request-info/types";
import { BankHour } from "src/db/bank-hour";
import { Subcommand } from "src/shared/command/subcommand";
import {
  requireInteractionMemberRole,
  requireUserRole,
} from "src/shared/command/util";

enum Option {
  Banker = "banker",
  Day = "day",
  Hour = "hour",
  PM = "pm",
}

const EST_UTC_TIMEZONE_OFFSET = 4;

const dayChoices: [name: string, value: string][] = Days.map((d) => [d, d]);

class Add extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    requireInteractionMemberRole(bankerRoleId, interaction);

    const banker = this.getOption(Option.Banker, interaction)?.user;

    if (!banker) {
      throw new Error(`Banker not found.`);
    }

    requireUserRole(banker.id, bankerRoleId, interaction);

    const bankHour = new BankHour();
    bankHour.userId = banker.id;
    bankHour.day = String(
      this.getOption(Option.Day, interaction)?.value
    ) as Day;
    const pm = Boolean(this.getOption(Option.PM, interaction)?.value);
    bankHour.hour =
      Number(this.getOption(Option.Hour, interaction)?.value) +
      (pm ? 12 : 0) +
      EST_UTC_TIMEZONE_OFFSET;

    await dataSource.manager.save(bankHour);

    interaction.editReply(`Added **bank hour** ${bankHour.richLabel}`);

    await updateBankRequestInfo(interaction.client);
  }

  public get command() {
    return super.command
      .addUserOption((o) =>
        o
          .setName(Option.Banker)
          .setDescription("The name of the banker fulfilling the hour")
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

  public async getOptionAutocomplete() {
    return [];
  }
}

export const addSubcommand = new Add(
  "add",
  "Creates a banker hour. Specify time in EST."
);
