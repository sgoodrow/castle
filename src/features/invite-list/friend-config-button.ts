import { ButtonInteraction, CacheType } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { ButtonCommand } from "../../shared/command/button-command";
import { sortInvites } from "./update-action";

class FriendConfigButtonCommand extends ButtonCommand {
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
        "Cannot create a friend config because there's nobody to contact."
      );
    }

    const sorted = pending.sort(sortInvites);
    const config = `[Friends]
${sorted
  .slice(0, 100)
  .map((p, i) => p.getFriendEntry(i + 1))
  .join("\n")}`;
    await interaction.reply({
      content: `Friend config:
${config}`,
      ephemeral: true,
    });
  }
}

export const friendConfigButtonCommand = new FriendConfigButtonCommand(
  "friendconfig"
);
