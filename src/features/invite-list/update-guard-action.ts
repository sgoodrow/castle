import {
  Client,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import { gatehouseChannelId, inviteListChannelId } from "@shared/config";
import { Name } from "@db/instructions";
import { InstructionsReadyAction } from "@shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "@shared/action/ready-action";
import { removeSubcommand } from "./remove-subcommand";
import { invitedCommand } from "./command";
import { requestGuardApplicationButtonCommand } from "./request-guard-application-button-command";
import { cleanupInvitesCommand } from "./cleanup-invites-command";
import { pingInviteListButtonCommand } from "./ping-invite-list-button-command";
import { addSubcommand } from "./add-subcommand";

export const updateGuardInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateGuardInfoAction(client), options);

class UpdateGuardInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    await this.createOrUpdateInstructions(
      {
        embeds: [
          await this.getGuardApplication(),
          await this.getCommandInstructions(),
        ],
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
• Hit the "Request Guard Application" button below.
• If you've had positive interactions with 2-3 officers you're probably cleared to be a Guard.`,
    });
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(requestGuardApplicationButtonCommand.customId)
        .setStyle("PRIMARY")
        .setLabel("Guard Application"),
      new MessageButton()
        .setCustomId(pingInviteListButtonCommand.customId)
        .setStyle("SECONDARY")
        .setLabel("Inviter Is In"),
      new MessageButton()
        .setCustomId(cleanupInvitesCommand.customId)
        .setStyle("DANGER")
        .setLabel("Cleanup Old")
    );
  }

  private async getCommandInstructions() {
    return new MessageEmbed({
      title: "Commands",
    }).addFields([
      {
        name: `/${invitedCommand.name} ${addSubcommand.name}`,
        value: addSubcommand.description,
      },
      {
        name: `/${invitedCommand.name} ${removeSubcommand.name}`,
        value: removeSubcommand.description,
      },
    ]);
  }

  protected get channel() {
    return this.getChannel(inviteListChannelId, "invite list");
  }
}
