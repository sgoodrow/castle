import { Message, MessageAttachment } from "discord.js";
// import { bankerRoleId } from "../../config"; TODO: verify role?
import {
  MessageAction,
  messageActionExecutor,
} from "../../shared/action/message-action";
import axios from "axios";
import { bankInventoryChannelId } from "../../config";
import { inventoryItem, bankerInventory, addBankItem, updateBankerInventory } from "./bank-items";
import { 
  uploadFileToFolder, 
  driveFile, 
  BankFolderIds, 
  findFiles,
  updateFile,
} from "../../google/gdrive";

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
        .map((a) => this.tryParseInventoryOutput(a))
    );
  }

  private async tryParseInventoryOutput(a: MessageAttachment) {
    const { data } = await axios({
      url: a.url,
    });
    console.log(a.contentType);
    const filename = a.name || "unknown";
    await this.parseInventoryFile(filename, data);    
    await this.uploadToGDrive(filename, data);
  }

  private async parseInventoryFile(fileName: string, data: string) {
    const obj: { [k: string]: object } = {};
    const charName = fileName.split("-")[0];
    const rows = data.split("\r\n");
    const bankerInventory: bankerInventory = {
      character: charName,
      items: []
    }
    rows.forEach((rowStr, idx) => {
      if (idx > 0) {
        console.log(rowStr, idx);
        const row = rowStr.split("\t");
        if (row[1] && row[1] !== "Empty") {
          const itemData: inventoryItem = {
            character: charName,
            location: row[0],
            name: row[1],
            id: row[2],
            count: parseInt(row[3])
          }
          bankerInventory.items.push(itemData)
          addBankItem(itemData);          
        }
      }
    });
    updateBankerInventory(bankerInventory);
  }

  private async uploadToGDrive(filename: string, data: string){
    const file: driveFile = {
      filename: filename,
      mimetype: "text/plain",
      contents: data
    }
    try {
      // const outputfiles = await findFiles(`'${BankFolderIds.outputfiles}' in parents and name='${filename}' and trashed=false`);
      const outputfiles = await findFiles(`name='${filename}' and trashed=false`);
      console.log(filename, outputfiles);
      // if found, update it
      outputfiles.forEach(async (val: any) => {
         await updateFile(val.id, file);
      })
    } catch (err: any) {
      console.log(err.message);
      // if not found, upload it to test (maybe rename to 'unsorted')
      await uploadFileToFolder(file, BankFolderIds.test);
    }
  }
}
