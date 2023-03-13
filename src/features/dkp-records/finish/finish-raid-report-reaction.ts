import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import { partition } from "lodash";
import {
  dkpDeputyRoleId,
  dkpRecordsBetaChannelId,
  officerRoleId,
} from "../../../config";
import { CreateRaidResponse } from "../../../services/castledkp";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../../shared/action/reaction-action";
import { getRaidReport, isRaidInstructionsMessage } from "../raid-report";

export const tryRaidReportFinishedReactionAction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) =>
  reactionActionExecutor(new RaidReportFinishedReactionAction(reaction, user));

class RaidReportFinishedReactionAction extends ReactionAction {
  public async execute() {
    // filter non-threads
    if (!this.message.channel.isThread()) {
      return;
    }

    // filter channel
    if (this.message.channel.parentId !== dkpRecordsBetaChannelId) {
      return;
    }

    // filter non-finish emoji reactions
    if (this.reaction.emoji.name !== "✅") {
      return;
    }

    // skip already completed
    if (this.message.channel.name.startsWith("✅")) {
      return;
    }

    // check that the message is the raid report
    const fullMessage = await this.message.fetch();
    if (!isRaidInstructionsMessage(fullMessage)) {
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

    // get raid report
    const { report, messages } = await getRaidReport(this.message.channel);

    // create remaining raids
    const { created, failed } = await report.uploadRemainingRaidTicks(
      `https://discord.com/channels/${this.message.guildId}/${this.message.channel.id}`
    );

    // provide receipt
    await this.message.reply({
      content: `Raids uploaded by ${reactor}`,
      embeds: report.getReceiptEmbeds(created, failed),
    });

    // update report
    await report.editMessages(messages);

    // update thread title
    await report.updateThreadName(this.message.channel);
  }
}
