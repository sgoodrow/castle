import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import { tryGatehouseReactionAction } from "../features/gatehouse-tags/reaction";
import { tryAuctionFinishedReactionAction } from "../features/auctions/auction-finished-reaction";
import { tryRaiderEnlistedReactionAction } from "../features/raider-enlistment/raider-enlisted-reaction";
import { tryBankRequestFinishedReactionAction } from "../features/bank-request-info/bank-request-finished-reaction";
import { tryInviteRequestFinishedReactionAction } from "../features/invite-list/invite-request-finished-reaction";
import { tryVerifyRaidEditReactionAction } from "../features/dkp-records/verify-raid-edit";
import { tryRaidReportFinishedReactionAction } from "../features/dkp-records/raid-report-finished-reaction";

const reactionActions = [
  tryGatehouseReactionAction,
  tryAuctionFinishedReactionAction,
  tryBankRequestFinishedReactionAction,
  tryInviteRequestFinishedReactionAction,
  tryRaiderEnlistedReactionAction,
  tryVerifyRaidEditReactionAction,
  tryRaidReportFinishedReactionAction,
];

export const messageReactionAddListener = async (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => {
  reactionActions.forEach((ra) => ra(reaction, user));
};
