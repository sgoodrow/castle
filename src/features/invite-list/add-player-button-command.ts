import { ButtonInteraction, CacheType } from "discord.js";
import { dataSource } from "@db/data-source";
import { InviteSimple } from "@db/invite-simple";
import { ButtonCommand } from "@shared/command/button-command";
import { updateInviteListInfo } from "./update-invite-action";
import { checkInvite } from "./util";

class AddPlayerButton extends ButtonCommand {
  public constructor(
    public readonly customId: string,
    public readonly alt = false
  ) {
    super(customId);
  }

  public async execute(interaction: ButtonInteraction<CacheType>) {
    await checkInvite(interaction.user.id);
    const invite = new InviteSimple();
    invite.discordId = interaction.user.id;
    invite.alt = this.alt;
    await dataSource.manager.save(invite);
    await updateInviteListInfo(interaction.client);

    interaction.reply({
      content: `Added: ${invite.richLabel}`,
      ephemeral: true,
    });
  }
}

export const addPlayerInviteButtonCommand = new AddPlayerButton(
  "addPlayerInvite"
);

export const addAltInviteButtonCommand = new AddPlayerButton(
  "addAltInvite",
  true
);
