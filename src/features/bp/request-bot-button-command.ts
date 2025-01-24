import {
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
} from "discord.js";
import { ButtonCommand } from "../../shared/command/button-command";
import { bot } from "@prisma/client";
import { knightRoleId, raiderRoleId } from "../../config";
import { getClassAbreviation } from "../../shared/classes";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";

export class RequestBotButtonCommand extends ButtonCommand {
  constructor(name: string) {
    super(name);
  }
  public async execute(
    interaction: ButtonInteraction<CacheType>
  ): Promise<void> {
    await this.setButtonState(interaction, false);

    interaction.editReply({
      content: "Checking permissions",
    });

    const name = interaction.customId.split("_")[1];
    try {
      await PublicAccountsFactory.getService().doBotCheckout(name, interaction);
      const guildUser = await interaction.guild?.members.fetch(
        interaction.user.id
      );
      console.log(
        `${
          guildUser?.nickname || guildUser?.user.username
        } clicked batphone button for ${name}`
      );
    } catch (err: unknown) {
      await this.setButtonState(interaction, true);
    }
  }

  private async setButtonState(
    interaction: ButtonInteraction<CacheType>,
    enabled: boolean
  ) {
    const rowIdx = interaction.message.components.findIndex((row) =>
      row.components.find((c) => c.customId === interaction.customId)
    );
    if (rowIdx !== undefined) {
      const row = interaction.message.components[rowIdx];
      (row.components as unknown) = row.components.map((button) =>
        button.customId === interaction.customId
          ? ButtonBuilder.from(button as ButtonComponent).setDisabled(!enabled)
          : button
      );

      interaction.message.components.splice(rowIdx, 1, row);

      await interaction.message.edit({
        components: interaction.message.components,
      });
    }
  }

  public getButtonBuilder(bot: bot): ButtonBuilder {
    const icon = !bot.requiredRoles.includes(raiderRoleId) ? "🛡️" : "";
    return new ButtonBuilder()
      .setLabel(
        `${icon}${bot.name} (${bot.level} ${getClassAbreviation(bot.class)})`
      )
      .setCustomId(`requestbot_${bot.name}`)
      .setStyle(ButtonStyle.Primary);
  }
}

export const requestBotButtonCommand = new RequestBotButtonCommand(
  "requestbot"
);
