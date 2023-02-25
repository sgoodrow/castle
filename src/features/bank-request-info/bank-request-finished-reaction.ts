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
} from "../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../shared/action/reaction-action";

export const tryBankRequestFinishedReactionAction = (
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

    // delete all of their messages and the replies to their messages
    const messages = await this.message.channel.messages.fetch();
    const requesterMessages = messages.filter(
      (m) => m.member?.id === this.message.member?.id
    );
    const requesterMessageIds = requesterMessages.map((m) => m.id);
    const replies = messages.filter(
      (m) =>
        // its a reply
        !!m.reference?.messageId &&
        // its not already queued to be deleted
        !requesterMessageIds.includes(m.id) &&
        // its a reply to a message that is queued to be deleted
        requesterMessageIds.includes(m.reference.messageId)
    );
    requesterMessages.map((m) => m.delete());
    replies.map((m) => m.delete());
  }
}
