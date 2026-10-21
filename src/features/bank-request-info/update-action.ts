import {
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageActionRowComponentBuilder,
} from "discord.js";
import { bankRequestsChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { bankRequestEmbeds } from "./bank-request-embeds";
import { bankCleanupButtonCommand } from "./bank-cleanup-button-command";
import { bankingButtonCommand } from "./banking-button-command";

export const updateBankRequestInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateBankRequestInfoAction(client), options);

class UpdateBankRequestInfoAction extends InstructionsReadyAction {
  public async execute() {
    await this.createOrUpdateInstructions(
      {
        embeds: bankRequestEmbeds(`${this.channel}`),
        components: [await this.getButtons()],
      },
      Name.BankRequestInstructions
    );
  }

  private async getButtons() {
    return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(bankingButtonCommand.customId)
        .setStyle(ButtonStyle.Primary)
        .setLabel("Notify Bank Requesters"),
      new ButtonBuilder()
        .setCustomId(bankCleanupButtonCommand.customId)
        .setStyle(ButtonStyle.Danger)
        .setLabel("Remove Old Requests")
    );
  }

  protected get channel() {
    return this.getChannel(bankRequestsChannelId, "bank requests");
  }
}
