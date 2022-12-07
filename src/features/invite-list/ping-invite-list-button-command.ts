import { ButtonInteraction, CacheType, Permissions } from "discord.js";
import { greenInviteListChannelId } from "../../config";
import { dataSource } from "../../db/data-source";
import { InviteSimple } from "../../db/invite-simple";
import { ButtonCommand } from "../../shared/command/button-command";
import {
  getChannel,
  requireInteractionMemberPermission,
} from "../../shared/command/util";

class PingInviteListCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const inviteListChannel = await getChannel(
      greenInviteListChannelId,
      interaction
    );
    if (!inviteListChannel?.isText()) {
      throw new Error("The invite list channel is not a text channel.");
    }

    requireInteractionMemberPermission(
      Permissions.FLAGS.MANAGE_ROLES,
      interaction
    );

    const users = await this.getPendingInviteUsers();
    if (!users.length) {
      throw new Error("There is nobody to invite.");
    }

    await interaction.reply(`**${
      interaction.member?.user
    } is available to send invites!**

Attn: ${users.map((u) => `<@${u}>`).join(" ")}`);
  }

  private async getPendingInviteUsers() {
    const inviteRepository = dataSource.getRepository(InviteSimple);
    const invites = await inviteRepository.findBy({});
    return [...new Set(invites.map((i) => i.discordId))];
  }
}

export const pingInviteListButtonCommand = new PingInviteListCommand(
  "pingInviteList"
);
