import { ButtonInteraction, CacheType, Permissions } from "discord.js";
import { getGuild } from "../..";
import { guildId, inviteListChannelId } from "../../config";
import { dataSource } from "../../db/data-source";
import { InviteSimple } from "../../db/invite-simple";
import { ButtonCommand } from "../../shared/command/button-command";
import {
  getChannel,
  requireInteractionMemberPermission,
} from "../../shared/command/util";
import { HOURS } from "../../shared/time";

class PingInviteListCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const inviteListChannel = await getChannel(
      inviteListChannelId,
      interaction
    );

    if (!inviteListChannel?.isText()) {
      throw new Error("The invite list channel is not a text channel.");
    }

    requireInteractionMemberPermission(
      Permissions.FLAGS.MANAGE_ROLES,
      interaction
    );

    await interaction.deferReply({
      ephemeral: false,
    });

    const users = await this.getPendingInviteUsers();
    if (!users.length) {
      throw new Error("There is nobody to invite.");
    }

    const guild = await getGuild();
    const statuses = await Promise.all(
      users.map((u) => guild.members.cache.get(u)?.presence?.status)
    );

    const alert = `**${interaction.member?.user} is available to send invites!**

Attention: ${users
      .map((u, i) => `<@${u}> (${statuses[i] || "unknown"})`)
      .join(" ")}`;

    await interaction
      .editReply({ content: alert })
      .then(() => setTimeout(() => interaction.deleteReply(), 1 * HOURS));
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
