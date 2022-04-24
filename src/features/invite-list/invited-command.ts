import { CacheType, CommandInteraction } from "discord.js";
import { Command, getOption } from "../../shared/command/command";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { updateInviteListInfo } from "./update-action";

enum Option {
  InviteId = "inviteid",
}

class InvitedCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const id = Number(getOption(Option.InviteId, interaction)?.value);

    const invite = await dataSource.getRepository(Invite).findOneBy({
      id,
    });
    if (!invite) {
      return;
    }

    invite.invited = true;

    await dataSource.manager.save(invite);

    interaction.editReply(`Interviewed: ${invite.capitalizedName}`);

    await updateInviteListInfo(interaction.client);
  }

  public get builder() {
    return this.command.addStringOption((o) =>
      o
        .setName(Option.InviteId)
        .setDescription("The ID of the invite who was interviewed")
        .setAutocomplete(true)
        .setRequired(true)
    );
  }

  protected async getOptionAutocomplete() {
    const invites = await dataSource.getRepository(Invite).findBy({
      interviewed: true,
      invited: false,
      canceled: false,
    });
    return invites.map((i) => ({
      name: i.capitalizedName,
      value: String(i.id),
    }));
  }
}

export const invitedCommand = new InvitedCommand(
  "invited",
  "After inviting a player, mark them as invited."
);
