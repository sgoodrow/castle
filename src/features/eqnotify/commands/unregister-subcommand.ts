import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { eqnotifyService } from "../eqnotify.service";

class UnregisterSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    await eqnotifyService.requireSubscriber(interaction.user.id);
    await eqnotifyService.remove(interaction.user.id);
    await interaction.editReply(
      "You've been removed from EQNotify and will no longer receive batphone alerts."
    );
  }

  public async getOptionAutocomplete(
    _option: string,
    _interaction: AutocompleteInteraction<CacheType>
  ) {
    return undefined;
  }
}

export const unregisterSubcommand = new UnregisterSubcommand(
  "unregister",
  "Remove yourself from EQNotify."
);
