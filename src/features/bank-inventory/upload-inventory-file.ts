import { Message, MessageAttachment } from "discord.js";
// import { bankerRoleId } from "../../config"; TODO: verify role?
import {
  MessageAction,
  messageActionExecutor,
} from "../../shared/action/message-action";
import { read, utils } from "xlsx";
import axios from "axios";
import { addRoleToThread } from "../../shared/command/util";
import { bankInventoryChannelId } from "../../config";

const supportedFormat = "text/plain";

export const tryParseInventoryAction = (message: Message) =>
  messageActionExecutor(new UploadInventoryMessageAction(message));

class UploadInventoryMessageAction extends MessageAction {
  public async execute() {
    // if (this.message.channel.id !== bankInventoryChannelId) {
    //   //TODO: not reading my config var for some reason
    //   return;
    // }

    // filter non-attachments
    if (this.message.attachments.size === 0) {
      return;
    }

    // parse attachments
    await Promise.all(
      [...this.message.attachments.values()]
        // .filter((a) => a.contentType === supportedFormat)
        .map((a) => this.tryParseInventoryOutput(a))
    );
  }

  private async tryParseInventoryOutput(a: MessageAttachment) {
    const { data } = await axios({
      url: a.url,
    });
    const filename = a.name || "Inventory";

    const inventoryData = this.parseTsv(data);

    console.log("inv data:", filename, inventoryData);
  }

  private parseTsv(str: string) {
    const arr = [];
    const x = str.split("\r\n");
    for (let i = 0; i < x.length; i++) {
      arr.push(x[i].split("\t"));
    }
    return arr;
  }
}
