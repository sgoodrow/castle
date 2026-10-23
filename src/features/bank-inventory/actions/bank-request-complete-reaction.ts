import {
  Embed,
  Message,
  MessageCreateOptions,
  MessageReaction,
  PartialMessage,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  bankRequestsChannelId,
  jewelerRoleId,
  jewelryChannelId,
  bankerRoleId,
  officerRoleId,
  bankTransactionsChannelId,
  modRoleId,
} from "../../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../../shared/action/reaction-action";
import { requesterId } from "../../../shared/bank-request-author";
import { readBankRequest } from "../../bank-request-info/bank-request";
import { client, getMember, getTextChannel } from "../../..";

export const tryBankRequestComplete = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) =>
  reactionActionExecutor(new BankRequestFinishedReactionAction(reaction, user));

// A request is either posted from the bank page (embeds only, the first opening with a line naming
// its member) or by /bank request (content that @mentions its member).
type BankRequest =
  | { kind: "site"; requesterId: string; embed: Embed }
  | { kind: "command"; message: Message | PartialMessage };

const parseBankRequest = (message: Message | PartialMessage): BankRequest => {
  const embed = message.embeds[0];
  const id = embed && requesterId(embed);
  return embed && id
    ? { kind: "site", requesterId: id, embed }
    : { kind: "command", message };
};

const transactionMessage = (
  request: BankRequest,
  banker: User | PartialUser
): MessageCreateOptions => {
  if (request.kind === "site") {
    // Like the request itself, the copy never pings. Its lines stay in an embed, which holds twice
    // what a message's content can. Requests from before the title change keep their title.
    const { title, url, description } = request.embed;
    return {
      content: `✅ by ${banker}`,
      embeds: [
        {
          ...(title ? { title } : {}),
          ...(url ? { url } : {}),
          ...(description ? { description } : {}),
        },
      ],
      allowedMentions: { parse: [] },
    };
  }
  const { message } = request;
  const content = `${message.content} -- ✅ by ${banker}`;
  if (message.author?.bot) return { content };
  // What a member typed can mention anyone, so its copy never pings.
  return {
    content: `${message.author}: ${content}`,
    allowedMentions: { parse: [] },
  };
};

// Jewelry requests are filled by the jewelers as well as the bankers.
const isFiller = async (userId: string, channelId: string) => {
  const member = await getMember(userId);
  const has = (role: string) => !!member?.roles.cache.has(role);
  if ([bankerRoleId, officerRoleId, modRoleId].some(has)) return true;
  return channelId === jewelryChannelId && has(jewelerRoleId);
};

class BankRequestFinishedReactionAction extends ReactionAction {
  public async execute() {
    // filter channel: bank requests, and jewelry requests the jewelers fill
    const channelId = this.message.channel.id;
    if (channelId !== bankRequestsChannelId && channelId !== jewelryChannelId) {
      return;
    }
    // A bank request is only one the bot posted, so a member's message that reads like one is ignored.
    // Jewelry requests are typed by members, which is how the jewelers take them.
    if (
      channelId === bankRequestsChannelId &&
      this.message.author?.id !== client.user?.id
    )
      return;
    const requested = readBankRequest({
      content: this.message.content as string,
      embeds: this.message.embeds,
    });
    if (!requested) return;
    const request = parseBankRequest(this.message);

    // mark finished
    if (this.reaction.emoji.name === "✅") {
      if (!(await isFiller(this.user.id, channelId))) {
        return;
      }
      const bankTransactionsChannel = await getTextChannel(
        bankTransactionsChannelId
      );
      await bankTransactionsChannel.send(
        transactionMessage(request, this.user)
      );
      await this.message.delete();
    }

    // cancel
    if (this.reaction.emoji.name === "❌") {
      // A member's own typed request is theirs, whoever it names; the bot's names its requester.
      const requester = this.message.author?.bot
        ? requested.requesterId
        : this.message.author?.id;
      if (
        requester !== this.user.id &&
        !(await isFiller(this.user.id, channelId))
      ) {
        return;
      }
      await this.message.delete();
    }
  }
}
