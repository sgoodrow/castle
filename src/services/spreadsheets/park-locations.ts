import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  publicCharactersGoogleSheetId,
} from "../../config";
import LRUCache from "lru-cache";
import { MINUTES } from "../../shared/time";
import { checkGoogleCredentials } from "../gdrive";

const sheet = new GoogleSpreadsheet(publicCharactersGoogleSheetId);

const SHEET_TITLE = "Bot Locations";

enum COLUMN_NAMES {
  Name = "Name",
  Description = "Description",
}

interface Location {
  name: string;
  description: string;
}

const cache = new LRUCache<string, Location>({
  max: 200,
  ttl: 5 * MINUTES,
});

export const getParkLocations = async () => {
  cache.purgeStale();
  if (cache.size) {
    return cache;
  }
  checkGoogleCredentials();
  await sheet.useServiceAccountAuth({
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: (GOOGLE_PRIVATE_KEY || "").split(String.raw`\n`).join("\n"),
  });
  await sheet.loadInfo();
  const rows = await sheet.sheetsByTitle[SHEET_TITLE].getRows();
  rows.forEach((r) => {
    const location: Location = {
      name: r[COLUMN_NAMES.Name],
      description: r[COLUMN_NAMES.Description],
    };
    if (location.description && location.name) {
      cache.set(location.name, location);
    }
  });
  return cache;
};
