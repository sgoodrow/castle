import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import { dkpDeputyRoleId, officerRoleId } from "../../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../../shared/action/reaction-action";
import { getRaidReport, isRaidInstructionsMessage } from "../raid-report";
import { getAction, getRaidEditMessageContent } from "./util";

export const tryVerifyRaidEditReactionAction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => reactionActionExecutor(new VerifyRaidEditReactionAction(reaction, user));

class VerifyRaidEditReactionAction extends ReactionAction {
  public async execute() {
    const content = await getRaidEditMessageContent(this.message);
    if (!content) {
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
        reactor?.roles.cache.has(dkpDeputyRoleId) ||
        reactor?.roles.cache.has(officerRoleId)
      )
    ) {
      return;
    }

    // parse message
    const action = getAction(content);

    // get raid report
    const { report, messages } = await getRaidReport(this.message.channel);

    // execute action on raid report
    action.execute(report);

    await report.editMessages(messages);

    // show success
    await this.message.react("✅");
  }
}
