import { Message } from "discord.js";
import {
  MessageAction,
  messageActionExecutor,
} from "../../../shared/action/message-action";
import {
  getAction,
  getRaidEditMessageContent as getRaidEditMessageContent,
} from "./util";

export const tryRaidReportRevisionMessageAction = (message: Message) =>
  messageActionExecutor(new RaidReportRevisionMessageAction(message));

class RaidReportRevisionMessageAction extends MessageAction {
  public async execute() {
    const content = await getRaidEditMessageContent(this.message);
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
      // warning emoji and ephemeral response
      await this.message.react("⚠️");
      this.message.author.send(
        `Command to request raid edit is invalid. \`${err}\``
      );
      return;
    }
  }
}
