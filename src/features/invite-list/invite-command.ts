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
  Note = "note",
}

const classChoices: [name: string, value: string][] = classes.map((c) => [
  c,
  c,
]);

class InviteCommand extends Command {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const name = String(
      getOption(Option.Name, interaction)?.value
    ).toLowerCase();
    const className = getOption(Option.Class, interaction)?.value;
    const level = getOption(Option.Level, interaction)?.value;
    const note = getOption(Option.Note, interaction)?.value;

    // check that the name isn't already tracked
    const invites = await dataSource.getRepository(Invite).findBy({
      name: name,
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
    if (note) {
      invite.note = String(note);
    }
    invite.interviewed = true;

    await dataSource.manager.save(invite);

    interaction.editReply(`Needs invite: ${invite.richLabel}`);

    await updateInviteListInfo(interaction.client);
  }

  public get builder() {
    return this.command
      .addStringOption((o) =>
        o
          .setName(Option.Name)
          .setDescription("The name of the character who needs an invite")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Class)
          .setDescription("The class of the character who needs an invite")
          .setChoices(classChoices)
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Level)
          .setMinValue(1)
          .setMaxValue(60)
          .setDescription("The level of the character who needs an invite")
      )
      .addStringOption((o) =>
        o
          .setName(Option.Note)
          .setDescription(
            "Additional information about the character, such as main name"
          )
      );
  }

  protected async getOptionAutocomplete() {
    return [];
  }
}

export const inviteCommand = new InviteCommand(
  "invite",
  "Add a character who needs an invite. Player should already have been interviewed. Use for alts."
);
