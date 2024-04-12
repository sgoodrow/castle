import { 
  CacheType, 
  CommandInteraction,
  GuildMemberRoleManager
 } from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
<<<<<<< HEAD
import { bankRequestsChannelId, bankerRoleId, officerRoleId } from "../../../config";
=======
import { bankRequestsChannelId, bankerRoleId, officerRoleId, modRoleId } from "../../../config";
>>>>>>> bankbot-dev
import { findFiles, getFile } from "../../../services/gdrive";
import { 
  parseInventoryFile,
  bankInventoriesFolderId
} from "../inventory-files";
import { bankData } from "../bank-data";
<<<<<<< HEAD


class SyncBankDb extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize user
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(bankerRoleId)) || !(roles.cache.has(officerRoleId))) {
      throw new Error("Must be a Banker or Offier to use this command");
    }

    await interaction.editReply("Updating bank DB ...")
=======
import { authorizeByMemberRoles } from "../../../shared/command/util";
import { drive_v3, file_v1 } from "googleapis";

let replyTxt = ""    

class SyncBankDb extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {

    // authorize
    authorizeByMemberRoles([
      bankerRoleId, officerRoleId, modRoleId
    ], interaction);

    this.appendReplyTxt("Updating bank database from GDrive...", interaction);
>>>>>>> bankbot-dev

    const bankInventoryFolders = await findFiles(
      `'${bankInventoriesFolderId}' in parents and trashed = false`
    );

<<<<<<< HEAD

=======
    const bankersUpdated = await this.updateBankInventoryFolders(bankInventoryFolders, interaction)
    
    const unmatchedChars = await bankData.getUnmatchedChars(bankersUpdated);

    console.log('remove unmatched:', unmatchedChars)

    if(unmatchedChars && unmatchedChars.length > 0) {
      await this.appendReplyTxt("Removing unmatched character inventories:", interaction);
      for (let char of unmatchedChars) {
        await this.appendReplyTxt("Removed: " + char.name, interaction);
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
>>>>>>> bankbot-dev
    for (let f of bankInventoryFolders) {
      try {
        const files = await findFiles(
          `'${f.id}' in parents and trashed = false`
        )
<<<<<<< HEAD
        for (let file of files) {
          await interaction.editReply("Updating bank DB from outputiles: " + file.name)
=======
        if (files.length === 0) continue;
        for (let file of files) {
>>>>>>> bankbot-dev
          if (file && file.id && file.name) {
            const data = await getFile(file.id)
            console.log("bank-db-sync:", file.name, file.id);
            const inventory = await parseInventoryFile(file.name, String(data));
            await bankData.setInventory(inventory);
<<<<<<< HEAD
          }
        }
        await interaction.editReply("Bank DB synced from GDrive.");
      } catch (err) {
        console.log(err);
        await interaction.editReply("Sync error: " + err);
      }
    }
  }

  public async getOptionAutocomplete() {
    return [];
=======
            bankersUpdated.push(inventory.charName);
            await this.appendReplyTxt(file.name + " -> " + inventory.charName, interaction);
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
      return message.slice(message.length - length);
    } else {
        return message;
    }
>>>>>>> bankbot-dev
  }
}

export const syncBankDb = new SyncBankDb(
  "sync-db",
  "Sync Google Drive outputfiles to the bank inventory database"
);
