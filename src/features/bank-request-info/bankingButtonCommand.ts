import {
  ButtonInteraction,
  CacheType,
  GuildMemberRoleManager,
} from "discord.js";
import { bankerRoleId, bankRequestsChannelId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";

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

    const banker = interaction.member?.user;

    await bankRequestsChannel.send(`**${banker} is now banking!

Attn: ${users.map((u) => `${u}`).join(" ")}`);

    await interaction.reply({});
  }

  // todo: dry this up (see shared/command.ts)
  protected async authorize(interaction: ButtonInteraction<CacheType>) {
    const channel = await this.getBankRequestsChannel(interaction);
    if (!channel?.isText()) {
      throw new Error("The bank requests channel is not a text channel.");
    }

    this.requireInteractionMemberRole(bankerRoleId, interaction);

    return channel;
  }

  // todo: dry this up (see shared/command.ts)
  protected async getBankRequestsChannel(
    interaction: ButtonInteraction<CacheType>
  ) {
    return await interaction.guild?.channels.fetch(bankRequestsChannelId);
  }

  // todo: dry this up (see shared/command.ts)
  protected requireInteractionMemberRole(
    roleId: string,
    interaction: ButtonInteraction<CacheType>
  ) {
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!roles) {
      throw new Error("Could not determine your roles.");
    }
    if (!roles.cache.get(roleId)) {
      throw new Error(`Must have <@&${roleId}> role to use this command.`);
    }
  }
}

export const bankingButtonCommand = new BankingButtonCommand("banking");
