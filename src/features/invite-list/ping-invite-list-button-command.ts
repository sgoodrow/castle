import { ButtonInteraction, CacheType, Permissions } from "discord.js";
import { getGuild } from "../..";
import { inviteListChannelId } from "../../config";
import { dataSource } from "../../db/data-source";
import { InviteSimple } from "../../db/invite-simple";
import { ButtonCommand } from "../../shared/command/button-command";
import {
  getChannel,
  requireInteractionMemberPermission,
} from "../../shared/command/util";
import { HOURS } from "../../shared/time";

const getPresenceIcon = (status = "unknown") => {
  switch (status) {
    case "online":
      return "🟢";
    case "idle":
      return "🟠";
    case "offline":
      return "⭕";
    case "unknown":
      return "⭕";
  }
};

export const getAttentionMessage = async (users: string[]) => {
  if (!users.length) {
    throw new Error("There is nobody to alert.");
  }

  const guild = await getGuild();
  const statuses = await Promise.all(
    users.map(async (user) => {
      const { presence } = await guild.members.fetch({
        user,
        withPresences: true,
      });
      return {
        user,
        status: getPresenceIcon(presence?.status),
      };
    })
  );

  return `Attention:
${statuses.map(({ user, status }) => `${status} <@${user}>`).join("\n")}`;
};

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

    const users = await this.getPendingInviteUsers();
    const attention = await getAttentionMessage(users);

    const alert = `**${interaction.member?.user} is available to send invites!**

${attention}`;

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
