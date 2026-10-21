import {
  ButtonInteraction,
  CacheType,
  ChannelType,
  Message,
  User,
} from "discord.js";
import { bankerRoleId, bankRequestsChannelId } from "../../config";
import { dismissal } from "./dismissal";
import { ButtonCommand } from "../../shared/command/button-command";
import {
  getChannel,
  requireInteractionMemberRole,
} from "../../shared/command/util";

class BankCleanupCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const bankRequestsChannel = await this.authorize(interaction);

    const messages = await bankRequestsChannel.messages.fetch();

    const nonBankerMessagesMap = messages
      .filter(
        (m) => !(m.member?.roles.cache.has(bankerRoleId) || m.member?.user.bot)
      )
      .reduce(
        (map, message) => {
          const id = message.author.id;
          if (!map[id]) {
            map[id] = {
              messages: [],
              user: message.author,
            };
          }
          map[id].messages.push(message);
          return map;
        },
        {} as { [userId: string]: { messages: Message[]; user: User } }
      );

    // nothing to do
    if (!Object.keys(nonBankerMessagesMap).length) {
      await interaction.editReply({
        content: "There are no pending requests from non-bankers.",
      });
      return;
    }

    // for each user
    Object.values(nonBankerMessagesMap).forEach(({ user, messages }) => {
      // DM them their stale messages
      user.send(dismissal(messages.map((m) => m.content)));

      // Delete the messages
      messages.forEach((m) => m.delete());
    });

    await interaction.editReply({
      content: `Removed stale bank requests from: ${Object.values(
        nonBankerMessagesMap
      )
        .map(({ user }) => user)
        .map((u) => `${u}`)
        .join(" ")}`,
    });
  }

  protected async authorize(interaction: ButtonInteraction<CacheType>) {
    const channel = await getChannel(bankRequestsChannelId, interaction);
    if (channel?.type !== ChannelType.GuildText) {
      throw new Error("The bank requests channel is not a text channel.");
    }

    requireInteractionMemberRole(bankerRoleId, interaction);

    return channel;
  }
}

export const bankCleanupButtonCommand = new BankCleanupCommand("bankCleanup");
