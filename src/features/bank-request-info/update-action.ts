import {
  Client,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
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
          ...(await this.getServicesEmbeds()),
          await this.getInstructionsEmbed(),
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
        .setLabel("Notify Bank Requesters"),
      new MessageButton()
        .setCustomId(bankCleanupButtonCommand.customId)
        .setStyle("DANGER")
        .setLabel("Remove Old Requests")
    );
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

  private async getInstructionsEmbed() {
    const bankHour = await dataSource.getRepository(BankHour).findBy({});
    const bankHourDescription = ` and during their listed banking hour. The start times are listed below (in your timezone):

${bankHour
  .map((a) => `• ${a.richLabel}`)
  .sort((a, b) => (a > b ? 1 : -1))
  .join("\n")}`;
    const description = `Always be courteous and patient with your bankers.
• Use the ${Icon.Request} request format
• Make bank requests when you are available
• State how long you will be available.
• Delete requests when you are no longer available.
• Reach out to an officer if you want to help bank.
• Bankers will only process requests made in ${this.channel} (not PMs).

**__Example Request:__**
> Raid Reagents: Peridots, 40

    Bankers are available at their convenience${
      bankHour.length ? bankHourDescription : "."
    }`;
    return new MessageEmbed({
      title: "Instructions",
      description,
      color: "GREEN",
    });
  }

  protected get channel() {
    return this.getChannel(bankRequestsChannelId, "bank requests");
  }
}
