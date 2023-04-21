import {
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Colors,
  MessageActionRowComponentBuilder,
} from "discord.js";
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
import { bankCleanupButtonCommand } from "./bank-cleanup-button-command";
import { bankingButtonCommand } from "./banking-button-command";
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
    return services.map(
      ({ title, icon, requestFormats, inventoryUrl, bullets }) =>
        new EmbedBuilder({
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

  private async getInstructionsEmbed() {
    const bankHour = await dataSource.getRepository(BankHour).findBy({});
    const bankHourDescription = ` Additionally the following banker(s) have a set schedule on which they are also available (in your timezone):

${bankHour
  .map((a) => `• ${a.richLabel}`)
  .sort((a, b) => (a > b ? 1 : -1))
  .join("\n")}`;
    const description = `Always be courteous and patient with your bankers.
• Use the ${Icon.Request} request format
• Make bank requests when you are available
• State how long you will be available.
• Reimbursement, Recharge, and Auction requests remain open until fulfilled.
• All other requests will remain open for 3 days and then closed.
• Reach out to an officer if you want to help bank.
• Bankers will only process requests made in ${this.channel} (not PMs).

**__Example Request:__**
> Raid Reagents: Peridots, 40

We have many bankers that are available at their convenience throughout the day but do not have set banking hours.${
      bankHour.length ? bankHourDescription : "."
    }`;
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
