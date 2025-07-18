import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  bankRequestsChannelId,
  bankerRoleId,
  officerRoleId,
  bankTransactionsChannelId,
  modRoleId,
} from "../../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../../shared/action/reaction-action";
import { getTextChannel } from "../../..";

export const tryBankRequestComplete = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) =>
  reactionActionExecutor(new BankRequestFinishedReactionAction(reaction, user));

class BankRequestFinishedReactionAction extends ReactionAction {
  public async execute() {
    // filter channel
    if (this.message.channel.id !== bankRequestsChannelId) {
      return;
    }
    // mark finished
    if (this.reaction.emoji.name === "✅") {
      const bankTransactionsChannel = await getTextChannel(
        bankTransactionsChannelId
      );
      let transactionContent = this.message.content + ` -- ✅ by ${this.user}`;
      if (!this.message.author?.bot) {
        transactionContent =
          this.message.author?.toString() + ": " + transactionContent;
      }
      bankTransactionsChannel?.send(transactionContent);
      // authorize user
      const reactor = await this.members?.fetch(this.user.id);
      if (
        !(
          reactor?.roles.cache.has(bankerRoleId) ||
          reactor?.roles.cache.has(officerRoleId) ||
          reactor?.roles.cache.has(modRoleId)
        )
      ) {
        return;
      }
      this.message.delete();
    }

    // delete
    if (this.reaction.emoji.name === "❌") {
      const reactor = await this.members?.fetch(this.user.id);
      if (
        !(
          reactor?.roles.cache.has(bankerRoleId) ||
          reactor?.roles.cache.has(officerRoleId) ||
          reactor?.roles.cache.has(modRoleId)
        ) ||
        this.message.mentions?.parsedUsers.hasAny(this.user.username ?? "")
      ) {
        return;
      }
      this.message.delete();
    }
  }
}
