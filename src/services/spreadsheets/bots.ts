import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  publicCharactersGoogleSheetId,
} from "../../config";
import LRUCache from "lru-cache";
import { MINUTES } from "../../shared/time";
import { checkGoogleCredentials } from "../gdrive";
import { Class } from "../../shared/classes";

const sheet = new GoogleSpreadsheet(publicCharactersGoogleSheetId);

const SHEET_TITLE = "Bot Info";

enum COLUMN_NAMES {
  Class = "Class",
  Name = "Name",
  CurrentLocation = "Current Location",
  Level = "Level",
  CurrentPilot = "Current Bot Pilot",
  CheckoutTime = "Date and Time (EST) of pilot login",
}

interface Bot {
  class: Class;
  name: string;
  location: string;
  level: number;
  currentPilot: string;
  checkoutTime: string;
  requiredRoles?: string;
}

const cache = new LRUCache<string, Bot>({
  max: 200,
  ttl: 5 * MINUTES,
});

export const getBots = async () => {
  cache.purgeStale();
  if (cache.size) {
    return cache;
  }
  const rows = await loadRows();
  rows.forEach((r) => {
    const bot: Bot = {
      class: r[COLUMN_NAMES.Class].toLowerCase(),
      name: r[COLUMN_NAMES.Name],
      level: r[COLUMN_NAMES.Level],
      location: r[COLUMN_NAMES.CurrentLocation].toLowerCase(),
      currentPilot: r[COLUMN_NAMES.CurrentPilot],
      checkoutTime: r[COLUMN_NAMES.CheckoutTime],
    };
    if (bot.class && bot.name && bot.location) {
      cache.set(bot.name.toLowerCase(), bot);
    }
  });
  return cache;
};

export const updateBotLocation = async (botName: string, location: string) => {
  return updateCell(botName, COLUMN_NAMES.CurrentLocation, location);
};

export const updateBotPilot = async (botName: string, pilot: string) => {
  return updateCell(botName, COLUMN_NAMES.CurrentPilot, pilot);
};

export const updateBotCheckoutTime = async (botName: string, time: string) => {
  return updateCell(botName, COLUMN_NAMES.CheckoutTime, time);
};

const loadRows = async () => {
  checkGoogleCredentials();
  await sheet.useServiceAccountAuth({
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: (GOOGLE_PRIVATE_KEY || "").split(String.raw`\n`).join("\n"),
  });
  await sheet.loadInfo();
  return await sheet.sheetsByTitle[SHEET_TITLE].getRows();
};

// TODO: Might eventually want to put some of this machinery into a base class for all these cached sheet readers.
const updateCell = async (
  botName: string,
  cell: COLUMN_NAMES,
  value: string
) => {
  const rows = await loadRows();
  const row = rows.find((r) => r[COLUMN_NAMES.Name] === botName);
  if (!row) {
    throw Error(`Bot ${botName} not found.`);
  }
  row[cell] = value;
  await row.save();
  cache.clear();
  await getBots();
};
