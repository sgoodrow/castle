import { Attachment, Message } from "discord.js";
// import { bankerRoleId } from "../../config"; TODO: verify role?
import {
  MessageAction,
  messageActionExecutor,
} from "../../shared/action/message-action";
import axios from "axios";
import { bankInventoryChannelId } from "../../config";
import { InventoryItem, updateBankItems, updateItemsSet } from "./bank-items";
import {
  uploadFileToFolder,
  DriveFile,
  BankFolderIds,
  findFiles,
  updateFile,
} from "../../services/gdrive";

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
    await this.parseInventoryFile(filename, data);
    await this.uploadToGDrive(filename, data);
    message.react("✅");
  }

  private async parseInventoryFile(fileName: string, data: string) {
    const charName = fileName.split("-")[0];
    const rows = data.split("\r\n");
    const itemNames: string[] = [];
    const inventoryItems: InventoryItem[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i].split("\t");
      if (row[1]) {
        itemNames.push(row[1]);
        inventoryItems.push({
          character: charName,
          location: row[0],
          name: row[1],
          id: row[2],
          count: parseInt(row[3]),
        });
      }
    }
    // don't do it for now.
    // await updateBankItems({
    //   banker: charName,
    //   items: inventoryItems,
    // });
    // await updateItemsSet(itemNames);
  }

  private async uploadToGDrive(filename: string, contents: string) {
    const file: DriveFile = {
      filename,
      contents,
      mimetype: "text/plain",
    };
    try {
      // note: limiting this to a folder doesn't seem to be working well, it will replace a file anywhere in the drive with the same name. careful.
      const outputfiles = await findFiles(
        `name='${filename}' and trashed=false`
      );
      // const outputfiles = await findFileInFolders(filename, "outputfiles");
      // if found, update it
      outputfiles.forEach(async (val) => {
        if (val.id) {
          updateFile(val.id, file);
        }
      });
    } catch (err) {
      // if not found, upload it to test (maybe rename to 'unsorted')
      await uploadFileToFolder(file, BankFolderIds.test);
    }
  }
}
