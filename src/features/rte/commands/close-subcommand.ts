import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { RaidValuesService } from "../../../services/raidValuesService";
import { rteService } from "../../../services/rteService";
import { refreshRteStatusEmbed } from "../status-embed";

export enum Option {
  Target = "target",
}

export class CloseSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description, true);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!rteService.canManageTargets(roles)) {
      throw new Error("Must be a Knight or Officer to close targets.");
    }

    const target = this.getRequiredOptionValue<string>(Option.Target, interaction);
    const endedCount = await rteService.endSessionsForTarget(target);
    await rteService.closeTarget(target);
    await refreshRteStatusEmbed();
    await interaction.editReply(`Target **${target}** is now closed. ${endedCount} active session(s) were ended and users were notified via DM.`);
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.Target)
        .setDescription("The raid target to close.")
        .setAutocomplete(true)
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete(option: string, interaction: AutocompleteInteraction<CacheType>) {
    switch (option) {
      case Option.Target:
        return await RaidValuesService.getInstance().getTargetOptions(interaction.user.id);
      default:
        return;
    }
  }
}

export const closeSubcommand = new CloseSubcommand("close", "Close a target for RTE.");
