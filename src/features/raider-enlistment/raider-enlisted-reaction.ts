import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  inactiveRaiderRoleId,
  knightRoleId,
  officerRoleId,
  raiderEnlistmentChannelId,
  raiderRoleId,
} from "../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../shared/action/reaction-action";

export const tryRaiderEnlistedReactionAction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => reactionActionExecutor(new RaiderEnlistedReactionAction(reaction, user));

class RaiderEnlistedReactionAction extends ReactionAction {
  public async execute() {
    // filter channel
    if (this.message.channel.id !== raiderEnlistmentChannelId) {
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
        reactor?.roles.cache.has(knightRoleId) ||
        reactor?.roles.cache.has(officerRoleId)
      )
    ) {
      return;
    }

    const newRaider = await this.message.member?.fetch();
    if (!newRaider) {
      throw new Error("Could not enlist message author because there is none.");
    }

    // remove inactive raider role
    await newRaider.roles.remove(inactiveRaiderRoleId);

    // add raider role
    await newRaider.roles.add(raiderRoleId);

    // provide receipt
    await newRaider.send("Welcome to the Castle raid force!");

    // delete all of their messages and the replies to their messages
    const messages = [
      ...(
        await this.message.channel.messages.fetch({
          around: this.message.id,
          limit: 100,
        })
      ).values(),
    ];
    const newRaiderMessages = messages.filter(
      (m) => m.author.id === newRaider.id
    );
    const newRaiderMessagesIds = newRaiderMessages.map((m) => m.id);
    const repliesToNewRaiderMessages = messages.filter(
      (m) =>
        // its a reply
        !!m.reference?.messageId &&
        // its not already queued to be deleted
        !newRaiderMessagesIds.includes(m.id) &&
        // its a reply to a message that is queued to be deleted
        newRaiderMessagesIds.includes(m.reference.messageId)
    );
    newRaiderMessages
      .filter((m) => m.embeds.length === 0)
      .map((m) => m.delete());
    repliesToNewRaiderMessages
      .filter((m) => m.embeds.length === 0)
      .map((m) => m.delete());
  }
}
