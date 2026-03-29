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
import { getMember } from "../..";

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
      const guildUser = await getMember(
        interaction.user.id
      );
      log(
        `${guildUser?.nickname || guildUser?.user.username
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

    const updatedComponents = components
      .filter((row) => row.type === ComponentType.ActionRow)
      .map((row) => {
        const updatedButtons = row.components.map((button) => {
          const builder = ButtonBuilder.from(button as ButtonComponent);
          if (button.customId === interaction.customId) {
            builder.setDisabled(!enabled);
          }
          return builder;
        });

        return new ActionRowBuilder<ButtonBuilder>().addComponents(updatedButtons);
      });

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
