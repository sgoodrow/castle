import { CacheType, CommandInteraction } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { Class, classes } from "../../shared/classes";
import { Subcommand } from "../../shared/command/subcommand";
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

interface NewInviteOptions {
  main?: string;
  interviewed?: boolean;
}

class Add extends Subcommand {
  public constructor(
    name: string,
    description: string,
    private readonly requireMain: boolean
  ) {
    super(name, description);
  }
  public async execute(interaction: CommandInteraction<CacheType>) {
    const main = this.getOption(Option.Main, interaction)?.value;
    const invite = await this.newInvite(interaction, {
      main: main ? String(main) : undefined,
      interviewed: true,
    });
    interaction.editReply(`Needs invite: ${invite.richLabel}`);
  }

  public get command() {
    const command = super.command.addStringOption((o) =>
      o
        .setName(Option.Name)
        .setDescription("The name of the character who needs an invite")
        .setRequired(true)
    );
    if (this.requireMain) {
      command.addUserOption((o) =>
        o
          .setName(Option.Main)
          .setDescription("The name of the player's main")
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

  public async getOptionAutocomplete() {
    return [];
  }

  private async newInvite(
    interaction: CommandInteraction<CacheType>,
    options: NewInviteOptions = {}
  ) {
    const { name, level, className } = await this.checkInvite(interaction);

    const invite = new Invite();
    invite.name = name;
    invite.byUserId = interaction.user.id;
    if (level) {
      invite.level = Number(level);
    }
    if (className) {
      invite.class = className as Class;
    }
    const { main, interviewed } = options;

    if (main) {
      invite.main = main;
    }
    invite.interviewed = !!interviewed;

    await dataSource.manager.save(invite);
    await updateInviteListInfo(interaction.client);

    return invite;
  }

  private async checkInvite(interaction: CommandInteraction<CacheType>) {
    const name = String(
      this.getOption(Option.Name, interaction)?.value
    ).toLowerCase();
    const className = this.getOption(Option.Class, interaction)?.value;
    const level = this.getOption(Option.Level, interaction)?.value;

    // check that the name isn't already tracked
    const invites = await dataSource.getRepository(Invite).find({
      where: [
        {
          name,
          invited: false,
          canceled: false,
        },
        {
          name,
          interviewed: false,
          canceled: false,
        },
      ],
    });
    if (invites.length) {
      throw new Error(`${name} is already being tracked.`);
    }
    return { name, level, className };
  }
}

export const playerSubcommand = new Add(
  "player",
  "Add a player who needs an invite. Do not use this for alts.",
  false
);

export const altSubcommand = new Add(
  "alt",
  "Add an alt who needs an invite. Do not use this for mains.",
  true
);
