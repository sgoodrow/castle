import { Client, MessageEmbed } from "discord.js";
import { bankRequestsChannelId } from "../../config";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { dataSource } from "../../db/data-source";
import { Icon, Service } from "./types";
import { services } from "./bank-services";
import { BankHour } from "../../db/bank-hour";
import { Name } from "../../db/instructions";
import moment from "moment";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";

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
          await this.getServicesEmbed(),
          await this.getAvailabilityEmbed(),
          await this.getTldrEmbed(),
        ],
      },
      Name.BankRequestInstructions
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

  private async getServicesEmbed() {
    return new MessageEmbed({
      title: "Services",
      description: `${services
        .map(
          ({ title, icon, requestFormats, inventoryUrl, bullets }: Service) => `
${icon} **${this.maybeUrl(title, inventoryUrl)}**
${requestFormats.map((r) => `${Icon.Request} \`${r}\``).join("\n")}
${bullets.map((b) => `• ${b}`).join("\n")}`
        )
        .join("\n")}`,
    });
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

  private maybeUrl(text: string, url?: string) {
    return url ? `[${text}](${url})` : text;
  }

  protected get channel() {
    return this.getChannel(bankRequestsChannelId, "bank requests");
  }
}
