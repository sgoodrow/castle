import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { authorizeByMemberRoles } from "../../../shared/command/util";
import {
  knightRoleId,
  modRoleId,
  officerRoleId,
  raiderRoleId,
} from "../../../config";
import { eqnotifyService } from "../eqnotify.service";
import { getMember } from "../../..";

const MAX_MESSAGE_LENGTH = 1900;

/**
 * Resolves a subscriber's display name and current Raider status. Falls back
 * gracefully if the member has left the server.
 */
const describeMember = async (discordId: string, username: string) => {
  try {
    const member = await getMember(discordId);
    const isRaider = member.roles.cache.has(raiderRoleId);
    return {
      label: `${member} (${member.user.username})`,
      status: isRaider ? "Raider ✅" : "not a Raider ⛔",
    };
  } catch {
    return { label: `${username} (not in server)`, status: "left ❌" };
  }
};

class ListUsersSubcommand extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );

    const subscribers = await eqnotifyService.listSubscribers();
    if (subscribers.length === 0) {
      await interaction.editReply("No one is registered for EQNotify yet.");
      return;
    }

    const lines = await Promise.all(
      subscribers.map(async (sub) => {
        const { label, status } = await describeMember(
          sub.discordId,
          sub.discordUsername
        );
        const channel = sub.type === "telegram" ? "Telegram" : "WirePusher";
        return `• ${label} — ${channel} — ${status} — ${sub.tags.length} tag(s)`;
      })
    );

    const header = `**EQNotify subscribers (${subscribers.length}):**`;
    const messages = chunkLines([header, ...lines]);

    await interaction.editReply(messages[0]);
    for (let i = 1; i < messages.length; i++) {
      await interaction.followUp({ content: messages[i], ephemeral: true });
    }
  }

  public async getOptionAutocomplete(
    _option: string,
    _interaction: AutocompleteInteraction<CacheType>
  ) {
    return undefined;
  }
}

/**
 * Packs lines into as few messages as possible without exceeding Discord's
 * message length limit.
 */
const chunkLines = (lines: string[]) => {
  const messages: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current && current.length + line.length + 1 > MAX_MESSAGE_LENGTH) {
      messages.push(current);
      current = "";
    }
    current = current ? `${current}\n${line}` : line;
  }
  if (current) {
    messages.push(current);
  }
  return messages;
};

export const listUsersSubcommand = new ListUsersSubcommand(
  "list-users",
  "(Officer/Mod/Knight) Show everyone registered for EQNotify."
);
