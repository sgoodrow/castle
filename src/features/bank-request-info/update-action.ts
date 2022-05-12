import {
  Client,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import moment from "moment";
import { bankRequestsChannelId } from "../../config";
import { BankHour } from "../../db/bank-hour";
import { dataSource } from "../../db/data-source";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { services } from "./bank-services";
import { bankCleanupButtonCommand } from "./bankCleanupButtonCommand";
import { bankingButtonCommand } from "./bankingButtonCommand";
import { Icon } from "./types";

export const updateBankRequestInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateBankRequestInfoAction(client), options);

class UpdateBankRequestInfoAction extends InstructionsReadyAction {
  public async execute() {
    await this.createOrUpdateInstructions(
      {
        embeds: [
          await this.getInstructionsEmbed(),
          ...(await this.getServicesEmbeds()),
          await this.getAvailabilityEmbed(),
          await this.getTldrEmbed(),
        ],
        components: [await this.getButtons()],
      },
      Name.BankRequestInstructions
    );
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(bankingButtonCommand.customId)
        .setStyle("PRIMARY")
        .setLabel("Banker Is In"),
      new MessageButton()
        .setCustomId(bankCleanupButtonCommand.customId)
        .setStyle("DANGER")
        .setLabel("Cleanup Old")
    );
  }

  private async getInstructionsEmbed() {
    return new MessageEmbed({
      title: "Instructions",
      description: `Always be courteous and patient with your bankers. If you are willing to help staff the bank, please reach out to an officer.
• Make bank requests when you are available and state how long you will be available.
• If you are no longer available, please delete your request and repost it later.
• Use the ${Icon.Request} request format`,
      color: "RED",
    });
  }

  private async getServicesEmbeds() {
    return services.map(
      ({ title, icon, requestFormats, inventoryUrl, bullets }) =>
        new MessageEmbed({
          title: `${icon} ${inventoryUrl ? "__" : ""}${title}${
            inventoryUrl ? "__" : ""
          }`,
          url: inventoryUrl,
          footer: {
            text: requestFormats.map((r) => `${Icon.Request} ${r}`).join("\n"),
          },
          description: `${bullets.map((b) => `• ${b}`).join("\n")}`,
        })
    );
  }

  private async getAvailabilityEmbed() {
    const bankHour = await dataSource.getRepository(BankHour).findBy({});
    return new MessageEmbed({
      title: "🕐 Availability",
      description: `Bankers may be available upon request, however they also hold regular hours. The start times are listed below (in your timezone).

${bankHour
  .map((a) => `• ${a.richLabel}`)
  .sort((a, b) => (a > b ? 1 : -1))
  .join("\n")}`,
      color: "PURPLE",
    });
  }

  private async getTldrEmbed() {
    return new MessageEmbed({
      title: "⚠️ TL;DR",
      description: `Make requests when you're available. Follow the instructions. Bankers will only process requests made in ${
        this.channel
      } (not PMs). Requests are deleted after processing (or if old or invalid).

_last updated <t:${moment().unix()}:R>_`,
      color: "ORANGE",
    });
  }

  protected get channel() {
    return this.getChannel(bankRequestsChannelId, "bank requests");
  }
}
