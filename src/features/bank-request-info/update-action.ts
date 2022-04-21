import { Client, DiscordAPIError, MessageEmbed } from "discord.js";
import { bankRequestsChannelId } from "../../config";
import { Action, actionExecutor } from "../../listeners/action";
import { Item, store } from "../../db/store";
import { dataSource } from "../../db/data-source";
import { Icon, Service } from "./types";
import { services } from "./bank-services";
import { BankHour } from "../../db/bank-hour";

export const updateBankRequestInfo = (client: Client) =>
  actionExecutor(new UpdateBankRequestInfoAction(client));

class UpdateBankRequestInfoAction extends Action {
  public async execute() {
    const embed = await this.getEmbed();

    const payload = {
      embeds: [
        await this.getInstructionsEmbed(),
        await this.getServicesEmbed(),
        await this.getAvailabilityEmbed(),
        await this.getTldrEmbed(),
      ],
    };

    if (embed) {
      embed.edit(payload);
      return;
    }

    const message = await this.channel.send(payload);
    await store.set(Item.BankRequestEmbedId, message.id);
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
    const bankHour = await dataSource
      .getRepository(BankHour)
      .findBy({ canceled: false });
    return new MessageEmbed({
      title: "🕐 Availability",
      description: `Bankers may be available upon request, however they also hold regularly hours. The times are listed in your timezone.

  ${bankHour
    .map((a) => a.richLabel)
    .sort((a, b) => (a > b ? 1 : -1))
    .join("\n")}`,
      color: "PURPLE",
    });
  }

  private async getTldrEmbed() {
    return new MessageEmbed({
      title: "⚠️ TL;DR",
      description:
        "Make requests when you're available. Follow the instructions. Bankers will only process requests made in #🏦bank-requests (not PMs). Requests are deleted after processing or if old or invalid.",
      color: "ORANGE",
    });
  }

  private maybeUrl(text: string, url?: string) {
    return url ? `[${text}](${url})` : text;
  }

  private async getEmbed() {
    const id = await store.get(Item.BankRequestEmbedId);
    if (!id) {
      return;
    }

    try {
      return await this.channel.messages.fetch(id);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.httpStatus === 404) {
        console.error(
          "Could not find bank request info message. Was it deleted?"
        );
        return;
      }
      throw error;
    }
  }

  private get channel() {
    const c = this.client.channels.cache.get(bankRequestsChannelId);
    if (!c) {
      throw new Error("Could not find bank requests channel");
    }
    if (!c.isText()) {
      throw new Error("Bank requests channel is not a text channel");
    }
    return c;
  }
}
