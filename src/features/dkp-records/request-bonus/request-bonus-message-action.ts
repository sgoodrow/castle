import { Message } from "discord.js";
import {
  MessageAction,
  messageActionExecutor,
} from "../../../shared/action/message-action";
import { getAction, getBonusMessageContent } from "./util";

export const tryRaidBonusMessageAction = (message: Message) =>
  messageActionExecutor(new RaidBonusMessageAction(message));

class RaidBonusMessageAction extends MessageAction {
  public async execute() {
    const content = await getBonusMessageContent(this.message);
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
          `Command to request raid bonus is invalid. \`${err}\``
        );
      }
    }
  }
}
