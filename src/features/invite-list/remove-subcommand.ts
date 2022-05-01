import { CacheType, CommandInteraction } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { updateInviteListInfo } from "./update-action";
import { Subcommand } from "../../shared/command/subcommand";

enum Option {
  InviteId = "inviteid",
}

class Remove extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const id = Number(this.getOption(Option.InviteId, interaction)?.value);

    const invite = await dataSource.getRepository(Invite).findOneBy({
      id,
    });
    if (!invite) {
      return;
    }

    invite.canceled = true;

    await dataSource.manager.save(invite);

    interaction.editReply(`Removed: ${invite.capitalizedName}`);

    await updateInviteListInfo(interaction.client);
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.InviteId)
        .setDescription("The ID of the invite to remove")
        .setAutocomplete(true)
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete() {
    const invites = await dataSource.getRepository(Invite).find({
      where: [
        {
          interviewed: false,
          canceled: false,
        },
        {
          invited: false,
          canceled: false,
        },
      ],
    });
    return invites.map((i) => ({
      name: i.capitalizedName,
      value: String(i.id),
    }));
  }
}

export const removeSubcommand = new Remove(
  "remove",
  "Remove someone who is no longer interested."
);
