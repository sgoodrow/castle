import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  dkpDeputyRoleId,
  dkpRecordsChannelId,
  officerRoleId,
} from "../../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../../shared/action/reaction-action";
import {
  getRaidReport,
  isRaidInstructionsMessage,
  loadRaidReport,
  withRaidReportLock,
} from "../raid-report";
import { threadUrl, UPLOAD_RECEIPT } from "../uploaded-raid";
import { getMember } from "../../..";

export const tryRaidReportFinishedReactionAction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) =>
  reactionActionExecutor(new RaidReportFinishedReactionAction(reaction, user));

class RaidReportFinishedReactionAction extends ReactionAction {
  public async execute() {
    // if message doesn't exist anymore, ignore
    if (!this.message || !this.message.channel) {
      return;
    }

    // filter non-threads
    if (!this.message.channel.isThread()) {
      return;
    }

    // filter channel
    if (this.message.channel.parentId !== dkpRecordsChannelId) {
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

    // check that the message is the raid report, fetching it only if it isn't cached
    const fullMessage = this.message.partial
      ? await this.message.fetch()
      : this.message;
    if (!isRaidInstructionsMessage(fullMessage)) {
      return;
    }

    // authorize user
    const reactor = await getMember(this.user.id);
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
      threadUrl(this.message.guildId ?? "", this.message.channelId)
    );

    // remember the raid, so edits approved after this update it too
    const raidId = report.uploadedRaidId;
    if (raidId !== undefined) {
      await withRaidReportLock(this.message.channelId, async () => {
        const saved = await loadRaidReport(this.message.channelId);
        saved.markUploaded(raidId);
        await saved.save(this.message.channelId);
      });
    }

    // provide receipt
    await this.message.reply({
      content: `${UPLOAD_RECEIPT} ${reactor}`,
      embeds: report.getReceiptEmbeds(created, failed),
    });

    // update report
    await report.updateMessages(messages);

    // update thread title
    await report.tryUpdateThreadName(this.message.channel);

    // archive the thread; its report stays in Redis, since edits approved later update the raid
    if (report.finished) {
      await this.message.channel.setAutoArchiveDuration(4320);
      await this.message.channel.setArchived(true);
    }
  }
}
