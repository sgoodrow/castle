import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { eqnotifyService } from "../eqnotify.service";

class ListTagsSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const subscriber = await eqnotifyService.requireSubscriber(
      interaction.user.id
    );
    const channel = subscriber.type === "telegram" ? "Telegram" : "WirePusher";
    if (subscriber.tags.length === 0) {
      await interaction.editReply(
        `You have no notification tags, so you won't be alerted for any batphones. Delivery channel: **${channel}**.`
      );
      return;
    }
    await interaction.editReply(
      `Delivery channel: **${channel}**.\nYour current notification tags are: ${subscriber.tags
        .map((t) => `\`${t}\``)
        .join(", ")}`
    );
  }

  public async getOptionAutocomplete(
    _option: string,
    _interaction: AutocompleteInteraction<CacheType>
  ) {
    return undefined;
  }
}

export const listTagsSubcommand = new ListTagsSubcommand(
  "list-tags",
  "List the keywords you're currently notified for."
);
