import {
  Client,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import { jewelryChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { services } from "./jewelry-services";
import { jewelryCleanupButtonCommand } from "./jewelry-cleanup-button-command";
import { craftingButtonCommand } from "./crafting-button-command";
import { Icon } from "../bank-request-info/types";

export const updateJewelryRequestInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateJewelryRequestInfoAction(client), options);

class UpdateJewelryRequestInfoAction extends InstructionsReadyAction {
  public async execute() {
    await this.createOrUpdateInstructions(
      {
        embeds: [
          await this.getInstructionsEmbed(),
          ...(await this.getServicesEmbeds()),
        ],
        components: [await this.getButtons()],
      },
      Name.JewelryRequestInstructions
    );
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(craftingButtonCommand.customId)
        .setStyle("PRIMARY")
        .setLabel("Notify Jewelry Requesters"),
      new MessageButton()
        .setCustomId(jewelryCleanupButtonCommand.customId)
        .setStyle("DANGER")
        .setLabel("Remove Old Requests")
    );
  }

  private async getInstructionsEmbed() {
    return new MessageEmbed({
      title: "Instructions",
      description: `Always be courteous and patient with your jewelers. Reach out to an officer if you want to help with jewelcrafting.
• Use the ${Icon.Request} request format.
• Make jewelry requests when you are available and state how long you will be available.
• Requests are processed at the **North Freeport Bank**.
• Delete requests when you are no longer available.`,
      color: "GREEN",
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

  protected get channel() {
    return this.getChannel(jewelryChannelId, "jewelry requests");
  }
}
