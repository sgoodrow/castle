import {
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Colors,
  MessageActionRowComponentBuilder,
} from "discord.js";
import { bankRequestsChannelId, bankWebUrl } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { bounties, castleBankSections, services } from "./bank-services";
import { bankCleanupButtonCommand } from "./bank-cleanup-button-command";
import { bankingButtonCommand } from "./banking-button-command";
import { Icon, Service } from "./types";
import { MAX_AGE_DAYS } from "./expire-old-requests";

export const updateBankRequestInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateBankRequestInfoAction(client), options);

class UpdateBankRequestInfoAction extends InstructionsReadyAction {
  public async execute() {
    await this.createOrUpdateInstructions(
      {
        embeds: [
          serviceEmbed(bounties),
          this.getCastleBankEmbed(),
          ...services.map(serviceEmbed),
          await this.getInstructionsEmbed(),
        ],
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

  // Everything the bank site sells, in one card linked to the site, a field per category.
  private getCastleBankEmbed() {
    const site = bankWebUrl
      ? `Request these from the [bank site](${bankWebUrl}): see prices and stock, and post your list here in one click.`
      : undefined;
    return new EmbedBuilder({
      title: `${Icon.Sold} ${bankWebUrl ? "__Castle Bank__" : "Castle Bank"}`,
      url: bankWebUrl,
      description: site,
      fields: castleBankSections.map(({ title, bullets }) => ({
        name: title,
        value: bullets.map((b) => `• ${b}`).join("\n"),
      })),
    });
  }

  private async getInstructionsEmbed() {
    const site = bankWebUrl
      ? `• ${Icon.Sold} Request Castle Bank items from the [bank site](${bankWebUrl}).
`
      : "";
    const description = `Always be courteous and patient with your bankers.
${site}• ${Icon.Request} For the other cards, post in the format shown on the card.
• Prefer a command? \`/bank request\` works too.
• Requests remain open until fulfilled, for up to ${MAX_AGE_DAYS} days.
• Reach out to an officer if you want to help bank.
• Bankers will only process requests made in ${this.channel} (not PMs).`;
    return new EmbedBuilder({
      title: "Instructions",
      description,
      color: Colors.Green,
    });
  }

  protected get channel() {
    return this.getChannel(bankRequestsChannelId, "bank requests");
  }
}

const serviceEmbed = (service: Service) =>
  new EmbedBuilder({
    title: `${service.icon} ${
      service.inventoryUrl ? `__${service.title}__` : service.title
    }`,
    url: service.inventoryUrl,
    footer: {
      text: service.requestFormats
        .map((r) => `${Icon.Request} ${r}`)
        .join("\n"),
    },
    description: service.bullets.map((b) => `• ${b}`).join("\n"),
  });
