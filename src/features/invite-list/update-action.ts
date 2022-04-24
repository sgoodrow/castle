import { Client, MessageEmbed } from "discord.js";
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
import { interviewCommand } from "./interview-command";
import { interviewedCommand } from "./interviewed-command";
import { inviteCommand } from "./invite-command";
import { invitedCommand } from "./invited-command";
import { removeCommand } from "./remove-command";

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
      },
      Name.InviteListInstructions
    );
  }

  private async getCastleMemberInstructionsEmbed() {
    return new MessageEmbed({
      title: "Castle Member Instructions",
      description: `Use the following commands to invite players to the guild.`,
      color: "RED",
    }).addFields([
      {
        name: `/${interviewCommand.name}`,
        value: interviewCommand.description,
      },
      {
        name: `/${inviteCommand.name}`,
        value: inviteCommand.description,
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
      .findBy({ interviewed: false, canceled: false });
    return new MessageEmbed({
      title: "Need Interview",
      description: needInterview
        .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
        .map((n) => `• ${n.richLabel}`)
        .join("\n"),
    });
  }

  private async getInviteEmbed() {
    const needInvite = await dataSource
      .getRepository(Invite)
      .findBy({ interviewed: true, invited: false, canceled: false });
    return new MessageEmbed({
      title: "Need Invite",
      description: needInvite
        .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
        .map((n) => `• ${n.richLabel}`)
        .join("\n"),
    });
  }

  private async getTldrEmbed() {
    return new MessageEmbed({
      title: "⚠️ TL;DR",
      description: `Use the commands to add or remove someone from the interview or invite list. A guard will follow up with the player.

_last updated <t:${moment().unix()}:R>_`,
      color: "ORANGE",
    });
  }

  protected get channel() {
    return this.getChannel(inviteListChannelId, "invite list");
  }
}
