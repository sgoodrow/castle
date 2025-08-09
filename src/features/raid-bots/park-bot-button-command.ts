import { ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType } from "discord.js";
import { ButtonCommand } from "../../shared/command/button-command";
import { bot } from "@prisma/client";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";
import { BOT_SPREADSHEET_COLUMNS } from "../../services/sheet-updater/public-sheet";
import { log } from "../../shared/logger";

export class ParkBotButtonCommand extends ButtonCommand {
  constructor(name: string) {
    super(name);
  }

  public async execute(interaction: ButtonInteraction<CacheType>): Promise<void> {
    interaction.editReply({
      content: "Checking permissions",
    });

    const name = interaction.customId.split("_")[1];
    const guildUser = await interaction.guild?.members.fetch(interaction.user.id);
    log(`${guildUser?.nickname || guildUser?.user.username} clicked bot park button for ${name}`);

    try {
      const parkDetails = {
        [BOT_SPREADSHEET_COLUMNS.CurrentPilot]: "",
        [BOT_SPREADSHEET_COLUMNS.CheckoutTime]: "",
        [BOT_SPREADSHEET_COLUMNS.CurrentLocation]: undefined,
      };

      await PublicAccountsFactory.getService().updateBotRowDetails(name, parkDetails);
      await interaction.editReply(`${name} was released in its previous location`);
    } catch (error) {
      await interaction.editReply(`Failed to move bot: ${error}`);
    }
  }

  public getButtonBuilder(bot: bot): ButtonBuilder {
    return new ButtonBuilder()
      .setLabel(`Park ${bot.name} at ${bot.location}`)
      .setCustomId(this.customId)
      .setStyle(ButtonStyle.Success);
  }
}

export const parkBotButtonCommand = new ParkBotButtonCommand("parkbot");
