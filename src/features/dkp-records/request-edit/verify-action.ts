import { Message } from "discord.js";
import {
  MessageAction,
  messageActionExecutor,
} from "../../../shared/action/message-action";
import {
  getAction,
  getRaidEditMessageContent as getRaidEditMessageContent,
} from "./util";

export const tryVerifyRaidEditMessageAction = (message: Message) =>
  messageActionExecutor(new VerifyRaidEditMessageAction(message));

class VerifyRaidEditMessageAction extends MessageAction {
  public async execute() {
    const content = await getRaidEditMessageContent(this.message);
    if (!content) {
      return;
    }
    try {
      getAction(content).validateArgs();
    } catch (err) {
      // warning emoji and ephemeral response
      await this.message.react("⚠️");
      this.message.author.send(
        `Command to request raid edit is invalid. \`${err}\``
      );
      return;
    }

    // show success
    await this.message.react("👍");
  }
}
