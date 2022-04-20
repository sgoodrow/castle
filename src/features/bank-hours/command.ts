import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { bankerRoleId } from "../../config";
import { Command, getOption } from "../../listeners/command";
import { Banker } from "../../db/banker";
import { dataSource } from "../../db/data-source";
import { days } from "../bank-request-info/banker-hours";
import { bankRequestReadyListener } from "../bank-request-info/ready-listener";
import { Day } from "../bank-request-info/types";

export enum Option {
  Banker = "banker",
  Day = "day",
  Hour = "hour",
  PM = "pm",
  Canceled = "canceled",
}

const dayChoices: [name: string, value: string][] = days.map((d) => [d, d]);

class BankHoursCommand extends Command {
  public async autocomplete() {
    return;
  }

  public async listen(interaction: CommandInteraction<CacheType>) {
    try {
      await this.authorize(interaction);

      const userId = String(getOption(Option.Banker, interaction)?.user?.id);

      const bankerRepository = dataSource.getRepository(Banker);
      let banker = await bankerRepository.findOneBy({ userId });

      if (!banker) {
        banker = new Banker();
        banker.userId = userId;
      }

      banker.canceled = Boolean(getOption(Option.Canceled, interaction)?.value);
      banker.day = String(getOption(Option.Day, interaction)?.value) as Day;
      banker.hour = Number(getOption(Option.Hour, interaction)?.value);
      banker.pm = Boolean(getOption(Option.PM, interaction)?.value);
      banker.canceled = Boolean(getOption(Option.Canceled, interaction)?.value);

      await dataSource.manager.save(banker);

      const user = `<@${banker.userId}>`;
      interaction.reply({
        content: banker.canceled
          ? `${user}'s bank hour is canceled.`
          : `${user}'s bank hour set to ${banker.day} ${banker.hour}${
              banker.pm ? "PM" : "AM"
            }.`,
        ephemeral: true,
      });

      await bankRequestReadyListener(interaction.client);
      return true;
    } catch (error) {
      await interaction.reply({
        content: String(error),
        ephemeral: true,
      });
      return false;
    }
  }

  public get builder() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Creates or updates a banker hour.")
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
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Hour)
          .setMinValue(1)
          .setMaxValue(12)
          .setDescription("The hour of the day")
      )
      .addBooleanOption((o) =>
        o
          .setName(Option.PM)
          .setDescription("Whether or not the time is in AM or PM")
      )
      .addBooleanOption((o) =>
        o
          .setName(Option.Canceled)
          .setDescription("Whether or not the hour is active")
      );
  }

  private async authorize(interaction: CommandInteraction<CacheType>) {
    this.requireRole(bankerRoleId, interaction);
  }
}

export const bankHourCommand = new BankHoursCommand("bankhour");
