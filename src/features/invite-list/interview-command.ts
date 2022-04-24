import { CacheType, CommandInteraction } from "discord.js";
import { Command, getOption } from "../../shared/command/command";
import { dataSource } from "../../db/data-source";
import { Class, classes } from "../../shared/classes";
import { Invite } from "../../db/invite";
import { updateInviteListInfo } from "./update-action";

enum Option {
  Name = "name",
  Class = "class",
  Level = "level",
}

const classChoices: [name: string, value: string][] = classes.map((c) => [
  c,
  c,
]);

// todo: dry this up; see invite-command
class InterviewCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const name = String(
      getOption(Option.Name, interaction)?.value
    ).toLowerCase();
    const className = getOption(Option.Class, interaction)?.value;
    const level = getOption(Option.Level, interaction)?.value;

    // check that the name isn't already tracked
    const invites = await dataSource.getRepository(Invite).findBy({
      name,
      interviewed: false,
      canceled: false,
    });
    if (invites.length) {
      throw new Error(`${name} is already being tracked.`);
    }

    const invite = new Invite();
    invite.name = name;
    invite.byUserId = interaction.user.id;
    if (level) {
      invite.level = Number(level);
    }
    if (className) {
      invite.class = className as Class;
    }

    await dataSource.manager.save(invite);

    interaction.editReply(`Needs interview: ${invite.richLabel}`);

    await updateInviteListInfo(interaction.client);
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
