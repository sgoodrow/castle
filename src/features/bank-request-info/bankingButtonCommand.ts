import { ButtonInteraction, CacheType } from "discord.js";
import { bankerRoleId, bankRequestsChannelId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";
import {
  getChannel,
  requireInteractionMemberRole,
} from "../../shared/command/util";

class BankingButtonCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const bankRequestsChannel = await this.authorize(interaction);

    const messages = await bankRequestsChannel.messages.fetch();

    // get all non-banker messages
    const users = [
      ...new Set(
        messages
          .filter(
            (m) =>
              !(m.member?.roles.cache.has(bankerRoleId) || m.member?.user.bot)
          )
          .map((r) => r.member?.user)
          .filter(Boolean)
      ),
    ];

    if (!users.length) {
      await interaction.reply({
        content: "There are no pending requests from non-bankers.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(`**${interaction.member?.user} is now banking!**

Attn: ${users.map((u) => `${u}`).join(" ")}`);
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

export const bankingButtonCommand = new BankingButtonCommand("banking");
