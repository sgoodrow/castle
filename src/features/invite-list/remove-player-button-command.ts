import { ButtonInteraction, CacheType } from "discord.js";
import { dataSource } from "../../db/data-source";
import { InviteSimple } from "../../db/invite-simple";
import { ButtonCommand } from "../../shared/command/button-command";
import { updateInviteListInfo } from "./update-invite-action";

class RemovePlayerInvite extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const discordId = interaction.user.id;
    const invite = await dataSource.getRepository(InviteSimple).findOneBy({
      discordId,
    });
    if (!invite) {
      throw new Error(`<@${discordId}> is not on the invite list.`);
    }
    await dataSource.manager.remove(invite);
    await updateInviteListInfo(interaction.client);
    interaction.reply({
      content: `Removed: ${invite.richLabel}`,
      ephemeral: true,
    });
  }
}

export const removePlayerInviteButtonCommand = new RemovePlayerInvite(
  "removePlayerInvite"
);
