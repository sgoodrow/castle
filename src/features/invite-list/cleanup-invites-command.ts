import { ButtonInteraction, CacheType, Permissions } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { ButtonCommand } from "../../shared/command/button-command";
import { requireInteractionMemberPermission } from "../../shared/command/util";
import { updateInviteListInfo } from "./update-action";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const WEEKS = 7 * DAYS;

const OLD_LIMIT = 2 * WEEKS;

class CleanupInvitesCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    requireInteractionMemberPermission(
      Permissions.FLAGS.MANAGE_ROLES,
      interaction
    );

    const old = await this.getOldInvites();

    old.forEach((i) => (i.canceled = true));

    dataSource.manager.save(old);

    const removed = old.map((i) => `• ${i.richLabel}`).join("\n");

    await interaction.reply({
      content: `Cleanup removed the following invites:
${removed}
`,
      ephemeral: true,
    });

    await updateInviteListInfo(interaction.client);
  }

  public async disabled() {
    const old = await this.getOldInvites();
    return old.length === 0;
  }

  private async getOldInvites() {
    const inviteRepository = dataSource.getRepository(Invite);
    const invites = await inviteRepository.findBy({
      canceled: false,
      invited: false,
    });
    const now = new Date().getTime();
    return invites.filter(
      (i) => Number(now - i.createdAt.getTime()) > OLD_LIMIT
    );
  }
}

export const cleanupInvitesCommand = new CleanupInvitesCommand(
  "cleanupInvites"
);
