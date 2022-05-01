import {
  Client,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import moment from "moment-timezone";
import {
  gatehouseChannelId,
  inviteListChannelId,
  officerRosterChannelId,
} from "../../config";
import { dataSource } from "../../db/data-source";
import { Name } from "../../db/instructions";
import { Invite } from "../../db/invite";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { friendConfigButtonCommand } from "./friend-config-button";
import { altSubcommand, playerSubcommand } from "./add-subcommand";
import { doneSubcommand } from "./done-subcommand";
import { removeSubcommand } from "./remove-subcommand";
import { whoButtonCommand } from "./who-button-command";
import { sortInvites } from "./who-pending-button-command";
import { inviteCommand } from "./command";
import { requestGuardApplicationCommand } from "./request-guard-application-command";

export const updateInviteListInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateInviteListInfoAction(client), options);

class UpdateInviteListInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    await this.createOrUpdateInstructions(
      {
        embeds: [
          await this.getGuardApplication(),
          await this.getFAQ(),
          await this.getCommandInstructions(),
          await this.getInterviewEmbed(),
          await this.getInviteEmbed(),
          await this.getTldrEmbed(),
        ],
        components: [await this.getButtons()],
      },
      Name.InviteListInstructions
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

  private async getFAQ() {
    return new MessageEmbed({
      title: "Frequently Asked Questions",
      description: `**Someone wants to join, what do I tell them?**
Tell them to introduce themselves in our Discord (https://tinyurl.com/castle-discord) and ask for an interview.

**I need an invite in-game, how do I get one?**
Use the \`/invite\` Discord command to add your name to the invite list, then either wait for an officer or guard to reach out or _kindly_ track them down -- their names are in <#${officerRosterChannelId}>.`,
    });
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(requestGuardApplicationCommand.customId)
        .setStyle("PRIMARY")
        .setLabel("Request Guard Application"),
      new MessageButton()
        .setCustomId(whoButtonCommand.customId)
        .setStyle("SECONDARY")
        .setLabel("Print /who"),
      new MessageButton()
        .setCustomId(friendConfigButtonCommand.customId)
        .setStyle("SECONDARY")
        .setLabel("Print friends config")
    );
  }

  private async getCommandInstructions() {
    return new MessageEmbed({
      title: "Invite List Instructions",
      color: "GREEN",
    }).addFields([
      {
        name: `/${inviteCommand.name} ${playerSubcommand.name}`,
        value: `${playerSubcommand.description}`,
      },
      {
        name: `/${inviteCommand.name} ${altSubcommand.name}`,
        value: altSubcommand.description,
      },
      {
        name: `/${inviteCommand.name} ${removeSubcommand.name}`,
        value: removeSubcommand.description,
      },
      {
        name: `/${inviteCommand.name} ${doneSubcommand.name}`,
        value: doneSubcommand.description,
      },
    ]);
  }

  private async getInterviewEmbed() {
    const needInterview = await dataSource
      .getRepository(Invite)
      .findBy({ interviewed: false, invited: false, canceled: false });
    return new MessageEmbed({
      title: `Need Interview (${needInterview.length})`,
      description: needInterview
        .sort(sortInvites)
        .map((n) => `• ${n.richLabel}`)
        .join("\n"),
    });
  }

  private async getInviteEmbed() {
    const needInvite = await dataSource
      .getRepository(Invite)
      .findBy({ interviewed: true, invited: false, canceled: false });
    return new MessageEmbed({
      title: `Need Invite (${needInvite.length})`,
      description: needInvite
        .sort(sortInvites)
        .map((n) => `• ${n.richLabel}`)
        .join("\n"),
    });
  }

  private async getTldrEmbed() {
    return new MessageEmbed({
      title: "⚠️ TL;DR",
      description: `Use the commands to add or remove someone from the invite list.`,
      color: "ORANGE",
    });
  }

  protected get channel() {
    return this.getChannel(inviteListChannelId, "invite list");
  }
}
