import { ButtonInteraction, CacheType, ChannelType, Collection, User } from "discord.js";
import { bankerRoleId, bankRequestsChannelId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";
import {
  getChannel,
  requireInteractionMemberRole,
} from "../../shared/command/util";
import { getAttentionMessage } from "../invite-list/ping-invite-list-button-command";

class BankingButtonCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const bankRequestsChannel = await this.authorize(interaction);

    const messages = await bankRequestsChannel.messages.fetch();

    const botMentions = messages.filter(
        (m) => (m.member?.user.bot && m.content.match("requests:") && m.mentions)
      ).map(
        (m) => Array.from(m.mentions.parsedUsers.values())[0]
      )

    // get all non-banker messages
    const users = [
      ...new Set(
        messages
          .filter(
            (m) =>
              !(m.member?.roles.cache.has(bankerRoleId)||m.member?.user.bot)
          )
          .map((r) => r.member?.user)
          .filter(Boolean)
          .concat(botMentions)
        )
    ];

    const attention = await getAttentionMessage(
      users.map((u) => (u as User).id)
    );

    await interaction.channel
      ?.send(`**${interaction.member?.user} is now banking!**

${attention}`);

    await interaction.editReply({
      content: "The bank requesters have been notified",
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

export const bankingButtonCommand = new BankingButtonCommand("banking");
