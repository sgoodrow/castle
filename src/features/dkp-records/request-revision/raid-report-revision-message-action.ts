import { Message } from "discord.js";
import {
  MessageAction,
  messageActionExecutor,
} from "../../../shared/action/message-action";
import {
  getAction,
  getRaidRevisionMessageContent as getRaidRevisionMessageContent,
} from "./util";

export const tryRaidReportRevisionMessageAction = (message: Message) =>
  messageActionExecutor(new RaidReportRevisionMessageAction(message));

class RaidReportRevisionMessageAction extends MessageAction {
  public async execute() {
    const content = await getRaidRevisionMessageContent(this.message);
    if (!content) {
      return;
    }
    const actor = await this.members?.fetch(this.message.author.id);
    if (!actor) {
      return;
    }
    try {
      await getAction(content).tryExecute(this.message, actor);
    } catch (err) {
      // warning emoji and dm
      await this.message.react("⚠️");
      if (!this.message.author.bot) {
        this.message.author.send(
          `Command to request raid edit is invalid. \`${err}\``
        );
      }
    }
  }
}
