import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { eqnotifyService } from "../eqnotify.service";

class ClearTagsSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    await eqnotifyService.clearTags(interaction.user.id);
    await interaction.editReply(
      "Your notification tags have been cleared. You won't be alerted for any batphones until you add tags again."
    );
  }

  public async getOptionAutocomplete(
    _option: string,
    _interaction: AutocompleteInteraction<CacheType>
  ) {
    return undefined;
  }
}

export const clearTagsSubcommand = new ClearTagsSubcommand(
  "clear-tags",
  "Remove all of your notification tags."
);
