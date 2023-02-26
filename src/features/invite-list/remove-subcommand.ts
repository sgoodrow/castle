import { CacheType, Client, CommandInteraction } from "discord.js";
import { dataSource } from "../../db/data-source";
import { updateInviteListInfo } from "./update-invite-action";
import { Subcommand } from "../../shared/command/subcommand";
import { InviteSimple } from "../../db/invite-simple";

enum Option {
  DiscordUser = "discordid",
}

export const removePlayer = async (discordId: string, client: Client) => {
  const invite = await dataSource.getRepository(InviteSimple).findOneBy({
    discordId,
  });
  if (!invite) {
    throw new Error(`<@${discordId}> is not on the invite list.`);
  }

  await dataSource.manager.remove(invite);
  await updateInviteListInfo(client);

  return invite.richLabel;
};

class Remove extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const discordId = this.getOption(Option.DiscordUser, interaction)?.user?.id;
    if (!discordId) {
      return;
    }

    const richLabel = await removePlayer(discordId, interaction.client);

    interaction.editReply(`Removed: ${richLabel}`);
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
