import {
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  ButtonStyle,
  Colors,
} from "discord.js";
import { jewelryChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import { readyActionExecutor, ReadyActionExecutorOptions } from "../../shared/action/ready-action";
import { services } from "./jewelry-services";
import { jewelryCleanupButtonCommand } from "./jewelry-cleanup-button-command";
import { craftingButtonCommand } from "./crafting-button-command";
import { Icon } from "../bank-request-info/types";

export const updateJewelryRequestInfo = (client: Client, options?: ReadyActionExecutorOptions) =>
  readyActionExecutor(new UpdateJewelryRequestInfoAction(client), options);

class UpdateJewelryRequestInfoAction extends InstructionsReadyAction {
  public async execute() {
    await this.createOrUpdateInstructions(
      {
        embeds: [await this.getInstructionsEmbed(), ...(await this.getServicesEmbeds())],
        components: [await this.getButtons()],
      },
      Name.JewelryRequestInstructions
    );
  }

  private async getButtons() {
    return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(craftingButtonCommand.customId)
        .setStyle(ButtonStyle.Primary)
        .setLabel("Notify Jewelry Requesters"),
      new ButtonBuilder()
        .setCustomId(jewelryCleanupButtonCommand.customId)
        .setStyle(ButtonStyle.Danger)
        .setLabel("Remove Old Requests")
    );
  }

  private async getInstructionsEmbed() {
    return new EmbedBuilder({
      title: "Instructions",
      description: `Always be courteous and patient with your jewelers. Reach out to an officer if you want to help with jewelcrafting.
• Use the ${Icon.Request} request format.
• Make jewelry requests when you are available and state how long you will be available.
• Requests are processed at the **North Freeport Bank**.
• Delete requests when you are no longer available.`,
      color: Colors.Green,
    });
  }

  private async getServicesEmbeds() {
    return services.map(
      ({ title, icon, requestFormats, inventoryUrl, bullets }) =>
        new EmbedBuilder({
          title: `${icon} ${inventoryUrl ? "__" : ""}${title}${inventoryUrl ? "__" : ""}`,
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
