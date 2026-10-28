import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  RESTJSONErrorCodes,
  User,
} from "discord.js";
import { prismaClient, getMember } from "../..";
import { bankRequestsChannelId, bankerRoleId } from "../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../shared/action/reaction-action";
import { readPlanId } from "../../shared/bank-plan-id";
import { planDms } from "./bank-plan-dm";

export const tryBankPlanReaction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => reactionActionExecutor(new BankPlanReactionAction(reaction, user));

// A banker's 👀 on a bank post sends the banker the post's plan by DM. Anyone else's 👀 does nothing,
// and so does a banker whose DMs are closed: the channel gets nothing new either way.
class BankPlanReactionAction extends ReactionAction {
  // A failure here is logged, not answered in the channel: a 👀 that can't be answered by DM gets no reply.
  public async initialize() {
    if (this.reaction.partial)
      await this.reaction.fetch().catch((err) => {
        console.error(`bank plan: a reaction didn't fetch: ${err}`);
      });
    return this;
  }

  public async execute() {
    if (this.reaction.emoji.name !== "👀") return;
    try {
      await this.plan();
    } catch (err) {
      console.error(`bank plan: a 👀 failed: ${err}`);
    }
  }

  private async plan() {
    if (this.message.channel.id !== bankRequestsChannelId) return;
    const member = await getMember(this.user.id);
    if (!member?.roles.cache.has(bankerRoleId)) return;
    const saved = await prismaClient.bank_request_plan.findUnique({
      where: { message_id: this.message.id },
    });
    const lines = saved && readPlanId(saved.plan);
    if (!lines) return;
    const messages = await planDms(lines);
    const user = this.user.partial ? await this.user.fetch() : this.user;
    try {
      for (const m of messages) await user.send(m);
    } catch (err) {
      const closed =
        (err as { code?: unknown }).code ===
        RESTJSONErrorCodes.CannotSendMessagesToThisUser;
      if (!closed) console.error(`bank plan: a DM failed: ${err}`);
    }
  }
}
