import { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { ReactionAction, reactionActionExecutor } from "../../../shared/action/reaction-action";
import { getAction, getBonusMessageContent } from "./util";

export const tryApproveRaidBonusRequestReactionAction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => reactionActionExecutor(new ApproveRaidBonusRequestReactionAction(reaction, user));

class ApproveRaidBonusRequestReactionAction extends ReactionAction {
  public async execute() {
    if (this.reaction.emoji.name !== "✅") {
      return;
    }

    const content = await getBonusMessageContent(this.message);
    if (!content) {
      return;
    }

    const actor = await this.members?.fetch(this.user.id);

    await getAction(content).tryExecute(this.message, actor);
  }
}
