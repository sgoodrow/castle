import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import {
  dkpDeputyRoleId,
  dkpRecordsChannelId,
  officerRoleId,
} from "../../../config";
import { Subcommand } from "../../../shared/command/subcommand";
import { getRaidReport } from "../raid-report";
import { RaidValuesService } from "../../../services/raidValuesService";

enum Option {
  Event = "event",
  Role = "role",
  Value = "value"
}

export class AddRoleBonusSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description, true);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    // filter non-threads
    if (!interaction.channel?.isThread()) {
      throw new Error("Must use this command in a raid thread");
    }

    // filter channel
    if (interaction.channel.parentId !== dkpRecordsChannelId) {
      throw new Error("Must use this command in a raid thread");
    }

    // authorize user
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(dkpDeputyRoleId) || roles.cache.has(officerRoleId))) {
      throw new Error("Must be a DKP Deputy or Officer to use this command");
    }

    // todo
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(Option.Event)
          .setDescription("The raid event name.")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Role)
          .setDescription("The role you are claiming a bonus for.")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addNumberOption((o) =>
        o
          .setName(Option.Value)
          .setDescription("A value to use instead of the default.")
      );
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Event:
        return await RaidValuesService.getInstance().getRaidValueOptions();
      case Option.Role:
        return await RaidValuesService.getInstance().getRaidValueOptions();
      default:
        return;
    }
  }
}

export const addRoleBonusubcommand = new AddRoleBonusSubcommand(
  "addbonus",
  "Adds a bonus to a raid tick."
);
