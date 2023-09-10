import axios from "axios";
import { Attachment, Message } from "discord.js";
import { Inventory, bankData } from "../bank-data";

// import { bankerRoleId } from "../../config"; TODO: verify role?
import {
  MessageAction,
  messageActionExecutor,
} from "../../../shared/action/message-action";
import { bankInventoryChannelId } from "../../../config";
import { parseInventoryFile, uploadToGDrive } from "../inventory-files";

const supportedFormat = "text/plain; charset=utf-8";


export const tryParseInventoryAction = (message: Message) =>
  messageActionExecutor(new UploadInventoryMessageAction(message));

class UploadInventoryMessageAction extends MessageAction {
  public async execute() {
    // bankinventory channel only
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
        .map((a) => this.tryParseInventoryOutput(a, this.message))
    );
  }

  private async tryParseInventoryOutput(a: Attachment, message: Message) {
    const { data } = await axios({
      url: a.url,
    });
    const filename = a.name || "unknown";
    await uploadToGDrive(filename, data);
    const inventory: Inventory = await parseInventoryFile(filename, data);
    await bankData.setInventory(inventory);
    message.react("✅");
  }

}