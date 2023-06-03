import { AttachmentBuilder, CacheType, CommandInteraction } from "discord.js";
import { castledkp } from "../../../services/castledkp";
import { Subcommand } from "../../../shared/command/subcommand";

enum Option {
  Character = "character",
}

export class PlayerDkpSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const characterName = this.getRequiredOptionValue<string>(
      Option.Character,
      interaction
    );
    const character = await castledkp.getCharacter(characterName);
    if (!character) {
      throw new Error(`Character ${characterName} does not exist.`);
    }
    const points = await castledkp.getPointsByCharacter(character.id);

    await interaction.channel?.send({
      files: [
        {
          name: `Points for ${characterName}`,
          contentType: "application/json",
          attachment: Buffer.from(JSON.stringify(points)),
        },
      ],
    });
    await interaction.editReply("Done");
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.Character)
        .setDescription(
          "The name of the character whose points you want to review."
        )
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete() {
    return [];
  }
}

export const getPlayerDkpSubcommand = new PlayerDkpSubcommand(
  "playerdkp",
  "Gets a player's DKP details."
);
