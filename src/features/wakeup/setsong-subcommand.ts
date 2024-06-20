import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { IPublicAccountService } from "../../services/bot/public-accounts.i";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";
import { authorizeByMemberRoles } from "../../shared/command/util";
import { officerRoleId, knightRoleId } from "../../config";
import { redisClient } from "../../redis/client";

export enum SetSongOption {
  URL = "url",
}
export class SetSongSubcommand extends Subcommand {
  
  constructor(name: string, description: string) {
    super(name, description);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const URL = this.getRequiredOptionValue(
      SetSongOption.URL,
      interaction
    ) as string;

    try {
      authorizeByMemberRoles([officerRoleId, knightRoleId], interaction);
      redisClient.hSet("wakeup", "song", URL);
    } catch (error) {
      await interaction.editReply(`Failed to edit song: ${error}`);
    }
  }

  public get command() {
    const command = super.command.addStringOption((o) =>
      o
        .setName(SetSongOption.URL)
        .setDescription("URL of the media to play for wake up")
        .setAutocomplete(false)
        .setRequired(true)
    );
    return command;
  }

  public getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<
    ApplicationCommandOptionChoiceData<string | number>[] | undefined
  > {
    throw new Error("Method not implemented.");
  }
}

export const setSongSubCommand = new SetSongSubcommand(
  "setsong",
  "Sets the wakeup song (be nice)"
);
