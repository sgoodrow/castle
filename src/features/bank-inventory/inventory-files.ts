import { InventoryItem } from "./bank-data";
import { uploadFileToFolder, DriveFile, findFiles, updateFile } from "../../services/gdrive";

export const outputfilesFolderId = "1DBaLEyUFsxCcYwJzFYblILgPu5sK8uT5";
export const defaultUploadsFolderId = "1hYIR3o94diHF1dtNs_-x7BSp33bq4lDp";
export const bankInventoriesFolderId = "1-BtBXHmBwG-w9GU2sjaNnDm53rk8qdpZ";

export const parseInventoryFile = async (fileName: string, data: string) => {
  // parse inventory file and update db
  const charName = fileName.split("-")[0].toLowerCase(); // normalize char names lowercase
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
        id: parseInt(row[2]),
        count: parseInt(row[3]),
      });
    }
  }
  // TODO: determine character type based on file parent in gdrive?
  return {
    charName: charName,
    charType: "banker",
    items: inventoryItems,
  };
};

export const uploadToGDrive = async (filename: string, contents: string) => {
  const file: DriveFile = {
    filename,
    contents,
    mimetype: "text/plain",
  };
  try {
    // note: limiting this to a folder doesn't seem to be working well, it will replace a file anywhere in the drive with the same name. careful.
    const outputfiles = await findFiles(`name='${filename}' and trashed=false`);
    // const outputfiles = await findFileInFolders(filename, "outputfiles");
    // if found, update it
    outputfiles.forEach(async (val) => {
      // console.log("update inventory outputfile:",val)
      if (val.id) {
        // TODO: check if it's in the castle_bank directory
        updateFile(val.id, file);
      }
    });
    return outputfiles;
  } catch (err) {
    // if not found, upload it to to be sorted folder
    await uploadFileToFolder(file, defaultUploadsFolderId);
  }
};
