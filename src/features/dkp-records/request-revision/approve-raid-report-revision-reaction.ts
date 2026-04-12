import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../../shared/action/reaction-action";
import { getAction, getRaidRevisionMessageContent } from "./util";
import { getMember } from "../../..";

export const tryApproveRaidReportRevisionReactionAction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) =>
  reactionActionExecutor(
    new ApproveRaidReportRevisionReactionAction(reaction, user)
  );

class ApproveRaidReportRevisionReactionAction extends ReactionAction {
  public async execute() {
    if (this.reaction.emoji.name !== "✅") {
      return;
    }

    const content = await getRaidRevisionMessageContent(this.message);
    if (!content) {
      return;
    }

    const actor = await getMember(this.user.id);

    await getAction(content).tryExecute(this.message, actor);
  }
}
