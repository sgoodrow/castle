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

    // filter non-finish emoji reactions
    if (this.reaction.emoji.name !== "✅") {
      return;
    }

    // authorize user
    const reactor = await this.members?.fetch(this.user.id);
    if (
      !(
        reactor?.roles.cache.has(bankerRoleId) ||
        reactor?.roles.cache.has(officerRoleId)
      )
    ) {
      return;
    }

    const bankTransactionsChannel = await getTextChannel(
      bankTransactionsChannelId
    );
    let transactionContent = this.message.content + ` -- ✅ by ${this.user}`;
    if (!this.message.author?.bot) {
      transactionContent = this.message.author?.toString() + ": " + transactionContent;
    }
    bankTransactionsChannel?.send(transactionContent);
    this.message.delete();
  }
}
