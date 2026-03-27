import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ComponentType,
} from "discord.js";
import { ButtonCommand } from "../../shared/command/button-command";
import { bot } from "@prisma/client";
import { knightRoleId, raiderRoleId } from "../../config";
import { getClassAbreviation } from "../../shared/classes";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";
import { log } from "../../shared/logger";

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
      const guildUser = await interaction.guild?.members.fetch(
        interaction.user.id
      );
      log(
        `${
          guildUser?.nickname || guildUser?.user.username
        } clicked batphone button for ${name}`
      );
      await PublicAccountsFactory.getService().doBotCheckout(name, interaction);
    } catch (err: unknown) {
      await this.setButtonState(interaction, true);
    }
  }

  private async setButtonState(
    interaction: ButtonInteraction<CacheType>,
    enabled: boolean
  ) {
    const components = interaction.message.components;

    const rowIdx = components.findIndex(
      (row) =>
        row.type === ComponentType.ActionRow &&
        row.components.some((c) => c.customId === interaction.customId)
    );

    if (rowIdx === -1) return;

    const row = components[rowIdx];
    if (row.type !== ComponentType.ActionRow) return;

    const updatedButtons = row.components.map((button) =>
      button.customId === interaction.customId
        ? ButtonBuilder.from(button as ButtonComponent).setDisabled(!enabled)
        : ButtonBuilder.from(button as ButtonComponent)
    );

    const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      updatedButtons
    );

    const updatedComponents = [
      ...components.slice(0, rowIdx),
      updatedRow,
      ...components.slice(rowIdx + 1),
    ];

    await interaction.message.edit({ components: updatedComponents });
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
