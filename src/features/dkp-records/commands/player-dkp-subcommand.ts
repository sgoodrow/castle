import {
  AttachmentBuilder,
  CacheType,
  CommandInteraction,
  TimestampStyles,
  time,
} from "discord.js";
import { castledkp } from "../../../services/castledkp";
import { Subcommand } from "../../../shared/command/subcommand";
import { code } from "../../../shared/util";

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
    const net = points.currentDkp;
    const result =
      net === 0
        ? "0"
        : net > 0
        ? `+                      ${net}`
        : `-                      ${net}`;
    await interaction.editReply({
      content: `**${points.characterName}** DKP as of ${time(
        Date.now(),
        TimestampStyles.ShortDateTime
      )}${code}diff
+ DKP Earned          ${points.lifetimeDkp}
- DKP Spent           ${points.spentDkp}
----------------------------
${result}${code}`,
    });
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
