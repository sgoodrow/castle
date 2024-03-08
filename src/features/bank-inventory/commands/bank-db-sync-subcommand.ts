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


    for (let f of bankInventoryFolders) {
      try {
        const files = await findFiles(
          `'${f.id}' in parents and trashed = false`
        )
        for (let file of files) {
          await interaction.editReply("Updating bank DB from outputiles: " + file.name)
          if (file && file.id && file.name) {
            const data = await getFile(file.id)
            console.log("bank-db-sync:", file.name, file.id);
            const inventory = await parseInventoryFile(file.name, String(data));
            await bankData.setInventory(inventory);
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
  }
}

export const syncBankDb = new SyncBankDb(
  "sync-db",
  "Sync Google Drive outputfiles to the bank inventory database"
);
