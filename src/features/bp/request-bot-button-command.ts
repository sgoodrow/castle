import {
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
} from "discord.js";
import { ButtonCommand } from "../../shared/command/button-command";
import { bot } from "@prisma/client";
import { knightRoleId } from "../../config";
import { getClassAbreviation } from "../../shared/classes";

export class RequestBotButtonCommand extends ButtonCommand {
  constructor(name: string) {
    super(name);
  }
  public async execute(
    interaction: ButtonInteraction<CacheType>
  ): Promise<void> {
    const rowIdx = interaction.message.components.findIndex((row) =>
      row.components.find((c) => c.customId === interaction.customId)
    );
    if (rowIdx) {
      const row = interaction.message.components[rowIdx];
      (row.components as unknown) = row.components.map((button) =>
        button.customId === interaction.customId
          ? ButtonBuilder.from(button as ButtonComponent).setDisabled(true)
          : button
      );

      await interaction.message.edit({
        components: interaction.message.components.splice(rowIdx, 1, row),
      });
    }

    interaction.editReply({
      content: "OK",
    });
  }

  public getButtonBuilder(bot: bot): ButtonBuilder {
    const knightBot = bot.requiredRoles.includes(knightRoleId);
    return new ButtonBuilder()
      .setLabel(`${bot.name} (${bot.level} ${getClassAbreviation(bot.class)})`)
      .setCustomId(`requestbot_${bot.name}`)
      .setStyle(knightBot ? ButtonStyle.Success : ButtonStyle.Primary);
  }
}

export const requestBotButtonCommand = new RequestBotButtonCommand(
  "requestbot"
);
