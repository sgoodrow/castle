import { google } from "googleapis";
import { JWT } from "google-auth-library";
import { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from "../config";

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
    fields: "nextPageToken, files(id, name, parents)",
  });
  const files = res.data.files;
  if (!files || files.length === 0) {
    throw new Error(`No files found for ${query}`);
  }
  return files;
};

export const uploadFileToFolder = async (
  file: DriveFile,
  folder: string
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

export const getFile = async (fileId: string) => {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });
  try {
    const file = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return file.data;
  } catch (err) {
    // TODO(developer) - Handle error
    throw err;
  }
}

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
      key: (GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      scopes: "https://www.googleapis.com/auth/drive",
    });
    await auth.authorize();
    return auth;
  } catch (err) {
    console.error("Authentication failed.");
    throw err;
  }
};
