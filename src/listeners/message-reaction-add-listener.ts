import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import { tryGatehouseReactionAction } from "../features/gatehouse-tags/reaction";
import { tryAuctionFinishedReactionAction } from "../features/auctions/auction-finished-reaction";

const reactionActions = [
  tryGatehouseReactionAction,
  tryAuctionFinishedReactionAction,
];

export const messageReactionAddListener = async (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => {
  reactionActions.forEach((ra) => ra(reaction, user));
};
