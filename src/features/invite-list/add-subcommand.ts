import { CacheType, CommandInteraction } from "discord.js";
import { dataSource } from "../../db/data-source";
import { updateInviteListInfo } from "./update-invite-action";
import { Subcommand } from "../../shared/command/subcommand";
import { InviteSimple } from "../../db/invite-simple";
import { checkInvite } from "./util";

enum Option {
  DiscordUser = "discordid",
  Alt = "alt",
}

class Add extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const discordId = this.getOption(Option.DiscordUser, interaction)?.user?.id;
    if (!discordId) {
      throw new Error(`A discord ID is required.`);
    }
    await checkInvite(discordId);

    const invite = new InviteSimple();
    invite.discordId = discordId;
    invite.alt = Boolean(this.getOption(Option.Alt, interaction)?.value);
    await dataSource.manager.save(invite);
    interaction.editReply(`Added: ${invite.richLabel}`);
    await updateInviteListInfo(interaction.client);
  }

  public get command() {
    return super.command
      .addUserOption((o) =>
        o
          .setName(Option.DiscordUser)
          .setDescription("The Discord user to remove")
          .setRequired(true)
      )
      .addBooleanOption((o) =>
        o.setName(Option.Alt).setDescription("If the invite is for an alt.")
      );
  }

  public async getOptionAutocomplete() {
    return [];
  }
}

export const addSubcommand = new Add("add", "Add someone to the invite list.");
