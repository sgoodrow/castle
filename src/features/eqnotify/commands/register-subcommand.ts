import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { eqnotify_type } from "@prisma/client";
import { Subcommand } from "../../../shared/command/subcommand";
import { eqnotifyService, DEFAULT_TAGS } from "../eqnotify.service";
import { isTelegramConfigured } from "../notifiers/telegram";

export enum Option {
  Type = "type",
  Id = "id",
}

class RegisterSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const type = this.getRequiredOptionValue<eqnotify_type>(
      Option.Type,
      interaction
    );
    const contact = String(
      this.getRequiredOptionValue<string>(Option.Id, interaction)
    ).trim();

    if (type === eqnotify_type.telegram && !isTelegramConfigured()) {
      throw new Error(
        "Telegram delivery is not configured on this bot yet. Please choose WirePusher or ask an officer."
      );
    }
    if (!contact) {
      throw new Error("You must provide a valid ID.");
    }

    const existing = await eqnotifyService.getSubscriber(interaction.user.id);
    await eqnotifyService.enroll({
      discordId: interaction.user.id,
      discordUsername: interaction.user.username,
      contact,
      type,
    });

    const channel = type === eqnotify_type.telegram ? "Telegram" : "WirePusher";
    await interaction.editReply(
      existing
        ? `Updated your EQNotify delivery to **${channel}**. Your notification tags are unchanged.`
        : `You're enrolled in EQNotify via **${channel}**! You'll be notified for: ${DEFAULT_TAGS.join(
            ", "
          )}.\nUse \`/eqnotify add-tag\` / \`/eqnotify remove-tag\` to customize, and \`/eqnotify test\` to verify delivery.`
    );
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(Option.Type)
          .setDescription("How you want to receive alerts")
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
          .setDescription(
            "Your WirePusher device ID, or your Telegram chat ID (from @userinfobot)"
          )
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

export const registerSubcommand = new RegisterSubcommand(
  "register",
  "Sign yourself up for EQNotify batphone alerts."
);
