import { Message, MessageAttachment } from "discord.js";
// import { bankerRoleId } from "../../config"; TODO: verify role?
import {
  MessageAction,
  messageActionExecutor,
} from "../../shared/action/message-action";
import axios from "axios";
import { bankInventoryChannelId } from "../../config";
import { setBankItem } from "./bank-items";

const supportedFormat = "text/plain";

export const tryParseInventoryAction = (message: Message) =>
  messageActionExecutor(new UploadInventoryMessageAction(message));

class UploadInventoryMessageAction extends MessageAction {
  public async execute() {
    // bankinventory channel only
    // if (this.message.channel.id !== bankInventoryChannelId) {
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
    const filename = a.name || "unknown";
    const inventoryData = this.parseInventoryFile(filename, data);

    console.log("inv data:", filename, inventoryData);
  }

  private parseInventoryFile(fileName: string, data: string) {
    const obj: { [k: string]: object } = {};
    const charName = fileName.split("-")[0];
    const rows = data.split("\r\n");
    rows.forEach((row, idx) => {
      console.log(row, idx);
      if (idx > 0) {
        setBankItem(charName, row);
      }
    });

    // let keys: string[] = [];
    // for (let i = 0; i < rows.length; i++) {
    //   if (rows[i]) {
    //     const d = rows[i].split("\t");
    //     if (i === 0) {
    //       keys = d;
    //     } else {
    //       const itm: { [k: string]: string } = {
    //         character: charName,
    //       };
    //       keys.forEach((val: string, idx: number) => {
    //         itm[val.toLowerCase()] = d[idx];
    //       });
    //       obj[d[1]] = itm;
    //     }
    //   }
    // }
    // return obj;
  }
}
