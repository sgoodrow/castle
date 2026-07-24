import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { eqnotifyService } from "../eqnotify.service";

export enum Option {
  Tag = "tag",
}

class RemoveTagSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const rawTag = this.getRequiredOptionValue<string>(Option.Tag, interaction);
    const tag = await eqnotifyService.removeTag(interaction.user.id, rawTag);
    await interaction.editReply(
      `\`${tag}\` has been removed from your notification tags.`
    );
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.Tag)
        .setDescription("The keyword to stop being notified for.")
        .setRequired(true)
        .setAutocomplete(true)
    );
  }

  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ) {
    if (option !== Option.Tag) {
      return undefined;
    }
    const subscriber = await eqnotifyService.getSubscriber(interaction.user.id);
    return subscriber?.tags.map((tag) => ({ name: tag, value: tag }));
  }
}

export const removeTagSubcommand = new RemoveTagSubcommand(
  "remove-tag",
  "Remove a keyword from your notification tags."
);
