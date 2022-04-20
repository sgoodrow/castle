import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction } from "discord.js";
import { bankerRoleId } from "../../config";
import { Command, getOption } from "../../listeners/command";
import { Banker } from "../../db/banker";
import { dataSource } from "../../db/data-source";
import { updateBankRequestInfo } from "../bank-request-info/update-action";

enum Option {
  Banker = "banker",
}

class RemoveBankHourCommand extends Command {
  public async autocomplete() {
    return;
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    await this.authorize(interaction);

    const userId = String(getOption(Option.Banker, interaction)?.user?.id);

    const bankerRepository = dataSource.getRepository(Banker);
    const banker = await bankerRepository.findOneByOrFail({ userId });
    banker.canceled = true;

    await dataSource.manager.save(banker);

    interaction.reply({
      content: `<@${banker.userId}>'s bank hour is canceled.`,
      ephemeral: true,
    });

    await updateBankRequestInfo(interaction.client);
  }

  public get builder() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription("Removes a banker hour.")
      .addUserOption((o) =>
        o
          .setName(Option.Banker)
          .setDescription("The name of the banker whose hour to remove")
          .setRequired(true)
      );
  }

  private async authorize(interaction: CommandInteraction<CacheType>) {
    this.requireRole(bankerRoleId, interaction);
  }
}

export const removeBankHour = new RemoveBankHourCommand("removebankhour");
