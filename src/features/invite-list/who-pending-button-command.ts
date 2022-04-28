import { ButtonInteraction, CacheType } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { ButtonCommand } from "../../shared/command/button-command";
import { sortInvites } from "./update-action";

export abstract class PendingButtonCommand extends ButtonCommand {
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

    await interaction.reply({
      content: this.getContent(pending.sort(sortInvites)),
      ephemeral: true,
    });
  }

  protected abstract getContent(pending: Invite[]): string;
}
