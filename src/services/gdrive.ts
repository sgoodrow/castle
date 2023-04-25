import { google } from "googleapis";
import { JWT } from "google-auth-library";
import { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from "../config";

export enum BankFolderIds {
  castleBank = "1ZuFMIZ1yt2dWz3siiVMOhTVlukzL1lUx",
  outputfiles = "1DBaLEyUFsxCcYwJzFYblILgPu5sK8uT5",
  test = "1hYIR3o94diHF1dtNs_-x7BSp33bq4lDp",
  skyItems = "13i1mGyaYxcMxpzDIBCW7bV34qOXAw1Jy",
  researchSpells = "19TzMg31_Jl4-FgRex000jH9G_ZIpaAUL",
  miscItems = "1KkjSy7n3_9rQcXBB8MckdqHKBXxKA2zr",
  jewelry = "1cj9AKwhpPgZBoGiS6mjzVS74mAFQDt8w",
  droppedSpells = "1yHENBqiiJHFfsydmXznLz2_jUU0PN4kX",
  auctions = "1IzJY-N_kkjpVKreoaZ4I2q1rx4YMM5Jg",
}

export interface DriveFile {
  filename: string;
  mimetype: string;
  contents: string;
}

export const getFolderFiles = async (id: BankFolderIds) =>
  findFiles(`'${id}' in parents and trashed = false`);

export const findFileByName = async (filename: string) =>
  findFiles(`name='${filename}' and trashed=false`);

export const findFileInFolders = async (
  filename: string,
  foldername: string
) => {
  const folders = await findFiles(
    `name='${foldername}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const folderIds = folders.map((folder) => folder.id);

  // Build the query to search for the file in the specified folder(s) and their subfolders
  let query = `name='${filename}' and trashed=false and (`;
  folderIds.forEach((folderId, index) => {
    query += `'${folderId}' in parents`;
    if (index !== folderIds.length - 1) {
      query += " or ";
    }
  });
  query += ")";

  return findFiles(query);
};

export const findFiles = async (query: string) => {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.list({
    q: query,
    pageSize: 20,
    fields: "nextPageToken, files(id, name)",
  });
  const files = res.data.files;
  if (!files || files.length === 0) {
    throw new Error(`No files found for ${query}`);
  }
  return files;
};

export const uploadFileToFolder = async (
  file: DriveFile,
  folder: BankFolderIds
) => {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });
  drive.files.create(
    {
      requestBody: {
        name: file.filename,
        parents: [folder],
      },
      media: {
        mimeType: file.mimetype,
        body: file.contents,
      },
      fields: "id",
    },
    (err, upload) => {
      if (err) {
        console.error("Error uploading file:", err);
        return null;
      }
      console.log(
        `File '${file.filename}' (${upload?.data.id}) uploaded to folder with ID ${folder}.`
      );
    }
  );
};

export const updateFile = async (fileId: string, file: DriveFile) => {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });
  const media = {
    mimeType: file.mimetype,
    body: file.contents,
  };
  drive.files.update(
    {
      fileId: fileId,
      requestBody: {
        name: file.filename,
      },
      media: media,
      fields: "id",
    },
    (err, updated) => {
      if (err) {
        console.error("Error replacing file:", err);
        return;
      }
      if (updated) {
        console.log(
          `File '${file.filename}' (${updated.data.id}) replaced in Google Drive.`
        );
      }
    }
  );
};

const auth = new JWT({
  email: GOOGLE_CLIENT_EMAIL,
  key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: "https://www.googleapis.com/auth/drive",
});

const authorize = async () => {
  try {
    await auth.authorize();
  } catch (err) {
    console.error("Authentication failed.");
    throw err;
  }
  return auth;
};
