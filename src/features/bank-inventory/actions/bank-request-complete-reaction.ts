import {
  APIEmbed,
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
  | { kind: "site"; requesterId: string; embeds: Embed[] }
  | { kind: "command"; message: Message | PartialMessage };

const parseBankRequest = (
  message: Message | PartialMessage,
  embeds: Embed[]
): BankRequest => {
  const embed = embeds[0];
  const id = embed && requesterId(embed);
  return embed && id
    ? { kind: "site", requesterId: id, embeds }
    : { kind: "command", message };
};

// An embed as it was posted, its fields included, since a bank page request's items are its fields.
const copyEmbed = (e: Embed): APIEmbed =>
  Object.fromEntries(
    Object.entries({
      title: e.title,
      url: e.url,
      description: e.description,
      color: e.color,
      fields: e.fields.map((f) => ({ name: f.name, value: f.value, inline: f.inline })),
    }).filter(([, v]) => v != null)
  ) as APIEmbed;

const transactionMessage = (
  request: BankRequest,
  banker: User | PartialUser
): MessageCreateOptions => {
  if (request.kind === "site") {
    // Like the request itself, the copy never pings. Every embed is copied whole, so the item fields come too.
    return {
      content: `✅ by ${banker}`,
      embeds: request.embeds.map(copyEmbed),
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
    // Only the bot's own posts carry a request's embeds. A member's link can unfurl into an embed that
    // reads like one, so a member's message is only ever a typed request.
    const embeds =
      this.message.author?.id === client.user?.id ? this.message.embeds : [];
    const requested = readBankRequest({
      content: this.message.content as string,
      embeds,
    });
    if (!requested) return;
    const request = parseBankRequest(this.message, embeds);

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
