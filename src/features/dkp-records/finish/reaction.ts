import {
  MessageEmbed,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  dkpDeputyRoleId,
  dkpRecordsBetaChannelId,
  officerRoleId,
} from "../../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../../shared/action/reaction-action";
import { code } from "../../../shared/util";
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
    const { report } = await getRaidReport(this.message.channel);

    // add raid to castle
    try {
      const raidIds = await report.uploadRaidTicks(
        `https://discord.com/channels/${this.message.guildId}/${this.message.channel.id}`
      );

      // provide receipt
      await this.message.reply({
        embeds: raidIds.map(({ event, eventType, id }, i) => {
          const name = report.getTickName(i + 1);
          const earned = report.getEarned(i + 1);
          const spent = report.getSpent(i + 1);
          const net = earned - spent;
          const result =
            net === 0
              ? "No change to economy"
              : net > 0
              ? `+ Economy increase     ${net}`
              : `- Economy decrease     ${net}`;
          return new MessageEmbed({
            title: `${name} (${event})`,
            description: `Raid uploaded by ${reactor} ${code}diff
DKP Earned             ${earned}
DKP Spent              ${spent}
-------------------------------
${result}${code}`,
            url: `https://castledkp.com/index.php/Raids/[green]-${eventType}-r${id}.html?s=`,
          });
        }),
      });

      // edit thread title
      this.message.channel.setName(`✅ ${this.message.channel.name}`);
    } catch (err) {
      throw new Error(
        `Failed to upload raid ticks: ${err}. Check for partial uploads!!`
      );
    }
  }
}
