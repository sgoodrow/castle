import { ButtonInteraction, CacheType, ChannelType, Message, User } from "discord.js";
import { jewelerRoleId, jewelryChannelId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";
import { getChannel, requireInteractionMemberRole } from "../../shared/command/util";

class JeweleryCleanupCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const jewelryRequestsChannel = await this.authorize(interaction);

    const messages = await jewelryRequestsChannel.messages.fetch();

    const nonJewelerMessagesMap = messages
      .filter((m) => !(m.member?.roles.cache.has(jewelerRoleId) || m.member?.user.bot))
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
    if (!Object.keys(nonJewelerMessagesMap).length) {
      await interaction.editReply({
        content: "There are no pending requests from non-jewelers.",
      });
      return;
    }

    // for each user
    Object.values(nonJewelerMessagesMap).forEach(({ user, messages }) => {
      // DM them their stale messages
      user.send(`Your <Castle> jewelry request has been dismissed.

**Sorry we missed you!** Please post your jewelry request again the next time you are available to have it fulfilled.

${messages.map((m) => this.getQuotedContent(m.content)).join("\n")}`);

      // Delete the messages
      messages.forEach((m) => m.delete());
    });

    await interaction.editReply({
      content: `Removed stale jewelry requests from: ${Object.values(nonJewelerMessagesMap)
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
    const channel = await getChannel(jewelryChannelId, interaction);
    if (channel?.type !== ChannelType.GuildText) {
      throw new Error("The jewelry requests channel is not a text channel.");
    }

    requireInteractionMemberRole(jewelerRoleId, interaction);

    return channel;
  }
}

export const jewelryCleanupButtonCommand = new JeweleryCleanupCommand("jewelryCleanup");
