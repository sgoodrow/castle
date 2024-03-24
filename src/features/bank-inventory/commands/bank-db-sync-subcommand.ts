import { 
  CacheType, 
  CommandInteraction,
  GuildMemberRoleManager
 } from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { bankRequestsChannelId, bankerRoleId, officerRoleId, modRoleId } from "../../../config";
import { findFiles, getFile } from "../../../services/gdrive";
import { 
  parseInventoryFile,
  bankInventoriesFolderId
} from "../inventory-files";
import { bankData } from "../bank-data";
import { authorizeByMemberRoles } from "../../../shared/command/util";
import { drive_v3, file_v1 } from "googleapis";
import { Command } from "../../../shared/command/command";

let replyTxt = "Updating bank DB from outputiles:"    

class SyncBankDb extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {

    // authorize
    authorizeByMemberRoles([
      bankerRoleId, officerRoleId, modRoleId
    ], interaction);

    await interaction.editReply("Updating bank DB ...")

    const bankInventoryFolders = await findFiles(
      `'${bankInventoriesFolderId}' in parents and trashed = false`
    );

    const bankersUpdated = await this.updateBankInventoryFolders(bankInventoryFolders, interaction)
    
    const unmatchedChars = await bankData.getUnmatchedChars(bankersUpdated);
    console.log(unmatchedChars)
    if(!unmatchedChars) {
      return;
    } else {
      await this.appendReplyTxt("Removing unmatched character inventories:", interaction);
      for (let char of unmatchedChars) {
        await this.appendReplyTxt("Removed: " + char.name, interaction);
        bankData.removeInventory(char.name);
      }
    }

  }

  public async getOptionAutocomplete() {
    return [];
  }

  private async updateBankInventoryFolders(bankInventoryFolders: drive_v3.Schema$File[], interaction: CommandInteraction<CacheType>) {
    const bankersUpdated = [];
    for (let f of bankInventoryFolders) {
      try {
        const files = await findFiles(
          `'${f.id}' in parents and trashed = false`
        )
        for (let file of files) {
          
          await this.appendReplyTxt("Updated: " + file.name, interaction);

          if (file && file.id && file.name) {
            const data = await getFile(file.id)
            console.log("bank-db-sync:", file.name, file.id);
            const inventory = await parseInventoryFile(file.name, String(data));
            await bankData.setInventory(inventory);
            bankersUpdated.push(inventory.charName)
          }
        }
      } catch (err) {
        console.log(err);

        await this.appendReplyTxt("Sync error: " + err, interaction);
      }
    }
    await this.appendReplyTxt("Output files updated.", interaction);
    return bankersUpdated;
  }

  private async appendReplyTxt(text: string, interaction: CommandInteraction) {
    replyTxt = this.trimMessage(replyTxt + "\n" + text, 1900);
    await interaction.editReply(replyTxt);
  }
  private trimMessage(message: string, length: number) {
    if (message.length > length) {
      return message.slice(length);
    } else {
        return message;
    }
  }
}

export const syncBankDb = new SyncBankDb(
  "sync-db",
  "Sync Google Drive outputfiles to the bank inventory database"
);
