import { ButtonInteraction, CacheType, Message, User } from "discord.js";
import { bankerRoleId, bankRequestsChannelId } from "../../config";
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
      .reduce((map, message) => {
        const id = message.author.id;
        if (!map[id]) {
          map[id] = {
            messages: [],
            user: message.author,
          };
        }
        map[id].messages.push(message);
        return map;
      }, {} as { [userId: string]: { messages: Message[]; user: User } });

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
      user.send(`Your <Castle> bank request has been dismissed.

**Sorry we missed you!** Please post your bank request again the next time you are available to have it fulfilled.

${messages.map((m) => this.getQuotedContent(m.content)).join("\n")}`);

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

  private getQuotedContent(content: string) {
    return `${content
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n")}
    `;
  }

  protected async authorize(interaction: ButtonInteraction<CacheType>) {
    const channel = await getChannel(bankRequestsChannelId, interaction);
    if (!channel?.isText()) {
      throw new Error("The bank requests channel is not a text channel.");
    }

    requireInteractionMemberRole(bankerRoleId, interaction);

    return channel;
  }
}

export const bankCleanupButtonCommand = new BankCleanupCommand("bankCleanup");
