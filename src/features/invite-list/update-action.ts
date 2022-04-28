import {
  Client,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import moment from "moment-timezone";
import { inviteListChannelId } from "../../config";
import { dataSource } from "../../db/data-source";
import { Name } from "../../db/instructions";
import { Invite } from "../../db/invite";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { friendConfigButtonCommand } from "./friend-config-button";
import { interviewCommand } from "./interview-command";
import { interviewedCommand } from "./interviewed-command";
import { altCommand, inviteCommand } from "./invite-command";
import { invitedCommand } from "./invited-command";
import { removeCommand } from "./remove-command";
import { whoButtonCommand } from "./who-button-command";
import { sortInvites } from "./who-pending-button-command";

export const updateInviteListInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateInviteListInfoAction(client), options);

class UpdateInviteListInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    await this.createOrUpdateInstructions(
      {
        embeds: [
          await this.getCastleMemberInstructionsEmbed(),
          await this.getCastleGuardInstructionsEmbed(),
          await this.getInterviewEmbed(),
          await this.getInviteEmbed(),
          await this.getTldrEmbed(),
        ],
        components: [await this.getButtons()],
      },
      Name.InviteListInstructions
    );
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(whoButtonCommand.customId)
        .setStyle("PRIMARY")
        .setLabel("Priority /who"),
      new MessageButton()
        .setCustomId(friendConfigButtonCommand.customId)
        .setStyle("SECONDARY")
        .setLabel("Friends Config")
    );
  }

  private async getCastleMemberInstructionsEmbed() {
    return new MessageEmbed({
      title: "Castle Member Instructions",
      color: "RED",
    }).addFields([
      {
        name: `/${interviewCommand.name}`,
        value: interviewCommand.description,
      },
      {
        name: `/${altCommand.name}`,
        value: altCommand.description,
      },
      {
        name: `/${removeCommand.name}`,
        value: removeCommand.description,
      },
    ]);
  }

  private async getCastleGuardInstructionsEmbed() {
    return new MessageEmbed({
      title: "Castle Guard Instructions",
      color: "DARK_GREEN",
    }).addFields([
      {
        name: `/${inviteCommand.name}`,
        value: inviteCommand.description,
      },
      {
        name: `/${interviewedCommand.name}`,
        value: interviewedCommand.description,
      },
      {
        name: `/${invitedCommand.name}`,
        value: invitedCommand.description,
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
      description: `Use the commands to add a player to the interview list or an alt to the invite list. A guard or officer will follow up.

_last updated <t:${moment().unix()}:R>_`,
      color: "ORANGE",
    });
  }

  protected get channel() {
    return this.getChannel(inviteListChannelId, "invite list");
  }
}
