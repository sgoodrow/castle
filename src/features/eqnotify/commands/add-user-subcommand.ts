import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { eqnotify_type } from "@prisma/client";
import { Subcommand } from "../../../shared/command/subcommand";
import { authorizeByMemberRoles } from "../../../shared/command/util";
import { knightRoleId, modRoleId, officerRoleId } from "../../../config";
import { eqnotifyService, DEFAULT_TAGS } from "../eqnotify.service";
import { isTelegramConfigured } from "../notifiers/telegram";
import { getMember } from "../../..";

export enum Option {
  Member = "member",
  Type = "type",
  Id = "id",
}

class AddUserSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );

    const memberId = this.getRequiredOptionValue<string>(
      Option.Member,
      interaction
    );
    const type = this.getRequiredOptionValue<eqnotify_type>(
      Option.Type,
      interaction
    );
    const contact = String(
      this.getRequiredOptionValue<string>(Option.Id, interaction)
    ).trim();

    if (type === eqnotify_type.telegram && !isTelegramConfigured()) {
      throw new Error(
        "Telegram delivery is not configured on this bot yet (TELEGRAM_BOT_TOKEN is unset)."
      );
    }
    if (!contact) {
      throw new Error("You must provide a valid ID.");
    }

    const member = await getMember(memberId);
    const existing = await eqnotifyService.getSubscriber(memberId);
    await eqnotifyService.enroll({
      discordId: memberId,
      discordUsername: member.user.username,
      contact,
      type,
    });

    const channel = type === eqnotify_type.telegram ? "Telegram" : "WirePusher";
    await interaction.editReply(
      existing
        ? `Updated ${member}'s EQNotify delivery to **${channel}**. Their tags are unchanged.`
        : `Enrolled ${member} in EQNotify via **${channel}** with default tags: ${DEFAULT_TAGS.join(
            ", "
          )}.`
    );
  }

  public get command() {
    return super.command
      .addUserOption((o) =>
        o
          .setName(Option.Member)
          .setDescription("The member to enroll.")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Type)
          .setDescription("How they'll receive alerts")
          .setRequired(true)
          .addChoices(
            { name: "WirePusher (Android only)", value: eqnotify_type.wire },
            {
              name: "Telegram (iOS/Android/desktop)",
              value: eqnotify_type.telegram,
            }
          )
      )
      .addStringOption((o) =>
        o
          .setName(Option.Id)
          .setDescription("Their WirePusher device ID or Telegram chat ID.")
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

export const addUserSubcommand = new AddUserSubcommand(
  "add-user",
  "(Officer) Enroll another member in EQNotify."
);
