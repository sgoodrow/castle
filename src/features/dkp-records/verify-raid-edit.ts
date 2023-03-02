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
} from "../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../shared/action/reaction-action";
import { getRaidReport, RaidReport } from "./raid-report";

const multipleSpaces = /\s+/;

export const tryVerifyRaidEditReactionAction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => reactionActionExecutor(new VerifyRaidEditReactionAction(reaction, user));

class VerifyRaidEditReactionAction extends ReactionAction {
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
    if (!this.message.content || !this.message.content.startsWith("!")) {
      return;
    }

    // get raid report
    const { report: raidReport, message } = await getRaidReport(
      this.message.channel
    );

    // get action
    const [actionType, ...actionArguments] = this.message.content
      .slice(1)
      .split(multipleSpaces);
    const action = this.getAction(actionType);

    // execute action on raid report
    action.execute(raidReport, actionArguments);

    try {
      await message.edit({
        embeds: raidReport.embeds,
        files: raidReport.files,
      });
    } catch (err) {
      throw new Error(
        `Could not generate edited raid report with action values: ${err}`
      );
    }

    // show success
    await this.message.react("✅");
  }

  private getAction(actionType: string) {
    switch (actionType) {
      case "add":
        return new AddAction();
      case "rem":
        return new RemoveAction();
      case "rep":
        return new ReplaceAction();
      default:
        throw new Error(
          `Could not verify raid edit because the action "${actionType}" is not supported.`
        );
    }
  }
}

interface Action {
  execute(raid: RaidReport, args: string[]): void;
}

class AddAction implements Action {
  public execute(raid: RaidReport, args: string[]) {
    const [player, ...ticks] = args;
    const tickNumbers = ticks.map((t) => Number(t.replace(",", "")));
    raid.addPlayer(player, tickNumbers);
  }
}

class RemoveAction implements Action {
  public execute(raid: RaidReport, args: string[]) {
    const [player, ...ticks] = args;
    const tickNumbers = ticks.map((t) => Number(t.replace(",", "")));
    raid.removePlayer(player, tickNumbers);
  }
}

class ReplaceAction implements Action {
  public execute(raid: RaidReport, args: string[]) {
    const [replacer, on, replaced, ...ticks] = args;
    if (on !== "on") {
      throw new Error("Invalid replacement syntax. Use the on keyword");
    }
    const tickNumbers = ticks.map((t) => Number(t.replace(",", "")));
    raid.replacePlayer(replacer, replaced, tickNumbers);
  }
}
