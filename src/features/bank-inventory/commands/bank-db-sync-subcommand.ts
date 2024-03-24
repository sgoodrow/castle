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
      replyTxt = replyTxt + "\n" + "Removing unmatched character inventories:";
      await interaction.editReply(replyTxt);
      for (let char of unmatchedChars) {
        replyTxt = replyTxt + "\n" + "Removed: " + char.name;
        await interaction.editReply(replyTxt);
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
          replyTxt = replyTxt + "\n" + file.name;
          await interaction.editReply(replyTxt);
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
        replyTxt = replyTxt + "\n" + "Sync error: " + err;
        await interaction.editReply(replyTxt);
      }
    }
    replyTxt = replyTxt + "\nOutput files updated.";
    await interaction.editReply(replyTxt);
    return bankersUpdated;
  }
}

export const syncBankDb = new SyncBankDb(
  "sync-db",
  "Sync Google Drive outputfiles to the bank inventory database"
);
