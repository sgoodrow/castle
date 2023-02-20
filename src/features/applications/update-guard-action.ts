import {
  Client,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import { applicationsChannelId, gatehouseChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { requestGuardApplicationButtonCommand } from "./request-guard-application-button-command";

export const updateGuardInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateGuardInfoAction(client), options);

class UpdateGuardInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    await this.createOrUpdateInstructions(
      {
        embeds: [await this.getGuardApplication()],
        components: [await this.getButtons()],
      },
      Name.GuardInstructions
    );
  }

  private async getGuardApplication() {
    return new MessageEmbed({
      title: "Become a Guard",
      description: `**What do Guards do?**
• Interview and tag new recruits in <#${gatehouseChannelId}>.
• Invite characters to the guild in-game. We share an account with level 1 invite toons.
• Be a shining example of Castle values and decorum.
• If they want, run EXPeditions and other fun events.

**How do I apply to be a Guard?**
• Hit the "Guard Application" button below and check your DMs.
• If you've had positive interactions with 2-3 officers you're probably cleared to be a Guard.`,
    });
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(requestGuardApplicationButtonCommand.customId)
        .setStyle("PRIMARY")
        .setLabel("Guard Application")
    );
  }

  protected get channel() {
    return this.getChannel(applicationsChannelId, "applications");
  }
}
