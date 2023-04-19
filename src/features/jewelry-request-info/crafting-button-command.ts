import { ButtonInteraction, CacheType, ChannelType } from "discord.js";
import { jewelerRoleId, jewelryChannelId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";
import {
  getChannel,
  requireInteractionMemberRole,
} from "../../shared/command/util";

class CraftingButtonCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const jewelryRequestsChannel = await this.authorize(interaction);

    const messages = await jewelryRequestsChannel.messages.fetch();

    // get all non-jeweler messages
    const users = [
      ...new Set(
        messages
          .filter(
            (m) =>
              !(m.member?.roles.cache.has(jewelerRoleId) || m.member?.user.bot)
          )
          .map((r) => r.member?.user)
          .filter(Boolean)
      ),
    ];

    if (!users.length) {
      await interaction.editReply({
        content: "There are no pending requests from non-jewelers.",
      });
      return;
    }

    await interaction.editReply(`**${
      interaction.member?.user
    } is now handling jewelry requests!**

Attn: ${users.map((u) => `${u}`).join(" ")}`);
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

export const craftingButtonCommand = new CraftingButtonCommand("crafting");
