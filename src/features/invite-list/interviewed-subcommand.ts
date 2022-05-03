import { CacheType, CommandInteraction, Permissions } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { updateInviteListInfo } from "./update-action";
import { Subcommand } from "../../shared/command/subcommand";
import { requireInteractionMemberPermission } from "../../shared/command/util";

enum Option {
  InviteId = "inviteid",
}

// dry this up, see remove and invited command
class Interviewed extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    requireInteractionMemberPermission(
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

    invite.interviewed = true;

    await dataSource.manager.save(invite);

    interaction.editReply(`Interviewed: ${invite.capitalizedName}`);

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
      interviewed: false,
      invited: false,
      canceled: false,
    });
    return invites.map((i) => ({
      name: i.capitalizedName,
      value: i.id,
    }));
  }
}

export const interviewedSubcommand = new Interviewed(
  "interviewed",
  "Mark a player as interviewed. This command will be removed when all pending interviews are done."
);
