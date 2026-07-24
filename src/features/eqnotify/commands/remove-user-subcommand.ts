import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { authorizeByMemberRoles } from "../../../shared/command/util";
import { knightRoleId, modRoleId, officerRoleId } from "../../../config";
import { eqnotifyService } from "../eqnotify.service";
import { getMember } from "../../..";

export enum Option {
  Member = "member",
}

class RemoveUserSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );

    const memberId = this.getRequiredOptionValue<string>(
      Option.Member,
      interaction
    );
    const member = await getMember(memberId);
    const existing = await eqnotifyService.getSubscriber(memberId);
    if (!existing) {
      throw new Error(`${member} is not enrolled in EQNotify.`);
    }
    await eqnotifyService.remove(memberId);
    await interaction.editReply(`Removed ${member} from EQNotify.`);
  }

  public get command() {
    return super.command.addUserOption((o) =>
      o
        .setName(Option.Member)
        .setDescription("The member to remove from EQNotify.")
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete(
    _option: string,
    _interaction: AutocompleteInteraction<CacheType>
  ) {
    return undefined;
  }
}

export const removeUserSubcommand = new RemoveUserSubcommand(
  "remove-user",
  "(Officer) Remove another member from EQNotify."
);
