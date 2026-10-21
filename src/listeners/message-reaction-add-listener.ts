import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import { tryGatehouseReactionAction } from "../features/gatehouse-tags/reaction";
import { tryAuctionFinishedReactionAction } from "../features/auctions/auction-finished-reaction";
import { tryRaiderEnlistedReactionAction } from "../features/raider-enlistment/raider-enlisted-reaction";
import { tryBankRequestComplete } from "../features/bank-inventory/actions/bank-request-complete-reaction";
import { tryInviteRequestFinishedReactionAction } from "../features/invite-list/invite-request-finished-reaction";
import { tryApproveRaidReportRevisionReactionAction } from "../features/dkp-records/request-revision/approve-raid-report-revision-reaction";
import { tryRaidReportFinishedReactionAction } from "../features/dkp-records/finish/finish-raid-report-reaction";
import { tryApproveRaidBonusRequestReactionAction } from "../features/dkp-records/request-bonus/approve-raid-bonus-request-reaction";

const reactionActions = [
  tryGatehouseReactionAction,
  tryAuctionFinishedReactionAction,
  tryBankRequestComplete,
  tryInviteRequestFinishedReactionAction,
  tryRaiderEnlistedReactionAction,
  tryApproveRaidReportRevisionReactionAction,
  tryApproveRaidBonusRequestReactionAction,
  tryRaidReportFinishedReactionAction,
];

export const messageReactionAddListener = async (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => {
  // the bot's own ✅ and ⚠️ confirm work already done; acting on them again only costs Discord calls
  if (user.id === reaction.client.user?.id) {
    return;
  }
  reactionActions.forEach((ra) => ra(reaction, user));
};
