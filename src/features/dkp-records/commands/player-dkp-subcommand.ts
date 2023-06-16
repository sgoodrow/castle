import {
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
  Spam = "spam",
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
    const spam = this.getOptionValue<boolean>(Option.Spam, interaction);
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
        ? `+                     ${net}`
        : `-                     ${net}`;
    const content = `**${points.characterName}** DKP as of ${time(
      Date.now(),
      TimestampStyles.ShortDateTime
    )}${code}diff
+ DKP Earned          ${points.lifetimeDkp}
- DKP Spent           ${points.spentDkp}
----------------------------
${result}${code}`;

    if (spam) {
      await interaction.channel?.send({ content });
      await interaction.editReply({

        content: "Done.",
     });
    } else {
      await interaction.editReply({
        content,
      });
    }
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(Option.Character)
          .setDescription(
            "The name of the character whose points you want to review."
          )
          .setRequired(true)
      )
      .addBooleanOption((o) =>
        o
          .setName(Option.Spam)
          .setDescription(
            "Set to true if you want the response to be sent to the entire channel."
          )
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
