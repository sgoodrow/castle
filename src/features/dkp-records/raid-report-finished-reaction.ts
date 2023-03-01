import {
  MessageEmbed,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  dkpDeputyRoleId,
  dkpRecordsChannelId,
  officerRoleId,
} from "../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../shared/action/reaction-action";
import { castledkp } from "../../services/castledkp";
import { getRaidReport, isRaidReportMessage } from "./raid-report";

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

    // check that the message is the raid report
    if (!isRaidReportMessage(await this.message.fetch())) {
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
    if (!this.message.content) {
      throw new Error(
        "Tried to finish a raid report, but the message has no content."
      );
    }
    if (!this.message.author) {
      throw new Error(
        "Tried to finish a raid report, but the message has no author."
      );
    }

    // get raid report
    const { raid } = await getRaidReport(this.message.channel);

    // add raid to castle
    const raidId = await castledkp.createRaidTicks(
      raid,
      `https://discord.com/channels/${this.message.guildId}/${this.message.channel.id}`
    );

    // provide receipt
    await this.message.reply({
      embeds: [
        new MessageEmbed({
          title: `Raid Uploaded`,
          url: `https://castledkp.com/index.php/Raids/[green]-misc-r${raidId}.html?s=`,
        }),
      ],
    });

    // edit thread title
    this.message.channel.setName(`✅ ${this.message.channel.name}`);
  }
}
