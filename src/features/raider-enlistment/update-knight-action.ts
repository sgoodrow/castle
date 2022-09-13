import {
  Client,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import { raiderEnlistmentChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { requestKnightApplicationButtonCommand } from "./request-knight-application-button-command";

export const updateKnightInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateKnightInfoAction(client), options);

class UpdateKnightInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    await this.createOrUpdateInstructions(
      {
        embeds: [
          await this.getApplication(),
        ],
        components: [await this.getButtons()],
      },
      Name.KnightInstructions
    );
  }

  private async getApplication() {
    return new MessageEmbed({
      title: "Become a Knight",
      description: `**What do Knights do?** Any of the following:
• Lead raids
• Support raid leaders
• Assist in scheduling raids
• Restock raid reagents
• Meditate, position and play COTH mages
• Propose and enact raid policies
• Train raiders and enforce raider behaviors

**How do I apply to be a Knight?**
• Hit the "Knight Application" button below and check your DMs.
• If you've done any of the above on raids, you're probably cleared to be a Knight.`,
    });
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(requestKnightApplicationButtonCommand.customId)
        .setStyle("PRIMARY")
        .setLabel("Knight Application"),
    );
  }

  protected get channel() {
    return this.getChannel(raiderEnlistmentChannelId, "raider enlistment");
  }
}
