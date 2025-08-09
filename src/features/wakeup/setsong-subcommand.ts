import { ApplicationCommandOptionChoiceData, CacheType, CommandInteraction } from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
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
    const URL = this.getRequiredOptionValue(SetSongOption.URL, interaction) as string;

    try {
      authorizeByMemberRoles([officerRoleId, knightRoleId], interaction);
      redisClient.hSet("wakeup", "song", URL);
      await interaction.editReply("Edited song to " + URL);
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

  public getOptionAutocomplete(): Promise<
    ApplicationCommandOptionChoiceData<string | number>[] | undefined
  > {
    throw new Error("Method not implemented.");
  }
}

export const setSongSubCommand = new SetSongSubcommand("setsong", "Sets the wakeup song (be nice)");
