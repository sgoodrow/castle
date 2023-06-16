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
} from "../config";
import LRUCache from "lru-cache";
import { MINUTES } from "../shared/time";
import {
  ApplicationCommandOptionChoiceData,
  GuildMemberRoleManager,
} from "discord.js";
import { some, truncate } from "lodash";
import { checkGoogleCredentials } from "./gdrive";

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

interface Account {
  characters: string;
  accountName: string;
  password: string;
  requiredRoles: Role[];
  purpose?: string;
}

const cache = new LRUCache<string, Account>({
  max: 200,
  ttl: 5 * MINUTES,
});

const authorize = async (sheet: GoogleSpreadsheet) => {
  checkGoogleCredentials();
  return sheet.useServiceAccountAuth({
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: (GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  });
};

const getAccounts = async () => {
  cache.purgeStale();
  if (cache.size) {
    return cache;
  }
  await authorize(sheet);
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
      cache.set(a.characters.toLowerCase(), a);
    }
  });
  return cache;
};

export const accounts = {
  getAccountsForRole: async (roleId: string): Promise<Account[]> => {
    const accounts = await getAccounts();
    return [...accounts.values()].filter((c) =>
      c.requiredRoles.map((r) => r.id).includes(roleId)
    );
  },

  getOptions: async (): Promise<
    ApplicationCommandOptionChoiceData<string>[]
  > => {
    const accounts = await getAccounts();
    return [...accounts.values()].map((c) => ({
      name: truncate(
        `${c.characters} - ${c.purpose} (${c.requiredRoles
          .map((r) => r.name)
          .join(", ")})`,
        {
          length: 100,
        }
      ),
      value: c.characters,
    }));
  },

  getAccount: async (
    name: string,
    roles: GuildMemberRoleManager
  ): Promise<Account> => {
    const accounts = await getAccounts();
    const d = accounts.get(name.toLowerCase());
    if (!d) {
      throw new Error(`${name} is not a shared account`);
    }
    const hasRole = some(
      d.requiredRoles.map((r) => r.id).map((id) => roles.cache.has(id))
    );
    if (!hasRole) {
      throw new Error(`You do not have the required role to access ${name}`);
    }
    return d;
  },
};
