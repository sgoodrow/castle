import { google } from "googleapis";
import { authorize } from "./jwt-authentication";

export enum BankFolderIds {
  castleBank = "1ZuFMIZ1yt2dWz3siiVMOhTVlukzL1lUx",
  outputfiles = "1DBaLEyUFsxCcYwJzFYblILgPu5sK8uT5",
  test = "1hYIR3o94diHF1dtNs_-x7BSp33bq4lDp",
  skyItems = "13i1mGyaYxcMxpzDIBCW7bV34qOXAw1Jy",
  researchSpells = "19TzMg31_Jl4-FgRex000jH9G_ZIpaAUL",
  miscItems = "1KkjSy7n3_9rQcXBB8MckdqHKBXxKA2zr",
  jewelry = "1cj9AKwhpPgZBoGiS6mjzVS74mAFQDt8w",
  droppedSpells = "1yHENBqiiJHFfsydmXznLz2_jUU0PN4kX",
  auctions = "1IzJY-N_kkjpVKreoaZ4I2q1rx4YMM5Jg"
}

export interface driveFile {
  filename: string,
  mimetype: string,
  contents: any
}

export async function getFolderFiles(id: BankFolderIds) {
  return findFiles(`'${id}' in parents and trashed = false`)
}

export async function findFileByName(filename: string) {
  return findFiles(`name='${filename}' and trashed=false`)
}

export async function findFiles(query: any) {
  console.log(query);
  let auth = await authorize();
  const drive = google.drive({version: 'v3', auth});
  const res = await drive.files.list({
    q: query,
    pageSize: 20,
    fields: 'nextPageToken, files(id, name)',
  });
  const files = res.data.files;
  if (!files || files.length === 0) {
    throw new Error(`No files found for ${query}`);
  }
  console.log('Files:');
  files.map((file: any) => {
    console.log(`${file.name} (${file.id})`);
  });
  return files;
}

// export async updateFile()

export async function uploadFileToFolder(file: driveFile, folder: BankFolderIds) {
  let auth = await authorize();
  const drive = google.drive({version: 'v3', auth});
  const fileMetadata = {
    name: file.filename,
    parents: [folder],
  };
  const media = {
    mimeType: file.mimetype,
    body: file.contents,
  };
  drive.files.create({
    requestBody: {
      name: file.filename,
      parents: [folder]
    },
    media: media,
    fields: 'id',
  }, (err: any, upload: any) => {
    if (err) {
      console.error('Error uploading file:', err);
      return null;
    }
    console.log(`File '${file.filename}' (${upload.data.id}) uploaded to folder with ID ${folder}.`);
  });
}

export async function updateFile(fileId: string, file: driveFile) {
  let auth = await authorize();
  const drive = google.drive({version: 'v3', auth});
  const media = {
    mimeType: file.mimetype,
    body: file.contents,
  };
  drive.files.update({
    fileId: fileId,
    requestBody: {
      name: file.filename
    },
    media: media,
    fields: 'id',
  }, (err, updated: any) => {
    if (err) {
      console.error('Error replacing file:', err);
      return;
    }
    console.log(`File '${file.filename}' (${updated.data.id}) replaced in Google Drive.`);
  });
} 