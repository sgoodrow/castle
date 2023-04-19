import {
  Client,
  Collection,
  GuildMember,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  ButtonStyle,
  Colors,
} from "discord.js";
import { getMembers } from "../..";
import { inviteListChannelId } from "../../config";
import { dataSource } from "../../db/data-source";
import { Name } from "../../db/instructions";
import { InviteSimple } from "../../db/invite-simple";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import {
  addAltInviteButtonCommand,
  addPlayerInviteButtonCommand,
} from "./add-player-button-command";
import { removePlayerInviteButtonCommand } from "./remove-player-button-command";
import { sortInvites } from "./util";
import { invitedCommand } from "./command";
import { addSubcommand } from "./add-subcommand";
import { removeSubcommand } from "./remove-subcommand";
import { pingInviteListButtonCommand } from "./ping-invite-list-button-command";
import { cleanupInvitesCommand } from "./cleanup-invites-command";

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
          await this.getCommandInstructions(),
          await this.getInviteEmbed(members),
          await this.getTldrEmbed(),
        ],
        components: [await this.getButtons()],
      },
      Name.InviteListInstructions
    );
  }

  private async getCommandInstructions() {
    return new EmbedBuilder({
      title: "Guard Commands",
    }).addFields([
      {
        name: `/${invitedCommand.name} ${addSubcommand.name}`,
        value: addSubcommand.description,
      },
      {
        name: `/${invitedCommand.name} ${removeSubcommand.name}`,
        value: removeSubcommand.description,
      },
      {
        name: "✅ a message",
        value:
          "Deletes all messages from the player in the channel AND all replies to their messages from anyone.",
      },
    ]);
  }

  private async getFAQ() {
    return new EmbedBuilder({
      title: "Frequently Asked Questions",
      description: `**Someone wants to join, what do I tell them?**
Tell them to introduce themselves in our Discord (https://tinyurl.com/castle-discord). A guard will give them a brief interview.

**I need an invite in-game, how do I get one?**
Hit the button to add yourself to the invite list. A Guard or Officer will contact you in the future when they're doing invites in-game. After you get an invite, remove yourself from the list.

**I'm on the invite list, now what?**
A guard or officer will notify you in Discord when they are performing invites. If you do not get an invite within 2 weeks, you will be removed from the invite list and need to ask for Discord access again.`,
    });
  }

  private async getButtons() {
    return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(addPlayerInviteButtonCommand.customId)
        .setStyle(ButtonStyle.Primary)
        .setLabel("Add Self to Invite List"),
      new ButtonBuilder()
        .setCustomId(addAltInviteButtonCommand.customId)
        .setStyle(ButtonStyle.Primary)
        .setLabel("Add Alt to Invite List"),
      new ButtonBuilder()
        .setCustomId(removePlayerInviteButtonCommand.customId)
        .setStyle(ButtonStyle.Secondary)
        .setLabel("Remove from Invite List"),
      new ButtonBuilder()
        .setCustomId(pingInviteListButtonCommand.customId)
        .setStyle(ButtonStyle.Success)
        .setLabel("Inviter Is In"),
      new ButtonBuilder()
        .setCustomId(cleanupInvitesCommand.customId)
        .setStyle(ButtonStyle.Danger)
        .setLabel("Cleanup Old")
    );
  }

  private async getInviteEmbed(members: Members) {
    const needInvite = await dataSource.getRepository(InviteSimple).findBy({});
    return new EmbedBuilder({
      title: `Need Invite (${needInvite.length})`,
      description: needInvite
        .sort(sortInvites)
        .map((n) => `• ${n.getRichLabel(members)}`)
        .join("\n"),
    });
  }

  private async getTldrEmbed() {
    return new EmbedBuilder({
      title: "⚠️ TL;DR",
      description: `Add yourself to the invite list and coordinate here for an invite. If you don't get one in 2 weeks, you will need to ask for Discord access again.`,
      color: Colors.Orange,
    });
  }

  protected get channel() {
    return this.getChannel(inviteListChannelId, "invite list");
  }
}
