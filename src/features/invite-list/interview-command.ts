import { CacheType, CommandInteraction } from "discord.js";
import { Command } from "../../shared/command/command";
import { newInvite, classChoices, Option } from "./util";

class InterviewCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const invite = await newInvite(interaction);
    interaction.editReply(`Needs interview: ${invite.richLabel}`);
  }

  public get builder() {
    return this.command
      .addStringOption((o) =>
        o
          .setName(Option.Name)
          .setDescription("The name of the player who needs an interview")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Class)
          .setDescription("The class of the player who needs an interview")
          .setChoices(classChoices)
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Level)
          .setMinValue(1)
          .setMaxValue(60)
          .setDescription("The level of the player who needs an interview")
      );
  }

  protected async getOptionAutocomplete() {
    return [];
  }
}

export const interviewCommand = new InterviewCommand(
  "interview",
  "Add a player who needs an interview from an Officer or Guard."
);
