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
import { BankService, services, SiteSection } from "./bank-services";
import { bankCleanupButtonCommand } from "./bank-cleanup-button-command";
import { bankingButtonCommand } from "./banking-button-command";
import { Icon } from "./types";
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
          ...(await this.getServicesEmbeds()),
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

  private async getServicesEmbeds() {
    return services.map((service) => {
      const { title, url, requestFormats } = card(service);
      return new EmbedBuilder({
        title: `${service.icon} ${url ? `__${title}__` : title}`,
        url,
        footer: requestFormats.length
          ? {
              text: requestFormats
                .map((r) => `${Icon.Request} ${r}`)
                .join("\n"),
            }
          : undefined,
        description: service.bullets.map((b) => `• ${b}`).join("\n"),
      });
    });
  }

  private async getInstructionsEmbed() {
    const site = bankWebUrl
      ? `• ${Icon.Sold} **Request from the [bank site](${bankWebUrl}),** especially for more than one item. Browse misc items, dropped spells, Plane of Sky and research, see prices and stock, and post your list here in one click.
`
      : "";
    const description = `Always be courteous and patient with your bankers.
${site}• ${Icon.Request} For services the site doesn't cover, post in the format shown on its card.
• \`/bank request\` works for a single item, and \`/bank search\` finds an item without requesting it.
• Requests remain open until fulfilled, for up to ${MAX_AGE_DAYS} days.
• Reach out to an officer if you want to help bank.
• Bankers will only process requests made in ${this.channel} (not PMs).`;
    // Discord shows at most 10 embeds a message, and the services use 9, so the site is linked here.
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

// The site's cards are titled for it and link to its category, where members request instead of
// typing a format.
const card = (service: BankService) =>
  "site" in service
    ? {
        title: `Castle Bank: ${service.title}`,
        url: bankWebUrl && siteLink(bankWebUrl, service.site),
        requestFormats: [],
      }
    : {
        title: service.title,
        url: service.inventoryUrl,
        requestFormats: service.requestFormats,
      };

const siteLink = (base: string, site: SiteSection) => {
  const url = new URL(base);
  if (site !== "all") url.searchParams.set("kind", site);
  return url.toString();
};
