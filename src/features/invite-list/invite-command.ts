import { CacheType, CommandInteraction } from "discord.js";
import { Command, getOption } from "../../shared/command/command";
import { newInvite, classChoices, Option } from "./util";

class InviteCommand extends Command {
  public constructor(
    name: string,
    description: string,
    private readonly requireMain: boolean
  ) {
    super(name, description);
  }
  public async execute(interaction: CommandInteraction<CacheType>) {
    const main = getOption(Option.Main, interaction)?.value;
    const invite = await newInvite(interaction, {
      main: main ? String(main) : undefined,
      interviewed: true,
    });
    interaction.editReply(`Needs invite: ${invite.richLabel}`);
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
  "Add a player who has already been interviewed but needs an invite.",
  false
);

export const altCommand = new InviteCommand(
  "alt",
  "Add an alt who needs an invite.",
  true
);
