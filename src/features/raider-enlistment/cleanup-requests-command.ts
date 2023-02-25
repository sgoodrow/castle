import { ButtonInteraction, CacheType, Message, User } from "discord.js";
import {
  knightRoleId,
  raiderEnlistmentChannelId,
  raiderRoleId,
} from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";
import {
  getChannel,
  requireInteractionMemberRole,
} from "../../shared/command/util";
import { partition } from "lodash";

class RaiderCleanupCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    const raiderEnlistmentChannel = await this.authorize(interaction);

    const messages = (await raiderEnlistmentChannel.messages.fetch()).filter(
      (m) => !m.member?.user.bot
    );

    const [nonRaiderMessages, raiderMessages] = partition<Message<boolean>>(
      [...messages.values()],
      (m) => !m.member?.roles.cache.has(raiderRoleId)
    );

    const nonRaiderMessagesMap = nonRaiderMessages.reduce((map, message) => {
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

    // delete all the knight messages
    await Promise.all(raiderMessages.map((m) => m.delete()));

    // nothing to do
    if (!Object.keys(nonRaiderMessagesMap).length) {
      await interaction.reply({
        content: "There are no pending requests from non-raiders.",
        ephemeral: true,
      });
      return;
    }

    // for each user
    Object.values(nonRaiderMessagesMap).forEach(({ user, messages }) => {
      // DM them their stale messages
      user.send(`Your <Castle> raider enlistment request has been dismissed. **Sorry we couldn't enlist you!** Please post your request again with all of the information required.

${messages.map((m) => this.getQuotedContent(m.content)).join("\n")}`);

      // Delete the messages
      messages.forEach((m) => m.delete());
    });

    await interaction.reply({
      content: `Removed stale enlistment requests from: ${Object.values(
        nonRaiderMessagesMap
      )
        .map(({ user }) => user)
        .map((u) => `${u}`)
        .join(" ")}`,
      ephemeral: true,
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
    const channel = await getChannel(raiderEnlistmentChannelId, interaction);
    if (!channel?.isText()) {
      throw new Error("The raider enlistment channel is not a text channel.");
    }

    requireInteractionMemberRole(knightRoleId, interaction);

    return channel;
  }
}

export const raiderCleanupButtonCommand = new RaiderCleanupCommand(
  "raiderCleanup"
);
