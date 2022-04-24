import { CacheType, CommandInteraction, Permissions } from "discord.js";
import { Command, getOption } from "../../shared/command/command";
import { dataSource } from "../../db/data-source";
import { Class, classes } from "../../shared/classes";
import { Invite } from "../../db/invite";
import { updateInviteListInfo } from "./update-action";

enum Option {
  Name = "name",
  Class = "class",
  Level = "level",
  Main = "main",
}

const classChoices: [name: string, value: string][] = classes.map((c) => [
  c,
  c,
]);

class InviteCommand extends Command {
  public constructor(
    name: string,
    description: string,
    private readonly requireMain: boolean
  ) {
    super(name, description);
  }
  public async execute(interaction: CommandInteraction<CacheType>) {
    this.requireInteractionMemberPermission(
      Permissions.FLAGS.MANAGE_ROLES,
      interaction
    );

    const name = String(
      getOption(Option.Name, interaction)?.value
    ).toLowerCase();
    const className = getOption(Option.Class, interaction)?.value;
    const level = getOption(Option.Level, interaction)?.value;
    const main = getOption(Option.Main, interaction)?.value;

    // check that the name isn't already tracked
    const invites = await dataSource.getRepository(Invite).findBy({
      name,
      invited: false,
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
    if (main) {
      invite.main = String(main);
    }
    invite.interviewed = true;

    await dataSource.manager.save(invite);

    interaction.editReply(`Needs invite: ${invite.richLabel}`);

    await updateInviteListInfo(interaction.client);
  }

  public get builder() {
    const command = this.command.addStringOption((o) =>
      o
        .setName(Option.Name)
        .setDescription("The name of the character who needs an invite")
        .setRequired(true)
    );
    if (this.requireMain) {
      command.addStringOption((o) =>
        o
          .setName(Option.Main)
          .setDescription("The name of the player's main, if this is an alt")
          .setRequired(this.requireMain)
      );
    }

    return command
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
      );
  }

  protected async getOptionAutocomplete() {
    return [];
  }
}

export const inviteCommand = new InviteCommand(
  "invite",
  "Add a character who needs an invite. Player should already have been interviewed.",
  false
);

export const altCommand = new InviteCommand(
  "alt",
  "Adds an alt who needs an invite.",
  true
);
