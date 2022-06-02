import { CacheType, CommandInteraction } from "discord.js";
import { dataSource } from "src/db/data-source";
import { updateInviteListInfo } from "./update-invite-action";
import { Subcommand } from "src/shared/command/subcommand";
import { InviteSimple } from "src/db/invite-simple";

enum Option {
  DiscordUser = "discordid",
}

class Remove extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const discordId = this.getOption(Option.DiscordUser, interaction)?.user?.id;

    const invite = await dataSource.getRepository(InviteSimple).findOneBy({
      discordId,
    });
    if (!invite) {
      throw new Error(`<@${discordId}> is not on the invite list.`);
    }

    await dataSource.manager.remove(invite);
    interaction.editReply(`Removed: ${invite.richLabel}`);
    await updateInviteListInfo(interaction.client);
  }

  public get command() {
    return super.command.addUserOption((o) =>
      o
        .setName(Option.DiscordUser)
        .setDescription("The Discord user to remove")
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete() {
    return [];
  }
}

export const removeSubcommand = new Remove(
  "remove",
  "Remove someone from the invite list."
);
