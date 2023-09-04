import { 
  CacheType, 
  CommandInteraction,
  GuildMemberRoleManager
 } from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { bankRequestsChannelId, bankerRoleId, officerRoleId } from "../../../config";
import { findFiles, getFile } from "../../../services/gdrive";
import { 
  parseInventoryFile,
  bankInventoriesFolderId
} from "../inventory-files";
import { setInventory } from "../bank-db";


class SyncBankDb extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // // filter channel
    // if (interaction.channel.parentId !== dkpRecordsChannelId) {
    //   throw new Error("Must use this command in a bank channel");
    // }
    // authorize user
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(bankerRoleId)) || !(roles.cache.has(officerRoleId))) {
      throw new Error("Must be a Banker or Offier to use this command");
    }

    await interaction.editReply("Updating bank DB ...")

    const bankInventoryFolders = await findFiles(
      `'${bankInventoriesFolderId}' in parents and trashed = false`
    );


    for (let f of bankInventoryFolders) {
      // console.log(f);
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
            await setInventory(inventory);
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
    await interaction.editReply("Bank DB synced from GDrive.");
  }

  public async getOptionAutocomplete() {
    return [];
  }
}

export const syncBankDb = new SyncBankDb(
  "sync-db",
  "Sync Google Drive outputfiles to the bank inventory database"
);
