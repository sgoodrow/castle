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

const supportedFormat = "text/csv";

export const tryParseInventoryAction = (message: Message) =>
  messageActionExecutor(new UploadInventoryMessageAction(message));

class UploadInventoryMessageAction extends MessageAction {
  public async execute() {
    // filter channel
    if (this.message.channel.id !== bankInventoryChannelId) {
      return;
    }

    // filter non-attachments
    if (this.message.attachments.size === 0) {
      return;
    }

    // parse attachments
    await Promise.all(
      [...this.message.attachments.values()]
        .filter((a) => a.contentType === supportedFormat)
        .map((a) => this.tryParseInventoryOutput(a))
    );
  }

  private async tryParseInventoryOutput(a: MessageAttachment) {
    const { data } = await axios({
      url: a.url,
      responseType: "arraybuffer",
    });
    const filename = a.name || "Inventory";

    const inventoryData = read(data);

    console.log(inventoryData);
  }
}
