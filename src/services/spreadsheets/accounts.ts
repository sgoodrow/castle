import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  bankerRoleId,
  guardRoleId,
  knightRoleId,
  officerRoleId,
  raiderRoleId,
  sharedCharactersGoogleSheetId,
} from "../../config";
import LRUCache from "lru-cache";
import { MINUTES } from "../../shared/time";
import { checkGoogleCredentials } from "../gdrive";

enum SPREADSHEET_COLUMNS {
  Characters = "Characters",
  Purpose = "Purpose",
  Account = "Account",
  Password = "Password",
  AllowOfficers = "Officers",
  AllowKnights = "Knights",
  AllowGuards = "Guards",
  AllowBankers = "Bankers",
  AllowRaiders = "Raiders",
}

const sheet = new GoogleSpreadsheet(sharedCharactersGoogleSheetId);

const CHECKED = "TRUE";

const getRequiredRoles = (row: GoogleSpreadsheetRow) => {
  const roles: Role[] = [];
  if (row[SPREADSHEET_COLUMNS.AllowOfficers] === CHECKED) {
    roles.push({ name: "Officer", id: officerRoleId });
  }
  if (row[SPREADSHEET_COLUMNS.AllowKnights] === CHECKED) {
    roles.push({ name: "Knight", id: knightRoleId });
  }
  if (row[SPREADSHEET_COLUMNS.AllowGuards] === CHECKED) {
    roles.push({ name: "Guard", id: guardRoleId });
  }
  if (row[SPREADSHEET_COLUMNS.AllowBankers] === CHECKED) {
    roles.push({ name: "Banker", id: bankerRoleId });
  }
  if (row[SPREADSHEET_COLUMNS.AllowRaiders] === CHECKED) {
    roles.push({ name: "Raider", id: raiderRoleId });
  }
  return roles;
};

interface Role {
  name: string;
  id: string;
}

export interface Account {
  characters: string;
  accountName: string;
  password: string;
  requiredRoles: Role[];
  purpose?: string;
}

const credentialsCache = new LRUCache<string, Account>({
  max: 200,
  ttl: 5 * MINUTES,
});

export const getAccounts = async () => {
  credentialsCache.purgeStale();
  if (credentialsCache.size) {
    return credentialsCache;
  }
  checkGoogleCredentials();
  await sheet.useServiceAccountAuth({
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: (GOOGLE_PRIVATE_KEY || "").split(String.raw`\n`).join("\n"),
  });
  await sheet.loadInfo();
  const rows = await sheet.sheetsByIndex[0].getRows();
  rows.forEach((r) => {
    const a: Account = {
      characters: r[SPREADSHEET_COLUMNS.Characters],
      purpose: r[SPREADSHEET_COLUMNS.Purpose],
      accountName: r[SPREADSHEET_COLUMNS.Account],
      password: r[SPREADSHEET_COLUMNS.Password],
      requiredRoles: getRequiredRoles(r),
    };
    if (a.characters && a.accountName && a.password) {
      credentialsCache.set(a.characters.toLowerCase(), a);
    }
  });
  return credentialsCache;
};
