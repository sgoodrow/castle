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

class AddTagSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const rawTag = this.getRequiredOptionValue<string>(Option.Tag, interaction);
    const tag = await eqnotifyService.addTag(interaction.user.id, rawTag);
    await interaction.editReply(
      `\`${tag}\` has been added to your notification tags.`
    );
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.Tag)
        .setDescription(
          "Keyword to match at the start of a batphone word (e.g. 'doze' hits 'Dozekar'). Use 'all' for every batphone."
        )
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete(
    _option: string,
    _interaction: AutocompleteInteraction<CacheType>
  ) {
    return undefined;
  }
}

export const addTagSubcommand = new AddTagSubcommand(
  "add-tag",
  "Add a keyword you want to be notified for."
);
