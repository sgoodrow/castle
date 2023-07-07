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
    (err) => {
      if (err) {
        console.error("Error uploading file:", err);
        return null;
      }
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
    (err) => {
      if (err) {
        console.error("Error replacing file:", err);
        return;
      }
    }
  );
};

export const checkGoogleCredentials = () => {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error(
      "Cannot authenticate to the Castle Google Account without account credentials."
    );
  }
};

const authorize = async () => {
  try {
    checkGoogleCredentials();
    const auth = new JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: (GOOGLE_PRIVATE_KEY || "").split(String.raw`\n`).join('\n'),
      scopes: "https://www.googleapis.com/auth/drive",
    });
    await auth.authorize();
    return auth;
  } catch (err) {
    console.error("Authentication failed.");
    throw err;
  }
};
