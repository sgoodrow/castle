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
import { getMember, getTextChannel } from "../../..";

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

const parseBankRequest = (message: Message | PartialMessage): BankRequest => {
  const embed = message.embeds[0];
  const id = embed && requesterId(embed);
  // Only the bot's posts come from the bank page; a member's typed message can carry an embed too.
  return embed && id && message.author?.bot
    ? { kind: "site", requesterId: id, embeds: message.embeds }
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
  // Attachments can't be copied, so their links go into the text.
  const links = [...message.attachments.values()].map((a) => a.url);
  const content = `${[message.content, ...links].filter(Boolean).join("\n")} -- ✅ by ${banker}`;
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
    const requested = readBankRequest({
      content: this.message.content as string,
      embeds: this.message.embeds,
    });
    // Jewelry requests must be in the request format. In #bank-requests a member's message counts in
    // any format, and the bot's own posts count only when they are requests.
    if (
      !requested &&
      (channelId === jewelryChannelId || this.message.author?.bot)
    )
      return;
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
      // A member's own message is theirs, whoever it names; the bot's names its requester.
      const requester = this.message.author?.bot
        ? requested?.requesterId
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
