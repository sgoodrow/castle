import {
  Client,
  Collection,
  GuildMember,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import { getMembers } from "../../index";
import { inviteListChannelId } from "@shared/config";
import { dataSource } from "@db/data-source";
import { Name } from "@db/instructions";
import { InviteSimple } from "@db/invite-simple";
import { InstructionsReadyAction } from "@shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "@shared/action/ready-action";
import {
  addAltInviteButtonCommand,
  addPlayerInviteButtonCommand,
} from "./add-player-button-command";
import { removePlayerInviteButtonCommand } from "./remove-player-button-command";
import { sortInvites } from "./util";

export const updateInviteListInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateInviteListInfoAction(client), options);

export declare type Members = Collection<string, GuildMember> | undefined;

class UpdateInviteListInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    const members = await getMembers();
    await this.createOrUpdateInstructions(
      {
        embeds: [
          await this.getFAQ(),
          await this.getInviteEmbed(members),
          await this.getTldrEmbed(),
        ],
        components: [await this.getButtons()],
      },
      Name.InviteListInstructions
    );
  }

  private async getFAQ() {
    return new MessageEmbed({
      title: "Frequently Asked Questions",
      description: `**Someone wants to join, what do I tell them?**
Tell them to introduce themselves in our Discord (https://tinyurl.com/castle-discord) and ask for an interview.

**I need an invite in-game, how do I get one?**
Post in this channel when you are available to meet up for an invite, and add yourself to the invite list using the buttons below so that a Guard or Officer can contact you in the future if they're not available now.

**I'm on the invite list, now what?**
A guard or officer will notify you in Discord when they are performing invites. If you do not get an invite within 2 weeks, you will be removed from the invite list and need to ask for Discord access again.`,
    });
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(addPlayerInviteButtonCommand.customId)
        .setStyle("PRIMARY")
        .setLabel("Add Self to Invite List"),
      new MessageButton()
        .setCustomId(addAltInviteButtonCommand.customId)
        .setStyle("SECONDARY")
        .setLabel("Add Alt to Invite List"),
      new MessageButton()
        .setCustomId(removePlayerInviteButtonCommand.customId)
        .setStyle("DANGER")
        .setLabel("Remove from Invite List")
    );
  }

  private async getInviteEmbed(members: Members) {
    const needInvite = await dataSource.getRepository(InviteSimple).findBy({});
    return new MessageEmbed({
      title: `Need Invite (${needInvite.length})`,
      description: needInvite
        .sort(sortInvites)
        .map((n) => `• ${n.getRichLabel(members)}`)
        .join("\n"),
    });
  }

  private async getTldrEmbed() {
    return new MessageEmbed({
      title: "⚠️ TL;DR",
      description: `Add yourself to the invite list and coordinate here for an invite. If you don't get one in 2 weeks, you will need to ask for Discord access again.`,
      color: "ORANGE",
    });
  }

  protected get channel() {
    return this.getChannel(inviteListChannelId, "invite list");
  }
}
