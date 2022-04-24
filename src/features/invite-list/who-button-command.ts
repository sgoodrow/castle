import { ButtonInteraction, CacheType } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { ButtonCommand } from "../../shared/command/button-command";
import { sortInvites } from "./update-action";

// todo: dry this up, see friend-config-button
class WhoButtonCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const pending = await dataSource.getRepository(Invite).find({
      where: [
        {
          canceled: false,
          interviewed: false,
        },
        {
          canceled: false,
          invited: false,
        },
      ],
    });
    if (!pending.length) {
      throw new Error(
        "Cannot create a /who list because there's nobody to contact."
      );
    }

    const whos = pending
      .sort(sortInvites)
      .map((p) => `/who all ${p.name}`)
      .join("\n");

    await interaction.reply({
      content: `Sorted by highest priority (mains > alts, invites > interviews, old > new):
${whos}`,
      ephemeral: true,
    });
  }
}

export const whoButtonCommand = new WhoButtonCommand("whoinvite");
