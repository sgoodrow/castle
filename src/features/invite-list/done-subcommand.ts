import { CacheType, CommandInteraction, Permissions } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { updateInviteListInfo } from "./update-action";
import { Subcommand } from "../../shared/command/subcommand";

enum Option {
  InviteId = "inviteid",
}

class Done extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    this.requireInteractionMemberPermission(
      Permissions.FLAGS.MANAGE_ROLES,
      interaction
    );

    const id = Number(this.getOption(Option.InviteId, interaction)?.value);
    const invite = await dataSource.getRepository(Invite).findOneBy({
      id,
    });
    if (!invite) {
      return;
    }

    invite.invited = true;
    invite.interviewed = true;

    await dataSource.manager.save(invite);

    interaction.editReply(`Invited: ${invite.capitalizedName}`);

    await updateInviteListInfo(interaction.client);
  }

  public get command() {
    return super.command.addIntegerOption((o) =>
      o
        .setName(Option.InviteId)
        .setDescription("The ID of the invite who was interviewed")
        .setAutocomplete(true)
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete() {
    const invites = await dataSource.getRepository(Invite).findBy({
      invited: false,
      canceled: false,
    });
    return invites.map((i) => ({
      name: i.capitalizedName,
      value: i.id,
    }));
  }
}

export const doneSubcommand = new Done(
  "done",
  "After inviting a character, mark their invitation as done."
);
