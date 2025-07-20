import { ButtonInteraction, CacheType, PermissionFlagsBits } from "discord.js";
import { partition } from "lodash";
import { membersAndAlliesRoleId } from "../../config";
import { dataSource } from "../../db/data-source";
import { InviteSimple } from "../../db/invite-simple";
import { ButtonCommand } from "../../shared/command/button-command";
import { requireInteractionMemberPermission } from "../../shared/command/util";
import { updateInviteListInfo } from "./update-invite-action";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const WEEKS = 7 * DAYS;

const OLD_LIMIT = 2 * WEEKS;

class CleanupInvitesCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    requireInteractionMemberPermission(PermissionFlagsBits.ManageRoles, interaction);

    const oldInvites = await this.getOldInvites();
    if (!oldInvites.length) {
      throw new Error("There is nobody to clean up.");
    }

    const [altInvites, mainInvites] = partition(oldInvites, (o) => o.alt);

    await interaction.guild?.members.fetch();
    await this.removeMains(mainInvites, interaction);
    await this.removeAlts(altInvites, interaction);
    const removed = await this.removeFromInviteList(oldInvites);

    // summarize
    await interaction.editReply({
      content: `Cleanup removed the following invites:
${removed}
`,
    });

    // update
    await updateInviteListInfo(interaction.client);
  }

  protected getUsers(invites: InviteSimple[], interaction: ButtonInteraction<CacheType>) {
    const discordIds = [...new Set(invites.map((i) => i.discordId))];
    return interaction.guild?.members.cache?.filter((m) => discordIds.includes(m.id));
  }

  protected async removeMains(
    mainInvites: InviteSimple[],
    interaction: ButtonInteraction<CacheType>
  ) {
    this.getUsers(mainInvites, interaction)?.forEach((u) => {
      u.roles.remove([membersAndAlliesRoleId]);
      u.send(`Hello friend 👋! You were found to be on the <Castle> Discord's invite-list for more than 2 weeks.
    
To keep track of who has been invited, we automatically remove players on the invite list if they've been pending for 2 weeks, and remove their Discord permissions.

**We still want you to join Castle!** Please drop by the #gatehouse channel and let us know you're still interested.

If you are already in Castle and intended to have an alt invited, just let us know that's what happened, and use the "Add Alt to Invite List" button next time.

Thank you!`);
    });
  }

  protected async removeAlts(
    altInvites: InviteSimple[],
    interaction: ButtonInteraction<CacheType>
  ) {
    this.getUsers(altInvites, interaction)?.forEach((u) => {
      u.send(`Hello <Castle> member! You have had a request to have an alt added to the invite-list for more than 2 weeks.
      
To keep track of who has been invited, we automatically remove invite requests that have been pending for 2 weeks.

**You are still welcome to have your alts in Castle!** Please drop by the #invite-list channel and add your alt(s) again.

Thank you!`);
    });
  }

  protected async removeFromInviteList(oldInvites: InviteSimple[]) {
    dataSource.manager.remove(oldInvites);
    return oldInvites.map((i) => `• ${i.richLabel}`).join("\n");
  }

  private async getOldInvites() {
    const inviteRepository = dataSource.getRepository(InviteSimple);
    const invites = await inviteRepository.findBy({});
    const now = new Date().getTime();
    return invites.filter((i) => Number(now - i.createdAt.getTime()) > OLD_LIMIT);
  }
}

export const cleanupInvitesCommand = new CleanupInvitesCommand("cleanupInvites");
