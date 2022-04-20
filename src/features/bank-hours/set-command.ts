import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { bankerRoleId } from "../../config";
import { Command, getOption } from "../../listeners/command";
import { Banker } from "../../db/banker";
import { dataSource } from "../../db/data-source";
import { updateBankRequestInfo } from "../bank-request-info/update-action";
import { Day, Days } from "../bank-request-info/types";

enum Option {
  Banker = "banker",
  Day = "day",
  Hour = "hour",
  PM = "pm",
}

const dayChoices: [name: string, value: string][] = Days.map((d) => [d, d]);

class SetBankHourCommand extends Command {
  public async autocomplete() {
    return;
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    await this.authorize(interaction);

    const userId = String(getOption(Option.Banker, interaction)?.user?.id);

    const bankerRepository = dataSource.getRepository(Banker);
    let banker = await bankerRepository.findOneBy({ userId });

    if (!banker) {
      banker = new Banker();
      banker.userId = userId;
    }

    banker.day = String(getOption(Option.Day, interaction)?.value) as Day;
    banker.hour = Number(getOption(Option.Hour, interaction)?.value);
    banker.pm = Boolean(getOption(Option.PM, interaction)?.value);
    banker.canceled = false;

    await dataSource.manager.save(banker);

    interaction.reply({
      content: `<@${banker.userId}>'s bank hour set to ${banker.day} ${
        banker.hour
      }${banker.pm ? "PM" : "AM"}.`,
      ephemeral: true,
    });

    await updateBankRequestInfo(interaction.client);
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
          .setRequired(true)
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Hour)
          .setMinValue(1)
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

  private async authorize(interaction: CommandInteraction<CacheType>) {
    this.requireRole(bankerRoleId, interaction);
  }
}

export const setBankHourCommand = new SetBankHourCommand("bankhour");
